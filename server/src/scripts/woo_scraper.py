#!/usr/bin/env python3
from __future__ import annotations
"""
woo_scraper.py — WooCommerce category & product scraper with Cloudflare bypass.

Usage:
    python woo_scraper.py <site_url> [options]

    python woo_scraper.py https://example.com
    python woo_scraper.py https://example.com --categories-out cats.json --products-out prods.json
    python woo_scraper.py https://example.com --headed          # show browser window
    python woo_scraper.py https://example.com --skip-products   # categories only

Strategies (tried in order for each resource):
    1. cloudscraper   HTTP client that spoofs a real browser + handles CF JS challenge
    2. Store API      /wp-json/wc/store/v1/products/categories  (paginated)
    3. WP REST API    /wp-json/wp/v2/product_cat                (no auth needed)
    4. Sitemap XML    /sitemap.xml → product_cat sub-sitemap
    5. Playwright     Full stealth browser — makes API calls from inside the page
                      context so Cloudflare cookies are already set.
    6. HTML           Parse cat-item-{ID} CSS classes from shop/home HTML.

Requirements:
    pip install cloudscraper playwright playwright-stealth
    playwright install chromium
"""

import argparse
import asyncio
import dataclasses
import json
import re
import sys
import urllib.parse
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from typing import Optional

# ── Optional deps ─────────────────────────────────────────────────────────────

try:
    import cloudscraper as _cs
    HAS_CLOUDSCRAPER = True
except ImportError:
    HAS_CLOUDSCRAPER = False

try:
    from playwright.async_api import async_playwright, Browser, BrowserContext, Page
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False

try:
    from playwright_stealth import stealth_async
    HAS_STEALTH = True
except ImportError:
    HAS_STEALTH = False

# ── Data models ───────────────────────────────────────────────────────────────

@dataclass
class Category:
    id: int
    name: str
    slug: str
    parent: int
    count: int
    permalink: str
    description: str = ""
    source: str = ""


@dataclass
class Product:
    id: int
    name: str
    sku: str
    price: str
    regular_price: str
    sale_price: str
    description: str
    short_description: str
    categories: list = field(default_factory=list)   # list[int]
    image_urls: list = field(default_factory=list)   # list[str]
    in_stock: bool = True
    on_sale: bool = False
    source: str = ""

# ── Utilities ─────────────────────────────────────────────────────────────────

def normalize_base(url: str) -> str:
    url = url.rstrip("/")
    url = re.sub(r"/wp-json/.*$", "", url)
    return url


def decode_html(s: str) -> str:
    return (s
        .replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
        .replace("&quot;", '"').replace("&#039;", "'")
        .replace("&#8211;", "–").replace("&#8362;", "₪"))


def slug_from_url(url: str) -> str:
    part = url.rstrip("/").split("/")[-1]
    try:
        return urllib.parse.unquote(part)
    except Exception:
        return part


def name_from_slug(slug: str) -> str:
    return slug.replace("-", " ").title()


def extract_locs(xml_text: str) -> list:
    locs = []
    try:
        root = ET.fromstring(xml_text)
        ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        for loc in root.findall(".//sm:loc", ns):
            if loc.text:
                locs.append(loc.text.strip())
    except ET.ParseError:
        for m in re.finditer(r"<loc>\s*(.*?)\s*</loc>", xml_text, re.IGNORECASE):
            locs.append(m.group(1))
    return locs


def parse_price(prices: dict, on_sale: bool) -> tuple:
    """Return (price, regular_price, sale_price) as human-readable strings."""
    minor = int(prices.get("currency_minor_unit") or 0)
    div = 10 ** minor

    def to_major(raw) -> str:
        try:
            n = int(raw or 0) / div
            return f"{n:.{minor}f}" if minor > 0 else str(int(n))
        except (ValueError, TypeError):
            return "0"

    regular = to_major(prices.get("regular_price") or prices.get("price"))
    price   = to_major(prices.get("price"))
    sale    = to_major(prices.get("sale_price")) if on_sale else ""
    return price, regular, sale

# ── cloudscraper HTTP layer ───────────────────────────────────────────────────

class HttpSession:
    """Thin wrapper around cloudscraper (or plain requests) for GET calls."""

    def __init__(self):
        if HAS_CLOUDSCRAPER:
            self._s = _cs.create_scraper(
                browser={"browser": "chrome", "platform": "windows", "mobile": False}
            )
        else:
            import urllib.request
            self._s = None   # fallback handled in get_*

    def _get_raw(self, url: str, timeout: int = 30) -> Optional[tuple]:
        """Returns (status_code, text) or None on error."""
        try:
            if self._s is not None:
                r = self._s.get(url, timeout=timeout)
                return r.status_code, r.text
            # stdlib fallback
            req = urllib.request.Request(url, headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/131.0.0.0 Safari/537.36"
                )
            })
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.status, resp.read().decode("utf-8", errors="replace")
        except Exception:
            return None

    def get_json(self, url: str) -> Optional[object]:
        result = self._get_raw(url)
        if result and result[0] == 200:
            try:
                return json.loads(result[1])
            except json.JSONDecodeError:
                return None
        return None

    def get_text(self, url: str) -> Optional[str]:
        result = self._get_raw(url)
        if result and result[0] == 200:
            return result[1]
        return None

# ── Category parsers ──────────────────────────────────────────────────────────

def _store_api_cat(item: dict, source: str) -> Optional[Category]:
    id_ = item.get("id")
    if not id_:
        return None
    return Category(
        id=int(id_),
        name=decode_html(item.get("name", "")),
        slug=item.get("slug", ""),
        parent=int(item.get("parent", 0)),
        count=int(item.get("count", 0)),
        permalink=item.get("permalink", ""),
        description=decode_html(item.get("description", "")),
        source=source,
    )


def _wp_rest_cat(item: dict, source: str) -> Optional[Category]:
    id_ = item.get("id")
    if not id_:
        return None
    return Category(
        id=int(id_),
        name=decode_html(item.get("name", "")),
        slug=item.get("slug", ""),
        parent=int(item.get("parent", 0)),
        count=int(item.get("count", 0)),
        permalink=item.get("link", ""),
        description=decode_html(item.get("description", "")),
        source=source,
    )


def parse_categories_from_html(html: str) -> list:
    """WooCommerce always emits cat-item cat-item-{ID} on category widget items."""
    results, seen = [], set()
    block_re = re.compile(r'cat-item-(\d+)[^>]*>([\s\S]{0,800}?)</li>', re.IGNORECASE)
    link_re  = re.compile(r'<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)</a>', re.IGNORECASE)

    for m in block_re.finditer(html):
        id_ = int(m.group(1))
        if id_ in seen or id_ == 0:
            continue
        lm = link_re.search(m.group(2))
        if not lm:
            continue
        seen.add(id_)
        permalink = lm.group(1).strip()
        name = decode_html(re.sub(r"<[^>]+>", "", lm.group(2)).strip())
        results.append(Category(
            id=id_, name=name, slug=slug_from_url(permalink),
            parent=0, count=0, permalink=permalink, source="html",
        ))
    return results

# ── Product parsers ───────────────────────────────────────────────────────────

def _store_api_product(item: dict, source: str) -> Optional[Product]:
    id_ = item.get("id")
    if not id_:
        return None
    on_sale = bool(item.get("on_sale"))
    price, regular, sale = parse_price(item.get("prices", {}), on_sale)
    return Product(
        id=int(id_),
        name=decode_html(item.get("name", "")),
        sku=item.get("sku", ""),
        price=price,
        regular_price=regular,
        sale_price=sale,
        description=decode_html(item.get("description", "")),
        short_description=decode_html(item.get("short_description", "")),
        categories=[c["id"] for c in item.get("categories", []) if isinstance(c, dict)],
        image_urls=[img["src"] for img in item.get("images", [])
                    if isinstance(img, dict) and img.get("src")],
        in_stock=bool(item.get("is_in_stock", True)),
        on_sale=on_sale,
        source=source,
    )

# ── HTTP strategies ───────────────────────────────────────────────────────────

def http_store_api_categories(base: str, session: HttpSession) -> list:
    for api_path in ["wc/store/v1", "wc/store"]:
        probe = session.get_json(
            f"{base}/wp-json/{api_path}/products/categories?page=1&per_page=1"
        )
        if not isinstance(probe, list):
            continue
        all_cats = []
        for page in range(1, 101):
            data = session.get_json(
                f"{base}/wp-json/{api_path}/products/categories"
                f"?page={page}&per_page=100"
            )
            if not isinstance(data, list) or not data:
                break
            all_cats += [c for item in data
                         if (c := _store_api_cat(item, "store_api")) is not None]
            if len(data) < 100:
                break
        if all_cats:
            return all_cats
    return []


def http_wp_rest_categories(base: str, session: HttpSession) -> list:
    all_cats = []
    for page in range(1, 51):
        data = session.get_json(
            f"{base}/wp-json/wp/v2/product_cat"
            f"?per_page=100&page={page}&_fields=id,name,slug,description,parent,count,link"
        )
        if not isinstance(data, list) or not data:
            break
        all_cats += [c for item in data
                     if (c := _wp_rest_cat(item, "wp_rest")) is not None]
        if len(data) < 100:
            break
    return all_cats


def http_sitemap_categories(base: str, session: HttpSession) -> list:
    cat_urls = []

    for index_url in [f"{base}/sitemap.xml", f"{base}/wp-sitemap.xml"]:
        xml = session.get_text(index_url)
        if not xml:
            continue
        locs = extract_locs(xml)
        sub_url = next(
            (l for l in locs if "product_cat" in l or "product-category" in l), None
        )
        if sub_url:
            sub_xml = session.get_text(sub_url)
            if sub_xml:
                cat_urls = extract_locs(sub_xml)
                if cat_urls:
                    break

    if not cat_urls:
        for direct in [
            f"{base}/product-category-sitemap.xml",
            f"{base}/wp-sitemap-taxonomies-product_cat-1.xml",
        ]:
            xml = session.get_text(direct)
            if xml:
                cat_urls = extract_locs(xml)
                if cat_urls:
                    break

    return [
        Category(
            id=-(i + 1), name=name_from_slug(slug_from_url(url)),
            slug=slug_from_url(url), parent=0, count=0,
            permalink=url, source="sitemap",
        )
        for i, url in enumerate(cat_urls)
    ]


def http_store_api_products(base: str, session: HttpSession) -> list:
    for api_path in ["wc/store/v1", "wc/store"]:
        probe = session.get_json(
            f"{base}/wp-json/{api_path}/products?page=1&per_page=1"
        )
        if not isinstance(probe, list):
            continue
        all_prods = []
        for page in range(1, 101):
            data = session.get_json(
                f"{base}/wp-json/{api_path}/products?page={page}&per_page=100"
            )
            if not isinstance(data, list) or not data:
                break
            all_prods += [p for item in data
                          if (p := _store_api_product(item, "store_api")) is not None]
            if len(data) < 100:
                break
        if all_prods:
            return all_prods
    return []

# ── Playwright strategies ─────────────────────────────────────────────────────

STEALTH_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)


async def _launch_browser(p, headed: bool = False) -> Browser:
    return await p.chromium.launch(
        headless=not headed,
        args=[
            "--disable-blink-features=AutomationControlled",
            "--disable-dev-shm-usage",
            "--no-sandbox",
        ],
    )


async def _new_context(browser: Browser) -> BrowserContext:
    return await browser.new_context(
        user_agent=STEALTH_USER_AGENT,
        locale="en-US",
        viewport={"width": 1280, "height": 720},
        extra_http_headers={
            "Accept-Language": "en-US,en;q=0.9",
        },
    )


async def _warm_up(page: Page, home_url: str, wait_ms: int = 3000):
    """Visit homepage so Cloudflare sets its cookies."""
    print(f"  [playwright] Warming up at {home_url} ...")
    await page.goto(home_url, wait_until="networkidle", timeout=120_000)
    if wait_ms > 0:
        await asyncio.sleep(wait_ms / 1000)


async def _pw_fetch_json(page: Page, url: str) -> Optional[object]:
    """Run fetch() inside the page context — Cloudflare cookies already present."""
    try:
        return await page.evaluate(
            """async (url) => {
                const r = await fetch(url, {
                    credentials: 'include',
                    headers: { Accept: 'application/json, text/plain, */*' }
                });
                if (!r.ok) return null;
                return await r.json();
            }""",
            url,
        )
    except Exception:
        return None


async def pw_categories(base: str, headed: bool = False) -> list:
    if not HAS_PLAYWRIGHT:
        return []

    async with async_playwright() as p:
        browser = await _launch_browser(p, headed)
        try:
            ctx  = await _new_context(browser)
            page = await ctx.new_page()
            if HAS_STEALTH:
                await stealth_async(page)

            await _warm_up(page, f"{base}/")

            # 1. Try Store API from inside browser
            for api_path in ["wc/store/v1", "wc/store"]:
                url  = f"{base}/wp-json/{api_path}/products/categories?per_page=100&page=1"
                data = await _pw_fetch_json(page, url)
                if isinstance(data, list) and data:
                    cats = [c for item in data
                            if (c := _store_api_cat(item, "playwright_store_api")) is not None]
                    if cats:
                        return cats

            # 2. Try WP REST API from inside browser
            url  = (f"{base}/wp-json/wp/v2/product_cat"
                    f"?per_page=100&page=1&_fields=id,name,slug,description,parent,count,link")
            data = await _pw_fetch_json(page, url)
            if isinstance(data, list) and data:
                cats = [c for item in data
                        if (c := _wp_rest_cat(item, "playwright_wp_rest")) is not None]
                if cats:
                    return cats

            # 3. HTML fallback — cat-item CSS classes
            for path in ["/shop/", "/", "/store/"]:
                resp = await page.goto(f"{base}{path}", wait_until="networkidle", timeout=60_000)
                if resp and resp.status == 200:
                    html = await page.content()
                    cats = parse_categories_from_html(html)
                    if cats:
                        return cats

        finally:
            await browser.close()

    return []


async def pw_products(base: str, headed: bool = False) -> list:
    if not HAS_PLAYWRIGHT:
        return []

    async with async_playwright() as p:
        browser = await _launch_browser(p, headed)
        try:
            ctx  = await _new_context(browser)
            page = await ctx.new_page()
            if HAS_STEALTH:
                await stealth_async(page)

            await _warm_up(page, f"{base}/")

            for api_path in ["wc/store/v1", "wc/store"]:
                all_prods = []
                for pg in range(1, 101):
                    url  = f"{base}/wp-json/{api_path}/products?page={pg}&per_page=100"
                    data = await _pw_fetch_json(page, url)
                    if not isinstance(data, list) or not data:
                        break
                    all_prods += [pr for item in data
                                  if (pr := _store_api_product(item, "playwright_store_api")) is not None]
                    if len(data) < 100:
                        break
                if all_prods:
                    return all_prods

        finally:
            await browser.close()

    return []

# ── Orchestrator ──────────────────────────────────────────────────────────────

async def scrape(site_url: str, headed: bool = False, skip_products: bool = False):
    base    = normalize_base(site_url)
    session = HttpSession()

    print(f"\n{'='*60}")
    print(f"  Target: {base}")
    print(f"{'='*60}")

    # ── Categories ────────────────────────────────────────────────────────────
    categories = []

    print("\n── Categories ──────────────────────────────────────────────")

    print("[1] Store API (HTTP) ...")
    categories = http_store_api_categories(base, session)
    if categories:
        print(f"    ✅  {len(categories)} categories via Store API")

    if not categories:
        print("[2] WP REST API (HTTP) ...")
        categories = http_wp_rest_categories(base, session)
        if categories:
            print(f"    ✅  {len(categories)} categories via WP REST API")

    if not categories:
        print("[3] Sitemap scraping ...")
        categories = http_sitemap_categories(base, session)
        if categories:
            print(f"    ✅  {len(categories)} categories via Sitemap")

    if not categories:
        print("[4] Playwright (Cloudflare bypass) ...")
        categories = await pw_categories(base, headed)
        if categories:
            print(f"    ✅  {len(categories)} categories via Playwright ({categories[0].source})")
        else:
            print("    ❌  All category strategies failed")

    # ── Products ──────────────────────────────────────────────────────────────
    products = []

    if not skip_products:
        print("\n── Products ────────────────────────────────────────────────")

        print("[1] Store API (HTTP) ...")
        products = http_store_api_products(base, session)
        if products:
            print(f"    ✅  {len(products)} products via Store API")

        if not products:
            print("[2] Playwright (Cloudflare bypass) ...")
            products = await pw_products(base, headed)
            if products:
                print(f"    ✅  {len(products)} products via Playwright")
            else:
                print("    ❌  Could not fetch products")

    return categories, products

# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    if not HAS_CLOUDSCRAPER:
        print("⚠️  cloudscraper missing  →  pip install cloudscraper")
    if not HAS_PLAYWRIGHT:
        print("⚠️  playwright missing    →  pip install playwright && playwright install chromium")
    if not HAS_STEALTH:
        print("ℹ️  playwright-stealth missing (optional)  →  pip install playwright-stealth")

    ap = argparse.ArgumentParser(description="WooCommerce scraper with Cloudflare bypass")
    ap.add_argument("url", help="Shop URL  e.g. https://example.com")
    ap.add_argument("--categories-out", default="categories.json")
    ap.add_argument("--products-out",   default="products.json")
    ap.add_argument("--headed",  action="store_true", help="Show browser window (useful for debugging)")
    ap.add_argument("--skip-products", action="store_true", help="Fetch categories only")
    args = ap.parse_args()

    categories, products = asyncio.run(
        scrape(args.url, headed=args.headed, skip_products=args.skip_products)
    )

    with open(args.categories_out, "w", encoding="utf-8") as f:
        json.dump([dataclasses.asdict(c) for c in categories], f, ensure_ascii=False, indent=2)
    print(f"\n💾  {len(categories)} categories  →  {args.categories_out}")

    if not args.skip_products:
        with open(args.products_out, "w", encoding="utf-8") as f:
            json.dump([dataclasses.asdict(p) for p in products], f, ensure_ascii=False, indent=2)
        print(f"💾  {len(products)} products    →  {args.products_out}")


if __name__ == "__main__":
    main()

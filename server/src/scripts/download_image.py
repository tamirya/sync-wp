#!/usr/bin/env python3
"""
download_image.py — Download a supplier image, bypassing anti-hotlinking.

Usage:
    python download_image.py <image_url> <output_path>

Exit codes:
    0  success  — image written to <output_path>; content-type printed to stdout
    1  failure  — error message printed to stderr
"""

from __future__ import annotations

import os
import sys
import urllib.parse

# ---------------------------------------------------------------------------
# Strategy 1: cloudscraper (Cloudflare + JS-challenge aware)
# Strategy 2: requests with browser headers
# ---------------------------------------------------------------------------


def _referer(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}/"


BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
}


def try_cloudscraper(url: str) -> tuple[bytes, str] | None:
    try:
        import cloudscraper  # type: ignore

        scraper = cloudscraper.create_scraper(
            browser={"browser": "chrome", "platform": "windows", "mobile": False}
        )
        headers = {**BROWSER_HEADERS, "Referer": _referer(url)}
        resp = scraper.get(url, headers=headers, timeout=20, stream=True)
        if resp.status_code >= 300:
            return None
        content_type = resp.headers.get("Content-Type", "image/jpeg").split(";")[0].strip()
        return resp.content, content_type
    except Exception:
        return None


def try_requests(url: str) -> tuple[bytes, str] | None:
    try:
        import requests  # type: ignore

        headers = {**BROWSER_HEADERS, "Referer": _referer(url)}
        resp = requests.get(url, headers=headers, timeout=20, stream=True)
        if resp.status_code >= 300:
            return None
        content_type = resp.headers.get("Content-Type", "image/jpeg").split(";")[0].strip()
        return resp.content, content_type
    except Exception:
        return None


def main() -> int:
    if len(sys.argv) < 3:
        print("Usage: download_image.py <url> <output_path>", file=sys.stderr)
        return 1

    url = sys.argv[1]
    output_path = sys.argv[2]

    result = try_cloudscraper(url) or try_requests(url)

    if result is None:
        print(f"Failed to download: {url}", file=sys.stderr)
        return 1

    data, content_type = result
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(data)

    # Print content-type to stdout for the caller to read
    print(content_type)
    return 0


if __name__ == "__main__":
    sys.exit(main())

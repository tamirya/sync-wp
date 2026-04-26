# REST API — Use cases & endpoint reference

This document describes how to accomplish common tasks and lists every HTTP route (see route files under `src/routes/`).

## Conventions

| Item | Detail |
|------|--------|
| Base URL | `http://localhost:<PORT>` (or your host). `PORT` from `.env.*.local`. |
| Content-Type | `application/json` for bodies where applicable. |
| Success body | Usually `{ "data": ..., "message": "<string>" }`. Root health check returns **200 with no body**. |
| Error body | `{ "message": "<string>" }` with 4xx/5xx. |
| Authentication | JWT via cookie `Authorization=<token>` **or** header `Authorization: Bearer <token>`. |

**Catalog / category sync responses** (`POST .../categories/sync`, `POST .../catalog/sync` for stores and suppliers): JSON includes `fetched`, `upserted`, and `removed` — `removed` is the count of DB rows deleted because they no longer exist in the remote Woo or Store API snapshot (or full wipe when the remote list is empty).

**Data model notes**

- **`stores`** — optional `port` field (`integer unsigned`) for stores that run on a non-standard port.
- **`store_catalog` / `supplier_catalog`** — optional `categories` field (`string[]`, stored as JSON) representing the product's category names/slugs at sync time.

**Security notes**

- **Public (no auth middleware):** `GET /`, `POST /signup`, `POST /login`, and all `/users/*` routes.
- User JSON may include **`password`** (hashed); treat responses as sensitive. Store objects no longer expose `username`, `password`, or `sourceUrl`.

---

## Use cases

Each use case lists the endpoints to call in a sensible order. Replace `:id` with the numeric id from a previous response.

### Sign up and sign in

| Step | What you want | Endpoint |
|------|----------------|----------|
| 1 | Create an account | `POST /signup` — body: `{ "email", "password" }` |
| 2 | Log in and obtain a session token | `POST /login` — body: `{ "email", "password" }`. Sets `Authorization` cookie (`HttpOnly`). |
| 3 | Call protected APIs | Send the JWT: cookie **or** `Authorization: Bearer <token>`. |
| 4 | End session | `POST /logout` — requires auth. |

### Manage WooCommerce REST keys (env → store)

| Step | What you want | Endpoint |
|------|----------------|----------|
| 1 | List saved key pairs | `GET /env_to_store` |
| 2 | Save consumer key/secret for a store | `POST /env_to_store` — body: `storeId`, `consumerKey`, `consumerSecret` |
| 3 | Update or remove | `PUT /env_to_store/:id`, `DELETE /env_to_store/:id` |

### Configure a target store (Woo site)

| Step | What you want | Endpoint |
|------|----------------|----------|
| 1 | List your stores | `GET /stores` |
| 2 | Register a new store connection | `POST /stores` — body: `name`, `url`, optional `port` |
| 3 | Fetch one store | `GET /stores/:id` |
| 4 | Update or delete | `PUT /stores/:id`, `DELETE /stores/:id` |

### Configure a supplier (catalog source URL)

| Step | What you want | Endpoint |
|------|----------------|----------|
| 1 | List suppliers | `GET /suppliers` |
| 2 | Create supplier | `POST /suppliers` — body: `name`, `url` |
| 3 | Get one supplier | `GET /suppliers/:id` |
| 4 | Update or delete | `PUT /suppliers/:id`, `DELETE /suppliers/:id` |

### Fetch / refresh supplier taxonomy and catalog (local DB)

Use these before imports that rely on `supplier_catalog` or category data.

| Step | What you want | Endpoint |
|------|----------------|----------|
| 1 | Pull supplier categories from the Store API into your DB | `POST /suppliers/:id/categories/sync` |
| 2 | List supplier categories (after sync) | `GET /suppliers/:id/categories` |
| 3 | Pull supplier products into `supplier_catalog` | `POST /suppliers/:id/catalog/sync` |
| 4 | List supplier catalog products | `GET /suppliers/:id/products` |

### Map supplier categories or products to store categories (rules)

| Step | What you want | Endpoint |
|------|----------------|----------|
| 1 | List category rules (optional filters) | `GET /category-rules` — query: optional `storeId`, `supplierId` |
| 2 | Create rule: supplier category → store category | `POST /category-rules` — body: `storeId`, `supplierId`, `supplierCategoryId`, `storeCategoryId`, optional `enabled` |
| 3 | List product-level rules | `GET /product-category-rules` — query: optional `storeId`, `supplierId` |
| 4 | Create rule: one supplier product → store category | `POST /product-category-rules` — body: `storeId`, `supplierId`, `sourceProductId`, `storeCategoryId`, optional `enabled` |
| 5 | Edit / delete | `PUT`/`DELETE` on `/category-rules/:id` or `/product-category-rules/:id` |

### Sync store categories and store-side catalog (Woo + your DB)

| Step | What you want | Endpoint |
|------|----------------|----------|
| 1 | Sync Woo product categories into your DB for this store | `POST /stores/:id/categories/sync` |
| 2 | List store categories | `GET /stores/:id/categories` |
| 3 | Sync the store catalog snapshot | `POST /stores/:id/catalog/sync` |
| 4 | List products for the store (local `store_catalog` snapshot) | `GET /stores/:id/products` |

> **Naming tip:** "Fetch store catalog" in the UI usually means either **listing synced Woo products** (`GET /stores/:id/products`) or **running a catalog sync** (`POST /stores/:id/catalog/sync`) depending on whether you need fresh data from Woo first.

### CRUD store categories (Woo live)

These endpoints write directly to WooCommerce and keep `store_categories` in sync immediately — no separate sync call needed.

| Step | What you want | Endpoint |
|------|----------------|----------|
| 1 | Create a new category in Woo | `POST /stores/:storeId/categories` — body: `name`, optional `slug`, `parent`, `description`, `display` |
| 2 | Get a single category (live from Woo) | `GET /stores/:storeId/categories/:wooCategoryId` |
| 3 | Update a category in Woo | `PUT /stores/:storeId/categories/:wooCategoryId` — all fields optional |
| 4 | Delete a category from Woo | `DELETE /stores/:storeId/categories/:wooCategoryId` — also removes the local `store_categories` row |

> **Note:** Deleting a category that has child categories may fail with a Woo 400 error. Delete children first, then the parent.

### CRUD store products (Woo live)

These endpoints write directly to WooCommerce and keep `store_catalog` in sync immediately.

| Step | What you want | Endpoint |
|------|----------------|----------|
| 1 | Create a new product in Woo | `POST /stores/:storeId/woo-products` — body: `name`, optional fields (see DTO) |
| 2 | Get a single product (live from Woo) | `GET /stores/:storeId/woo-products/:wooProductId` |
| 3 | Update a product in Woo | `PUT /stores/:storeId/woo-products/:wooProductId` — all fields optional |
| 4 | Delete a product from Woo | `DELETE /stores/:storeId/woo-products/:wooProductId` — also removes the local `store_catalog` row |

> **Why `/woo-products` and not `/products`?** `GET /stores/:id/products` already exists and returns the local `store_catalog` snapshot. `/woo-products` is the live CRUD resource that talks directly to Woo.

### Import products into the store

| Step | What you want | Endpoint |
|------|----------------|----------|
| 1 | (Recommended) Refresh supplier data | `POST /suppliers/:id/catalog/sync` (and categories if needed) |
| 2 | Import a batch from the Store API (optional category rule) | `POST /stores/:id/import/store-api` — body: optional `supplierId`, `categoryRuleId`, `importTags` |
| 3 | Import using saved rules + `supplier_catalog` | `POST /stores/:id/import/sync-rules` — body: optional `supplierIds`, `importTags`. Ensure supplier catalog is up to date first. |

### Danger zone: clear Woo products or categories for a store

| Step | What you want | Endpoint |
|------|----------------|----------|
| 1 | Delete all Woo products (requires confirmation) | `POST /stores/:id/products/clear-woo` — body: `{ "confirm": true }`. Deletes from Woo + removes DB rows. |
| 2 | Delete all Woo categories (requires confirmation) | `POST /stores/:id/categories/clear` — body: `{ "confirm": true }`. Deletes from Woo only; run `POST /stores/:id/categories/sync` afterwards to clean DB. |

### User directory (admin-style CRUD)

> These routes are **not** protected by `authMiddleware` in the current codebase — lock them down in production.

| Step | What you want | Endpoint |
|------|----------------|----------|
| 1 | List / get / create / update / delete users | `GET /users`, `GET /users/:id`, `POST /users`, `PUT /users/:id`, `DELETE /users/:id` |

### API documentation (Swagger)

| Step | What you want | Endpoint |
|------|----------------|----------|
| 1 | Open interactive docs | `GET /api-docs` (UI; spec from `swagger.yaml`) |

---

## Endpoint reference

### Root & docs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | no | Health: `200`, no JSON body. |
| GET | `/api-docs` | no | Swagger UI. |

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/signup` | no | Body: `email`, `password`. `201` |
| POST | `/login` | no | Body: `email`, `password`. Sets cookie. `200` |
| POST | `/logout` | yes | `200` |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users` | no* | List users |
| GET | `/users/:id` | no* | Get user |
| POST | `/users` | no* | Create (`email`, `password`) |
| PUT | `/users/:id` | no* | Update |
| DELETE | `/users/:id` | no* | Delete |

\*No `authMiddleware` in route definitions.

### Stores

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/stores` | yes | List stores for current user |
| GET | `/stores/:id/categories` | yes | Store (Woo) categories — local `store_categories` snapshot |
| POST | `/stores/:id/categories/sync` | yes | Full sync Woo → `store_categories` (`fetched`, `upserted`, `removed`) |
| POST | `/stores/:id/categories/clear` | yes | Delete all Woo categories for this store; body: `confirm` must be true. Run sync after to clean DB. |
| GET | `/stores/:id/products` | yes | Store products — local `store_catalog` snapshot |
| POST | `/stores/:id/products/clear-woo` | yes | Body: `confirm` must be true |
| POST | `/stores/:id/catalog/sync` | yes | Full sync Woo → `store_catalog` (`fetched`, `upserted`, `removed`) |
| POST | `/stores/:id/import/sync-rules` | yes | Rules-based import from supplier catalog |
| POST | `/stores/:id/import/store-api` | yes | Store API import batch |
| GET | `/stores/:id` | yes | Get store |
| POST | `/stores` | yes | Create store |
| PUT | `/stores/:id` | yes | Update store |
| DELETE | `/stores/:id` | yes | Delete store |

### Store categories CRUD (Woo live)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/stores/:storeId/categories` | yes | Create category in Woo + upsert in `store_categories` |
| GET | `/stores/:storeId/categories/:wooCategoryId` | yes | Get single category live from Woo |
| PUT | `/stores/:storeId/categories/:wooCategoryId` | yes | Update category in Woo + update `store_categories` |
| DELETE | `/stores/:storeId/categories/:wooCategoryId` | yes | Delete from Woo (`force:true`) + delete from `store_categories` |

### Store products CRUD (Woo live)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/stores/:storeId/woo-products` | yes | Create product in Woo + upsert in `store_catalog` |
| GET | `/stores/:storeId/woo-products/:wooProductId` | yes | Get single product live from Woo |
| PUT | `/stores/:storeId/woo-products/:wooProductId` | yes | Update product in Woo + update `store_catalog` |
| DELETE | `/stores/:storeId/woo-products/:wooProductId` | yes | Delete from Woo (`force:true`) + delete from `store_catalog` |

### Suppliers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/suppliers` | yes | List suppliers |
| GET | `/suppliers/:id/categories` | yes | Supplier categories |
| POST | `/suppliers/:id/categories/sync` | yes | Full sync Store API → `supplier_categories` (`fetched`, `upserted`, `removed`) |
| POST | `/suppliers/:id/catalog/sync` | yes | Full sync Store API → `supplier_catalog` (`fetched`, `upserted`, `removed`) |
| GET | `/suppliers/:id/products` | yes | Supplier catalog products |
| GET | `/suppliers/:id` | yes | Get supplier |
| POST | `/suppliers` | yes | Create supplier |
| PUT | `/suppliers/:id` | yes | Update supplier |
| DELETE | `/suppliers/:id` | yes | Delete supplier |

### Category rules

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/category-rules` | yes | Query: optional `storeId`, `supplierId` |
| GET | `/category-rules/:id` | yes | Get rule |
| POST | `/category-rules` | yes | Create rule |
| PUT | `/category-rules/:id` | yes | Update rule |
| DELETE | `/category-rules/:id` | yes | Delete rule |

### Product category rules

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/product-category-rules` | yes | Query: optional `storeId`, `supplierId` |
| GET | `/product-category-rules/:id` | yes | Get rule |
| POST | `/product-category-rules` | yes | Create rule |
| PUT | `/product-category-rules/:id` | yes | Update rule |
| DELETE | `/product-category-rules/:id` | yes | Delete rule |

### Env → store (keys)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/env_to_store` | yes | List |
| GET | `/env_to_store/:id` | yes | Get |
| POST | `/env_to_store` | yes | Create (`storeId`, `consumerKey`, `consumerSecret`) |
| PUT | `/env_to_store/:id` | yes | Update |
| DELETE | `/env_to_store/:id` | yes | Delete |

---

## Request bodies (DTO summary)

| Area | Fields |
|------|--------|
| Signup / login / users | `email`, `password` |
| Store create/update | `name`, `url`, optional `port` |
| Supplier | `name`, `url` |
| Clear Woo products | `confirm`: must be `true` |
| Clear Woo categories | `confirm`: must be `true` |
| Import store API | optional `supplierId`, `categoryRuleId`, `importTags` |
| Import sync-rules | optional `supplierIds[]`, `importTags` |
| Category rule create | `storeId`, `supplierId`, `supplierCategoryId`, `storeCategoryId`, optional `enabled` |
| Product category rule create | `storeId`, `supplierId`, `sourceProductId`, `storeCategoryId`, optional `enabled` |
| Env to store | `storeId`, `consumerKey`, `consumerSecret` |
| Store category create | `name`, optional `slug`, `parent` (int), `description`, `display` |
| Store category update | all fields optional: `name`, `slug`, `parent`, `description`, `display` |
| Store product create | `name`, optional `sku`, `type`, `status`, `description`, `short_description`, `regular_price`, `sale_price`, `manage_stock`, `stock_quantity`, `categories[]` |
| Store product update | all fields optional — same as create |

For exact validation (optional vs required, partial updates), see `src/dtos/`.

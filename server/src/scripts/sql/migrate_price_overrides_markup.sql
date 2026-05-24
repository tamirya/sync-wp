-- Migrate price_overrides from absolute prices to markup percent + useSalePrices.
-- Prefer: npm run db:migrate:price-overrides (idempotent TypeScript script).
-- Manual reference only — do not run twice without checking INFORMATION_SCHEMA.

ALTER TABLE price_overrides
  ADD COLUMN markupPercent DECIMAL(6, 2) NOT NULL DEFAULT 0 AFTER targetId,
  ADD COLUMN useSalePrices TINYINT(1) NOT NULL DEFAULT 1 AFTER markupPercent;

ALTER TABLE price_overrides
  DROP COLUMN regularPrice,
  DROP COLUMN salePrice;

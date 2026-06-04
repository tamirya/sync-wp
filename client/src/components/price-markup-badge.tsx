import { formatPriceOverrideLabel, type PriceOverride } from "@/lib/price-utils";

type Props = {
  override: PriceOverride;
  /** e.g. "מחיר" — shown before the percentage */
  priceLabel: string;
  /** Shown when `useSalePrices` is true */
  salePricesHint?: string;
  className?: string;
  onEdit?: () => void;
  editAriaLabel?: string;
};

/** Markup badge for supplier category/product cards — LTR-safe (+10%, not 10%+). */
export function PriceMarkupBadge({
  override,
  priceLabel,
  salePricesHint,
  className = "",
  onEdit,
  editAriaLabel,
}: Props) {
  const adjustment = formatPriceOverrideLabel(override);

  const content = (
    <>
      <span className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-[11px] font-semibold text-amber-800">
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="h-3.5 w-3.5 shrink-0 text-amber-600"
          aria-hidden
        >
          <path
            d="M8 2v12M5 5l3-3 3 3M5 11l3 3 3-3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="truncate">{priceLabel}:</span>
        <span dir="ltr" className="shrink-0 tabular-nums text-sm font-bold text-amber-900">
          {adjustment}
        </span>
      </span>
      {override.useSalePrices && salePricesHint ? (
        <span className="w-full text-[10px] leading-tight text-amber-700/90 ps-5">
          {salePricesHint}
        </span>
      ) : null}
    </>
  );

  if (!onEdit) {
    return (
      <div
        className={`flex flex-wrap items-center gap-1.5 rounded-lg border border-amber-200/80 bg-amber-50 px-2.5 py-1.5 ${className}`}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      className={`flex overflow-hidden rounded-lg border border-amber-300/90 bg-amber-50 shadow-sm ${className}`}
    >
      <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5 px-2.5 py-1.5">
        {content}
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label={editAriaLabel}
        title={editAriaLabel}
        className="flex w-9 shrink-0 items-center justify-center border-s border-amber-200/90 text-amber-700 transition hover:bg-amber-100 hover:text-amber-900"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-3.5 w-3.5"
          aria-hidden
        >
          <path
            d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

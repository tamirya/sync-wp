type Props = {
  label: string;
  className?: string;
  minHeightClass?: string;
};

/** Shared spinner + label for mapping route (inline transition + loading.tsx). */
export function MappingTreesLoadingIndicator({
  label,
  className = "",
  minHeightClass = "min-h-48",
}: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-10 ${minHeightClass} ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent"
        aria-hidden
      />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

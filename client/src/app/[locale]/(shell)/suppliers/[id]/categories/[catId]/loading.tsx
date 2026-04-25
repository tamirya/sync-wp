export default function SupplierCategoryLoading() {
  return (
    <div className="mx-auto pb-12 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-24 rounded bg-muted-bg" />
        <div className="h-4 w-2 rounded bg-muted-bg" />
        <div className="h-4 w-20 rounded bg-muted-bg" />
        <div className="h-4 w-2 rounded bg-muted-bg" />
        <div className="h-4 w-28 rounded bg-muted-bg" />
      </div>

      {/* Header skeleton */}
      <div className="mt-6 flex items-start gap-4">
        <div className="h-14 w-14 shrink-0 rounded-2xl bg-muted-bg" />
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-muted-bg" />
          <div className="h-8 w-48 rounded-lg bg-muted-bg" />
          <div className="h-4 w-32 rounded bg-muted-bg" />
        </div>
      </div>

      {/* Sub-categories section skeleton */}
      <div className="mt-10">
        <div className="mb-4 h-3 w-24 rounded bg-muted-bg" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card px-4 py-3"
            >
              <div className="h-10 w-10 shrink-0 rounded-xl bg-muted-bg" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-3/4 rounded bg-muted-bg" />
                <div className="h-3 w-1/2 rounded bg-muted-bg" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Products section skeleton */}
      <div className="mt-10">
        <div className="mb-4 h-3 w-16 rounded bg-muted-bg" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card"
            >
              <div className="h-44 w-full bg-muted-bg" />
              <div className="flex flex-col gap-3 p-4">
                <div className="h-4 w-3/4 rounded bg-muted-bg" />
                <div className="h-3 w-1/2 rounded bg-muted-bg" />
                <div className="h-5 w-1/3 rounded bg-muted-bg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

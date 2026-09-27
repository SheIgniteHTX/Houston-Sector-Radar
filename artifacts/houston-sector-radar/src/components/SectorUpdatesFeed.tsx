import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { useGetSectorUpdates } from '@workspace/api-client-react';

export default function SectorUpdatesFeed() {
  const { data, isLoading, isError, refetch, isFetching } = useGetSectorUpdates();

  return (
    <section
      id="sector-updates"
      aria-labelledby="sector-updates-feed-heading"
      className="mx-auto max-w-[1320px] px-5 py-16 md:px-10 md:py-20"
    >
      <div className="mb-8 flex flex-col gap-5 border-b border-border/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-3 font-mono-radar text-[10px] uppercase tracking-[.2em] text-primary">
            <span className="h-px w-8 bg-primary" />
            Official labor-market source
          </div>
          <h2
            id="sector-updates-feed-heading"
            className="font-display text-3xl font-semibold tracking-[-.05em] md:text-4xl"
          >
            SECTOR UPDATE FEED
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Houston-area payroll employment signals from the Bureau of Labor Statistics.
            Each update names the industry measured and its limits.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg border border-border px-3 font-mono-radar text-[9px] uppercase tracking-[.14em] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <p role="status" className="rounded-xl border border-border bg-card/45 p-6 text-sm text-muted-foreground">
          Loading official sector updates…
        </p>
      ) : isError ? (
        <div role="alert" className="rounded-xl border border-border bg-card/45 p-6">
          <p className="text-sm text-muted-foreground">
            Sector updates are temporarily unavailable. Please try again.
          </p>
        </div>
      ) : (
        <>
          {data?.sourceStatus === 'unavailable' && (
            <p role="status" className="mb-5 rounded-lg border border-border bg-card/45 px-4 py-3 text-xs leading-5 text-muted-foreground">
              The BLS source could not be refreshed. Showing previously published updates, if available.
            </p>
          )}

          {data?.updates.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {data.updates.map((update) => (
                <article
                  key={update.id}
                  className="rounded-2xl border border-border bg-card/45 p-5 md:p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-mono-radar text-[9px] uppercase tracking-[.15em] text-primary">
                      {update.sectorName}
                    </span>
                    <div className="flex items-center gap-2">
                      {update.preliminary && (
                        <span className="rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-1 font-mono-radar text-[8px] uppercase tracking-[.12em] text-amber-700 dark:text-amber-300">
                          Preliminary
                        </span>
                      )}
                      <span className="font-mono-radar text-[9px] uppercase tracking-[.12em] text-muted-foreground">
                        {update.period}
                      </span>
                    </div>
                  </div>

                  <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
                    {update.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {update.summary}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3 border-y border-border/80 py-4">
                    <div>
                      <span className="block font-mono-radar text-[8px] uppercase tracking-[.14em] text-muted-foreground">
                        Payroll employment
                      </span>
                      <span className="mt-1 block text-sm font-medium text-foreground">
                        {update.employmentThousands.toFixed(1)}k
                      </span>
                    </div>
                    <div>
                      <span className="block font-mono-radar text-[8px] uppercase tracking-[.14em] text-muted-foreground">
                        Year-over-year change
                      </span>
                      <span className="mt-1 block text-sm font-medium text-foreground">
                        {update.changeThousands > 0 ? '+' : ''}
                        {update.changeThousands.toFixed(1)}k
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({update.changePercent > 0 ? '+' : ''}
                          {update.changePercent.toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                  </div>

                  <p className="mt-4 text-xs leading-5 text-muted-foreground">
                    <span className="font-semibold text-foreground">Scope:</span>{' '}
                    {update.scope}
                  </p>
                  <a
                    href={update.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 font-mono-radar text-[9px] uppercase tracking-[.12em] text-primary hover:underline"
                  >
                    BLS source
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-card/45 p-6 text-sm leading-6 text-muted-foreground">
              No sector updates are published yet. This feed refreshes when new
              comparable BLS estimates become available.
            </p>
          )}
        </>
      )}
    </section>
  );
}
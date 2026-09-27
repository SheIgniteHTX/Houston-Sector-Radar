import {
  BLS_PROJECTION_SOURCE,
  INDUSTRY_PROJECTIONS,
} from '@/data/industryProjections';
import type { DemoIndustry } from '@/data/demoRadar';

function formatJobs(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${new Intl.NumberFormat('en-US').format(Math.abs(value))}`;
}

export default function IndustryOutlookDetails({
  industry,
}: {
  industry: DemoIndustry;
}) {
  const projection = INDUSTRY_PROJECTIONS[industry.id];
  const isRelatedSubsector = projection.coverage === 'related-subsector';

  return (
    <div
      data-testid={`card-industry-outlook-${industry.id}`}
      aria-live="polite"
      className="grid w-full gap-6 sm:grid-cols-[1fr_1.2fr_1.5fr] sm:items-start"
    >
      <div>
        <span className="font-mono-radar text-[10px] uppercase tracking-[.18em] text-muted-foreground">
          INDUSTRY
        </span>
        <p
          data-testid="text-selected-industry"
          className="mt-1 font-display text-2xl tracking-[-.035em] text-foreground"
        >
          {industry.name}
        </p>
      </div>

      <div>
        <span className="font-mono-radar text-[10px] uppercase tracking-[.18em] text-muted-foreground">
          {isRelatedSubsector
            ? 'RELATED SUBSECTOR · NET CHANGE'
            : 'PROJECTED NET EMPLOYMENT CHANGE'}
        </span>
        <p
          data-testid="text-selected-projection"
          className="mt-1 font-display text-2xl font-semibold tracking-[-.04em] text-primary"
        >
          {formatJobs(projection.netChangeJobs)} jobs
        </p>
        <p
          data-testid="text-projection-period"
          className="mt-1 font-mono-radar text-[10px] uppercase tracking-[.12em] text-muted-foreground"
        >
          {projection.geography} · {projection.baseYear}–{projection.projectedYear}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {projection.percentChange > 0 ? '+' : ''}
          {projection.percentChange.toFixed(1)}% projected change
        </p>
      </div>

      <div>
        <span className="font-mono-radar text-[10px] uppercase tracking-[.18em] text-muted-foreground">
          SOURCE & SCOPE
        </span>
        <p className="mt-1 text-sm font-medium leading-5 text-foreground">
          {projection.industryCategory}
        </p>
        <a
          data-testid="link-projection-source"
          href={BLS_PROJECTION_SOURCE.url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-sm leading-5 text-primary underline-offset-4 hover:underline focus-visible:underline"
        >
          {BLS_PROJECTION_SOURCE.name}: {BLS_PROJECTION_SOURCE.title}
        </a>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {BLS_PROJECTION_SOURCE.dataset}; published {BLS_PROJECTION_SOURCE.published}.
          {' '}Net employment change, not annual job openings. BLS counts are reported in
          thousands and converted here to jobs. {projection.scope}
        </p>
        <p
          data-testid="text-projection-caveat"
          className="mt-2 text-xs leading-5 text-muted-foreground"
        >
          {isRelatedSubsector
            ? 'No directly comparable Houston-area one-year projection or full-sector measure was verified. This related U.S. subsector outlook is not a projection for the whole radar industry.'
            : 'No directly comparable Houston-area one-year projection was verified. This is a broader U.S. long-range outlook, not a Houston one-year forecast.'}
        </p>
      </div>
    </div>
  );
}
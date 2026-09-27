import { useEffect, useRef, useState } from 'react';
import { Activity, ArrowDown, CircleDot, RotateCcw, ScanLine } from 'lucide-react';
import { Route, Router as WouterRouter, Switch } from 'wouter';
import { useGetHoustonEmploymentTrend } from '@workspace/api-client-react';
import { DEMO_INDUSTRIES, findConnection, findTransferableThemes, type DemoIndustry, type DemoIndustryId, type SignalStatus } from '@/data/demoRadar';
import IndustryOutlookDetails from '@/components/IndustryOutlookDetails';
import SectorUpdatesOptIn from '@/components/SectorUpdatesOptIn';
import NotFound from '@/pages/not-found';

function App() {
  useEffect(() => {
    document.title = 'Houston Workforce Radar';
    const description = 'Explore Houston’s changing industries and see where the experience you already have may connect.';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description);
  }, []);

  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Switch>
        <Route path="/" component={RadarPage} />
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

function RadarPage() {
  const [selected, setSelected] = useState<DemoIndustry | null>(null);
  const [skills, setSkills] = useState(['', '', '']);
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'result'>('idle');
  const [connection, setConnection] = useState<ReturnType<typeof findConnection>>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const startScan = () => {
    if (skills.some((skill) => !skill.trim())) return;
    setScanState('scanning');
    setSelected(null);
    window.setTimeout(() => {
      setConnection(findConnection(skills));
      setScanState('result');
    }, 1450);
  };

  const resetScan = () => {
    setScanState('idle');
    setConnection(null);
    window.setTimeout(() => firstInputRef.current?.focus(), 50);
  };

  const updateSkill = (index: number, value: string) => {
    setSkills((current) => current.map((skill, skillIndex) => skillIndex === index ? value : skill));
    if (scanState !== 'idle') resetScan();
  };

  const activeIndustry = connection?.industry.id;

  return (
    <div className={`grain min-h-[100dvh] overflow-x-hidden bg-background text-foreground ${scanState === 'scanning' ? 'scan-active' : ''}`}>
      <header className="relative z-10 border-b border-border/80">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between px-5 py-5 md:px-10">
          <button type="button" data-testid="button-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="group flex items-center gap-3 text-left">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-primary/50 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Activity size={17} strokeWidth={1.7} />
            </span>
            <span className="font-mono-radar text-[11px] font-medium uppercase tracking-[.18em] text-foreground">Houston Workforce Radar</span>
          </button>
        </div>
      </header>

      <main>
        <section className="relative mx-auto max-w-[1320px] px-5 pb-16 pt-14 md:px-10 md:pb-24 md:pt-20">
          <div className="pointer-events-none absolute -right-24 top-0 h-[480px] w-[480px] rounded-full bg-primary/[.035] blur-3xl" />
          <div className="relative grid items-center gap-12 lg:grid-cols-[.86fr_1.14fr] lg:gap-6">
            <div className="animate-rise max-w-[620px]">
              <div className="mb-7 flex items-center gap-3 font-mono-radar text-[10px] uppercase tracking-[.2em] text-primary">
                <span className="h-px w-10 bg-primary" />
                Houston / workforce intelligence
              </div>
              <h1 className="font-display text-[clamp(3.7rem,8vw,7.1rem)] font-semibold leading-[.86] tracking-[-.075em] text-foreground">
                DO YOU KNOW WHERE HOUSTON’S WORKFORCE IS GOING?
              </h1>
              <p className="mt-8 max-w-[500px] text-lg leading-8 text-muted-foreground">
                Explore Houston’s changing industries and see where the experience you already have may connect.
              </p>
              <a href="#fit" data-testid="link-start-scan" className="mt-8 inline-flex items-center gap-3 font-mono-radar text-[11px] font-medium uppercase tracking-[.16em] text-primary transition-colors hover:text-accent">
                View the radar <ArrowDown size={15} />
              </a>
            </div>
            <div className="animate-rise [animation-delay:120ms]">
              <RadarVisual selectedId={selected?.id} activeId={activeIndustry} onSelect={setSelected} scanning={scanState === 'scanning'} />
            </div>
          </div>
        </section>

        <section className="border-y border-border/80 bg-card/45" aria-label="Selected industry outlook">
          <div className="mx-auto flex min-h-[132px] max-w-[1320px] items-center px-5 py-7 md:px-10">
            {selected ? (
              <div className="w-full">
                <IndustryOutlookDetails industry={selected} />
                <div className="mt-4 flex flex-col gap-2 border-t border-border/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className={`font-mono-radar text-[10px] uppercase tracking-[.14em] ${statusTextColor(selected.status)}`}>
                    Current radar signal · {selected.status}
                  </p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    The radar label is illustrative; the sourced outlook above is a broader U.S. projection, not a Houston one-year forecast.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex w-full items-center justify-between gap-6">
                <p className="font-mono-radar text-[10px] uppercase tracking-[.18em] text-muted-foreground">Select an industry to view its sourced outlook</p>
                <div className="hidden items-center gap-5 font-mono-radar text-[10px] uppercase tracking-[.14em] sm:flex">
                  <StatusKey status="Growing" />
                  <StatusKey status="Steady" />
                  <StatusKey status="Watch" />
                </div>
              </div>
            )}
          </div>
        </section>

        <section id="fit" className="mx-auto max-w-[1320px] scroll-mt-6 px-5 py-20 md:px-10 md:py-28">
          <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr] lg:gap-24">
            <div>
              <div className="mb-5 flex items-center gap-3 font-mono-radar text-[10px] uppercase tracking-[.2em] text-primary">
                <CircleDot size={13} />
                Personal signal
              </div>
              <h2 className="font-display text-5xl font-semibold leading-[.9] tracking-[-.065em] md:text-6xl">WHERE DO YOU FIT?</h2>
              <p className="mt-6 max-w-[340px] text-base leading-7 text-muted-foreground">WHAT DO YOU BRING WITH YOU?</p>
              <p className="mt-3 max-w-[360px] text-sm leading-6 text-muted-foreground/80">Enter three skills or strengths you’ve built through your work experience.</p>
            </div>

            <div className="max-w-[680px]">
              {scanState === 'scanning' ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-primary/30 bg-primary/[.035] text-center">
                  <ScanLine className="mb-7 animate-pulse text-primary" size={32} strokeWidth={1.4} />
                  <p data-testid="status-scanning" className="font-mono-radar text-sm uppercase tracking-[.18em] text-primary">SCANNING HOUSTON’S WORKFORCE…</p>
                  <p className="mt-3 text-sm text-muted-foreground">Reading the signals on the radar</p>
                </div>
              ) : scanState === 'result' ? (
                <ConnectionResult connection={connection} skills={skills} onReset={resetScan} />
              ) : (
                <div className="space-y-4">
                  {skills.map((skill, index) => (
                    <label key={index} className="block" htmlFor={`skill-${index + 1}`}>
                      <span className="mb-2 block font-mono-radar text-[10px] uppercase tracking-[.18em] text-muted-foreground">SKILL OR STRENGTH {index + 1}</span>
                      <input
                        ref={index === 0 ? firstInputRef : undefined}
                        id={`skill-${index + 1}`}
                        data-testid={`input-skill-${index + 1}`}
                        type="text"
                        value={skill}
                        onChange={(event) => updateSkill(index, event.target.value)}
                        placeholder={['e.g. Teaching', 'e.g. Financial analysis', 'e.g. Relationship building'][index]}
                        maxLength={80}
                        className="h-14 w-full rounded-xl border border-border bg-secondary/45 px-4 text-[15px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                    </label>
                  ))}
                  <p className="pt-2 text-xs leading-5 text-muted-foreground">
                    Skills entered here are processed in your browser to create the scan result; this scan does not send or store them. When you submit a sector follow, your sector-interest and follow preference are used for workforce research.
                  </p>
                  <button type="button" data-testid="button-scan-skills" disabled={skills.some((skill) => !skill.trim())} onClick={startScan} className="mt-4 inline-flex h-14 w-full items-center justify-between rounded-xl bg-primary px-5 font-mono-radar text-[11px] font-semibold uppercase tracking-[.16em] text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35">
                    SCAN MY SKILLS
                    <ScanLine size={18} />
                  </button>
                  <p className="pt-2 text-center font-mono-radar text-[9px] uppercase tracking-[.14em] text-muted-foreground/70">Skills only · no résumé upload or degree details requested</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {scanState === 'result' && (
          <SectorUpdatesOptIn preferredIndustryId={connection?.industry.id} />
        )}

        <footer className="border-t border-border/80">
          <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-5 py-8 md:flex-row md:items-center md:justify-between md:px-10">
            <div className="flex flex-col gap-1">
              <span className="font-mono-radar text-[10px] uppercase tracking-[.16em] text-muted-foreground">Houston Workforce Radar</span>
              <span className="font-mono-radar text-[9px] uppercase tracking-[.18em] text-primary">A SHEIGNITE PRODUCT</span>
            </div>
            <div className="max-w-[520px] text-xs leading-5 text-muted-foreground md:text-right">
              <p>Radar labels are illustrative. Scan results show a Houston industry trend only where a published BLS category is a defensible match; unmatched sectors are not assigned a proxy.</p>
              <p className="mt-2">© {new Date().getFullYear()} SheIgnite Society LLC. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function RadarVisual({ selectedId, activeId, onSelect, scanning }: { selectedId?: string; activeId?: string; onSelect: (industry: DemoIndustry) => void; scanning: boolean }) {
  return (
    <div className="relative mx-auto max-w-[650px]">
      <div className="mb-5 flex items-center justify-between px-2 font-mono-radar text-[10px] uppercase tracking-[.16em] text-muted-foreground">
        <span>HOUSTON WORKFORCE RADAR</span>
        <span className="flex items-center gap-2 text-primary"><i className="h-1.5 w-1.5 rounded-full bg-primary" /> {scanning ? 'Scanning' : '6 industry signals'}</span>
      </div>
      <div className="radar-shell">
        <div className="radar-ring" />
        <div className="radar-crosshair absolute inset-0" />
        <div className="radar-sweep" />
        <div className="radar-center" />
        {DEMO_INDUSTRIES.map((industry, index) => (
          <button
            key={industry.id}
            type="button"
            data-testid={`button-signal-${industry.id}`}
            aria-label={`Select ${industry.name} signal`}
            onClick={() => onSelect(industry)}
            className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 text-left outline-none"
            style={{ left: `${industry.x}%`, top: `${industry.y}%`, ['--signal-color' as string]: industry.color }}
          >
            <span className="signal-dot block" data-active={selectedId === industry.id || activeId === industry.id} style={{ animationDelay: `${index * 180}ms` }} />
            <span className={`radar-label absolute font-mono-radar text-[9px] uppercase leading-4 tracking-[.08em] text-muted-foreground transition-colors group-hover:text-foreground group-focus-visible:text-primary sm:text-[10px] ${industry.x < 40 ? 'radar-label--left' : 'radar-label--right'} ${activeId === industry.id ? 'text-primary' : ''}`}>{industry.name}</span>
          </button>
        ))}
        <div className="absolute bottom-[9%] right-[10%] font-mono-radar text-[9px] uppercase tracking-[.15em] text-primary/60">29° 45′ N / 95° 22′ W</div>
      </div>
    </div>
  );
}

function ConnectionResult({ connection, skills, onReset }: { connection: ReturnType<typeof findConnection>; skills: string[]; onReset: () => void }) {
  if (!connection) {
    const themes = findTransferableThemes(skills);
    return (
      <div className="animate-rise rounded-2xl border border-border bg-secondary/35 p-7 md:p-9">
        <p className="font-mono-radar text-[10px] uppercase tracking-[.18em] text-accent">RADAR RESULT</p>
        <h3 data-testid="text-no-connection" className="mt-5 font-display text-4xl font-semibold leading-[.95] tracking-[-.05em] md:text-5xl">NO INDUSTRY CONNECTION ON THIS RADAR</h3>
        <div role="status" aria-live="polite" className="mt-6 rounded-xl border border-accent/25 bg-accent/[.06] p-5">
          <p className="font-mono-radar text-[10px] uppercase tracking-[.16em] text-accent">NO CLEAR MATCH IN THE SIX INDUSTRIES SHOWN</p>
          <p className="mt-3 max-w-[540px] text-sm leading-6 text-muted-foreground">Your current skills don’t show a clear connection to an industry on this radar. That doesn’t mean your experience has no value; it may connect to fields beyond the six shown here.</p>
        </div>
        {themes.length > 0 && (
          <div className="mt-5 rounded-xl border border-primary/20 bg-primary/[.035] p-5">
            <span className="font-mono-radar text-[10px] uppercase tracking-[.16em] text-primary">TRANSFERABLE SKILL THEMES</span>
            <div className="mt-3 flex flex-wrap gap-2">
              {themes.map((theme) => (
                <span key={theme} className="rounded-full border border-primary/25 px-3 py-1.5 font-mono-radar text-[9px] uppercase tracking-[.12em] text-foreground">{theme}</span>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">These are broader strengths in your input, not a match to a specific industry on this radar.</p>
          </div>
        )}
        <HoustonEmploymentCard />
        <div className="mt-5 border-t border-border pt-4">
          <span className="font-mono-radar text-[10px] uppercase tracking-[.18em] text-muted-foreground">YOUR INPUT</span>
          <p data-testid="text-your-input" className="mt-2 text-sm leading-6 text-foreground">{skills.join(' • ')}</p>
        </div>
        <button type="button" data-testid="button-try-different-skills" onClick={onReset} className="mt-7 inline-flex items-center gap-3 rounded-lg border border-primary px-5 py-3 font-mono-radar text-[10px] font-semibold uppercase tracking-[.16em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
          TRY DIFFERENT SKILLS <RotateCcw size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="animate-rise rounded-2xl border border-primary/35 bg-primary/[.055] p-7 md:p-9">
      <p className="font-mono-radar text-[10px] uppercase tracking-[.18em] text-primary">CONNECTION FOUND</p>
      <div className="mt-6 grid gap-7 sm:grid-cols-[1fr_.75fr]">
        <div>
          <span className="font-mono-radar text-[10px] uppercase tracking-[.18em] text-muted-foreground">STRONGEST CONNECTION</span>
          <h3 data-testid="text-connection-industry" className="mt-2 font-display text-4xl font-semibold leading-[.9] tracking-[-.055em] md:text-5xl">{connection.industry.name}</h3>
        </div>
        <div>
          <span className="font-mono-radar text-[10px] uppercase tracking-[.18em] text-muted-foreground">CONNECTION STRENGTH</span>
          <p data-testid="text-connection-strength" className="mt-2 font-display text-2xl text-primary">{connection.strength}</p>
        </div>
      </div>
        <div className="mt-8 rounded-xl border border-primary/20 bg-background/40 p-5">
          <span className="font-mono-radar text-[10px] uppercase tracking-[.18em] text-primary">WHY THESE SKILLS CAN CONNECT</span>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Skills connected to this industry">
            {connection.matchedSkills.map((skill) => (
              <span key={skill} className="rounded-full border border-primary/25 px-3 py-1.5 text-sm text-foreground">{skill}</span>
            ))}
          </div>
          <p className="mt-4 max-w-[640px] text-sm leading-6 text-muted-foreground">{connection.industry.connectionExplanation}</p>
        </div>
        <div role="note" className="mt-4 rounded-xl border border-border bg-background/35 p-5">
          <span className="font-mono-radar text-[10px] uppercase tracking-[.16em] text-muted-foreground">CHECK THE ROLE’S REQUIREMENTS</span>
          <p className="mt-3 text-sm leading-6 text-foreground">{connection.industry.additionalRequirements}</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">A skills overlap is not a qualification check. Review the specific job posting for required experience, licenses, certifications, training, or tools.</p>
        </div>
        <div className="mt-8 border-t border-primary/15 pt-5">
        <span className="font-mono-radar text-[10px] uppercase tracking-[.18em] text-muted-foreground">YOUR INPUT</span>
        <p data-testid="text-your-input" className="mt-2 text-sm leading-6 text-foreground">{skills.join(' • ')}</p>
      </div>
        <HoustonEmploymentCard industryId={connection.industry.id} />
      <button type="button" data-testid="button-scan-again" onClick={onReset} className="mt-8 inline-flex items-center gap-3 rounded-lg border border-primary px-5 py-3 font-mono-radar text-[10px] font-semibold uppercase tracking-[.16em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
        SCAN AGAIN <RotateCcw size={14} />
      </button>
    </div>
  );
}

function HoustonEmploymentCard({ industryId }: { industryId?: string }) {
  const { data, isLoading, isError } = useGetHoustonEmploymentTrend();
  const industryTrend = data?.industries.find(
    (industry) => industry.radarIndustryId === industryId,
  );

  return (
    <section
      data-testid="card-bls-employment"
      aria-label="Houston employment trends from BLS"
      className="mt-5 rounded-xl border border-border bg-background/45 p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono-radar text-[9px] uppercase tracking-[.17em] text-primary">PUBLIC DATA · BLS CES</p>
          {industryTrend ? (
            <>
              <p data-testid="text-bls-category" className="mt-2 font-display text-2xl tracking-[-.035em] text-foreground">{industryTrend.category}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{industryTrend.radarIndustryName} · {industryTrend.naics} · {industryTrend.seriesId}</p>
            </>
          ) : industryId ? (
            <>
              <p className="mt-2 font-display text-2xl tracking-[-.035em] text-foreground">No direct industry-series match</p>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">{DEMO_INDUSTRIES.find((industry) => industry.id === industryId)?.name} has no defensible match among the Houston CES categories shown here.</p>
            </>
          ) : (
            <>
              <p className="mt-2 font-display text-2xl tracking-[-.035em] text-foreground">No industry match for this scan</p>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">The metro-wide figure below is context only and is not a sector fit.</p>
            </>
          )}
        </div>
        {isLoading ? (
          <p role="status" className="font-mono-radar text-[10px] uppercase tracking-[.12em] text-muted-foreground">Loading latest monthly data…</p>
        ) : isError || !data ? (
          <p role="status" className="max-w-[250px] text-sm leading-5 text-muted-foreground">BLS employment data is temporarily unavailable.</p>
        ) : industryTrend ? (
          <div className="sm:text-right">
            <p data-testid="text-bls-change" className="font-display text-3xl font-semibold tracking-[-.04em] text-primary">{formatPercentChange(industryTrend.trend.changePercent)}</p>
            <p className="font-mono-radar text-[10px] uppercase tracking-[.12em] text-muted-foreground">year over year</p>
          </div>
        ) : data ? (
          <div className="sm:text-right">
            <p className="font-display text-3xl font-semibold tracking-[-.04em] text-muted-foreground">{formatPercentChange(data.metro.trend.changePercent)}</p>
            <p className="font-mono-radar text-[10px] uppercase tracking-[.12em] text-muted-foreground">metro-wide context</p>
          </div>
        ) : null}
      </div>
      {industryTrend && (
        <>
          <p data-testid="text-bls-period" className="mt-3 text-sm leading-5 text-foreground">
            {formatEmployment(industryTrend.trend.employmentThousands)} payroll jobs in {industryTrend.trend.period}
            {industryTrend.trend.preliminary ? ' · preliminary' : ''}; {formatJobsChange(industryTrend.trend.changeThousands)} vs {industryTrend.trend.comparisonPeriod}.
          </p>
          <div className="mt-3 flex flex-col gap-2 border-t border-border/70 pt-3 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-start sm:justify-between sm:gap-5">
            <a
              href={industryTrend.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-primary underline-offset-4 hover:underline"
            >
              Source: {industryTrend.sourceName}
            </a>
            <p>{industryTrend.limitation}</p>
          </div>
        </>
      )}
      {data && (
        <div className="mt-4 flex flex-col gap-1 border-t border-border/70 pt-3 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-start sm:justify-between sm:gap-5">
          <p>
            Metro-wide context only · {formatPercentChange(data.metro.trend.changePercent)} year over year
            ({data.metro.trend.period} vs {data.metro.trend.comparisonPeriod})
          </p>
          <a
            href={data.metro.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-primary underline-offset-4 hover:underline"
          >
            {data.metro.sourceName} · {data.metro.seriesId}
          </a>
        </div>
      )}
    </section>
  );
}

function formatPercentChange(value: number) {
  if (value > 0) return `+${value.toFixed(1)}%`;
  if (value < 0) return `${value.toFixed(1)}%`;
  return '0.0%';
}

function formatEmployment(thousands: number) {
  return thousands >= 1000
    ? `${(thousands / 1000).toFixed(2)}M`
    : `${thousands.toFixed(1)}K`;
}

function formatJobsChange(thousands: number) {
  const prefix = thousands > 0 ? '+' : thousands < 0 ? '−' : '';
  return `${prefix}${Math.abs(thousands).toFixed(1)}K jobs`;
}

function StatusKey({ status }: { status: SignalStatus }) {
  return <span className={`flex items-center gap-2 ${statusTextColor(status)}`}><i className="h-1.5 w-1.5 rounded-full bg-current" />{status}</span>;
}

function statusTextColor(status: SignalStatus) {
  return status === 'Growing' ? 'text-primary' : status === 'Steady' ? 'text-accent' : 'text-[#ca8df0]';
}

export default App;
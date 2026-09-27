import { useEffect, useState, type FormEvent } from 'react';
import { useCreateFollow } from '@workspace/api-client-react';
import { DEMO_INDUSTRIES, type DemoIndustryId } from '@/data/demoRadar';

export default function SectorUpdatesOptIn({
  preferredIndustryId,
}: {
  preferredIndustryId?: DemoIndustryId;
}) {
  const followMutation = useCreateFollow();
  const [sectorId, setSectorId] = useState(preferredIndustryId ?? '');
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);

  useEffect(() => setSectorId(preferredIndustryId ?? ''), [preferredIndustryId]);

  const selectedSector = DEMO_INDUSTRIES.find((sector) => sector.id === sectorId);

  const submitOptIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
      if (!emailOptIn || !selectedSector || !email.trim()) return;

    setMessage('');
    setMessageIsError(false);
    try {
      const result = await followMutation.mutateAsync({
        data: {
          sectorId: selectedSector.id,
          email: email.trim(),
          consent: true,
        },
      });
      if (result.confirmationEmailStatus === 'failed') {
        setMessage(
          result.already
            ? `Email updates about ${selectedSector.name} are already active, but we could not send the confirmation email.`
            : `Your opt-in for ${selectedSector.name} was saved, but we could not send the confirmation email. Updates about this sector will be emailed when available.`,
        );
        setMessageIsError(true);
      } else {
        setMessage(
          result.already
            ? `Email updates about ${selectedSector.name} are already active.`
            : result.confirmationEmailStatus === 'sent'
              ? `You opted in to Houston Workforce Radar email updates about ${selectedSector.name} only. A confirmation email has been sent.`
              : `You opted in to Houston Workforce Radar email updates about ${selectedSector.name} only. Confirmation emails are not sent from this preview environment.`,
        );
      }
      setEmail('');
      setEmailOptIn(false);
    } catch {
      setMessage('We could not save that preference. Please try again later.');
      setMessageIsError(true);
    }
  };

  return (
    <section aria-labelledby="sector-updates-heading" className="border-b border-border/80 bg-secondary/20">
      <div className="mx-auto grid max-w-[1320px] gap-8 px-5 py-12 md:grid-cols-[.7fr_1.3fr] md:px-10 md:py-16">
        <div>
          <div className="mb-4 flex items-center gap-3 font-mono-radar text-[10px] uppercase tracking-[.2em] text-primary">
            <span className="h-px w-8 bg-primary" />
            Optional email updates
          </div>
          <h2 id="sector-updates-heading" className="font-display text-4xl font-semibold leading-[.92] tracking-[-.06em] md:text-5xl">
            FOLLOW A SECTOR
          </h2>
          <p className="mt-4 max-w-[420px] text-sm leading-6 text-muted-foreground">
            Choose an industry, then opt in to receive Houston Workforce Radar email updates about that sector.
          </p>
        </div>

        <form onSubmit={submitOptIn} className="rounded-2xl border border-border bg-background/70 p-5 md:p-7">
          <label htmlFor="follow-sector" className="mb-2 block font-mono-radar text-[10px] uppercase tracking-[.16em] text-muted-foreground">
            Choose an industry on the radar
          </label>
          <>
              <select
                id="follow-sector"
                data-testid="select-follow-sector"
                value={selectedSector?.id ?? ''}
                onChange={(event) => {
                  setSectorId(event.target.value);
                  setMessage('');
                }}
                required
                className="h-12 w-full rounded-lg border border-border bg-secondary/45 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                <option value="" disabled>Select an industry</option>
                {DEMO_INDUSTRIES.map((sector) => (
                  <option key={sector.id} value={sector.id}>
                    {sector.name}
                  </option>
                ))}
              </select>

              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-border/80 bg-secondary/25 p-4">
                <input
                  data-testid="checkbox-email-opt-in"
                  type="checkbox"
                  checked={emailOptIn}
                  onChange={(event) => {
                    setEmailOptIn(event.target.checked);
                    setMessage('');
                    if (!event.target.checked) setEmail('');
                  }}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">Email me Houston Workforce Radar updates about this sector</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    By checking this box and submitting your email, you opt in to marketing emails about the sector you select only. You can unsubscribe at any time.
                  </span>
                </span>
              </label>

              {emailOptIn && (
                <div className="mt-4">
                  <label htmlFor="follow-email" className="mb-2 block font-mono-radar text-[10px] uppercase tracking-[.16em] text-muted-foreground">
                    Email address
                  </label>
                  <input
                    id="follow-email"
                    data-testid="input-follow-email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="h-12 w-full rounded-lg border border-border bg-secondary/45 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </div>
              )}

              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Your selected sector and follow preference—not your email address—are used for workforce research. Your email address is used only to send Houston Workforce Radar updates about the sector you select, not for research or other marketing.
              </p>

              {emailOptIn && (
                <button
                  type="submit"
                  data-testid="button-save-email-opt-in"
                  disabled={!selectedSector || !email.trim() || followMutation.isPending}
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-primary px-4 font-mono-radar text-[10px] font-semibold uppercase tracking-[.15em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {followMutation.isPending ? 'Saving preference…' : 'Opt in to updates about this sector'}
                </button>
              )}
          </>

          {message && (
            <p role={messageIsError ? 'alert' : 'status'} aria-live="polite" className={`mt-4 text-sm leading-5 ${messageIsError ? 'text-destructive' : 'text-primary'}`}>
              {message}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
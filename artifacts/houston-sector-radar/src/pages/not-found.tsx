import { Link } from 'wouter';

export default function NotFound() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-background px-6 text-foreground">
      <div className="max-w-md text-center">
        <p className="font-mono-radar text-[10px] uppercase tracking-[.18em] text-primary">Houston Workforce Radar</p>
        <h1 className="mt-5 font-display text-5xl tracking-[-.06em]">Signal not found.</h1>
        <Link href="/" data-testid="link-return-radar" className="mt-8 inline-flex rounded-lg border border-primary px-5 py-3 font-mono-radar text-[10px] uppercase tracking-[.16em] text-primary">
          Return to radar
        </Link>
      </div>
    </main>
  );
}
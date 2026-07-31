import { useNavigate } from 'react-router';
import { setPendingFile } from '@/lib/pending-file';
import { nav } from '@/copy/marketing';
import { MarketingNav } from './sections/MarketingNav';
import { Hero } from './sections/Hero';
import { Problem } from './sections/Problem';
import { HowItWorks } from './sections/HowItWorks';
import { Output } from './sections/Output';
import { Grounding } from './sections/Grounding';
import { Privacy } from './sections/Privacy';
import { Closing } from './sections/Closing';
import '@/styles/marketing.css';

/*
 * Always dark, regardless of the app's theme. One ground means the contrast of the marketing
 * palette is verified once rather than twice.
 */
export default function MarketingPage() {
  const navigate = useNavigate();

  function handleFile(file: File) {
    setPendingFile(file);
    void navigate('/app/parse');
  }

  return (
    <div className="min-h-dvh bg-ink text-ink-fg">
      <a href="#main" className="skip-link">
        {nav.skipToContent}
      </a>

      <MarketingNav />

      <main id="main" tabIndex={-1}>
        <Hero onFile={handleFile} />
        <Problem />
        <HowItWorks />
        <Output />
        <Grounding />
        <Privacy />
        <Closing onFile={handleFile} />
      </main>

      <footer className="border-t border-ink-line/70 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 text-sm text-ink-muted sm:px-8">
          <p>ScholarForge AI</p>
          <p>Free forever. Google sign-in required.</p>
        </div>
      </footer>
    </div>
  );
}

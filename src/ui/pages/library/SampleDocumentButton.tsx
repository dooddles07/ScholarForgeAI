import { useState } from 'react';
import { useNavigate } from 'react-router';
import { BookOpen } from 'lucide-react';
import { Button } from '@/ui/components/primitives/Button';
import { useLoadSample } from '@/hooks/use-load-sample';

/*
 * Explicitly opt-in, and labelled as a sample. The empty state itself stays honest: no fake
 * documents appear as though the user put them there.
 */
export function SampleDocumentButton({ className }: { className?: string }) {
  const navigate = useNavigate();
  const loadSample = useLoadSample();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const id = await loadSample();
    void navigate(`/app/doc/${id}`);
  }

  return (
    <div className={className}>
      <Button variant="secondary" onClick={handleClick} disabled={loading}>
        <BookOpen aria-hidden />
        {loading ? 'Loading the sample' : 'Try it with a sample document'}
      </Button>
      <p className="mt-2 text-sm text-fg-muted">
        A short set of biology lecture notes, if you want a look around before uploading your own.
      </p>
    </div>
  );
}

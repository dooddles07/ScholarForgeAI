import { Link, useParams } from 'react-router';
import { useDocument } from '@/hooks/use-documents';
import { useAppearance } from '@/hooks/use-settings';
import { useDeckCards, useGenerateDeck } from '@/hooks/use-deck';
import { PageHeader } from '@/ui/components/PageHeader';
import { ReviewSession } from '@/ui/components/ReviewSession';
import { Button } from '@/ui/components/primitives/Button';
import { documentHub, generation, results } from '@/copy/labels';
import { emptyStates } from '@/copy/empty-states';

export default function FlashcardsPage() {
  useAppearance();
  const { id } = useParams();
  const doc = useDocument(id);
  const cards = useDeckCards(id);
  const { generate, generating } = useGenerateDeck();

  if (!doc || cards === undefined) return null;

  const backTo = `/app/doc/${doc.id}`;

  return (
    <>
      <PageHeader title={documentHub.flashcards} meta={doc.title} backTo={backTo} />

      <div className="px-4 pt-6 md:px-8">
        {cards.length === 0 ? (
          <div className="mx-auto max-w-md text-center">
            <p className="text-base text-fg-muted">{emptyStates.flashcards.body}</p>
            <Button className="mt-5" disabled={generating} onClick={() => void generate(doc)}>
              {generating ? generation.cards : 'Make cards from this document'}
            </Button>
          </div>
        ) : (
          <ReviewSession
            cards={cards}
            doneAction={
              <Link to={backTo} className="text-base text-accent underline">
                {results.backToDocument}
              </Link>
            }
          />
        )}
      </div>
    </>
  );
}

import { useState } from 'react';
import { useParams } from 'react-router';
import { SendHorizontal } from 'lucide-react';
import type { ChatMessage } from '@/domain/types';
import { useDocument } from '@/hooks/use-documents';
import { useAppearance } from '@/hooks/use-settings';
import { useAskDocument } from '@/hooks/use-generation';
import { PageHeader } from '@/ui/components/PageHeader';
import { Button } from '@/ui/components/primitives/Button';
import { chat } from '@/copy/labels';
import { emptyStates } from '@/copy/empty-states';
import { useSaveAnswerAsCard } from '@/hooks/use-save-answer';
import { ChatTurn } from './ChatTurn';

export default function ChatPage() {
  useAppearance();
  const { id } = useParams();
  const doc = useDocument(id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const saveAnswerAsCard = useSaveAnswerAsCard();
  const askDocument = useAskDocument();

  if (!doc) return null;

  async function ask() {
    const question = draft.trim();
    if (!question || !doc) return;

    setDraft('');
    setMessages((prev) => [
      ...prev,
      { id: `m-${Date.now()}`, role: 'user', content: question, citations: [], createdAt: Date.now() },
    ]);
    setThinking(true);

    const reply = await askDocument(doc, question);
    setThinking(false);

    /* Says so rather than answering from general knowledge. */
    setMessages((prev) => [...prev, { ...reply, content: reply.content || chat.notFound }]);
  }

  return (
    <>
      <PageHeader title={chat.heading(doc.title)} backTo={`/app/doc/${doc.id}`} />

      <div className="px-4 pt-6 pb-44 md:px-8 lg:pb-32">
        <div className="mx-auto max-w-2xl">
          {messages.length === 0 && (
            <p className="text-base text-fg-muted">{emptyStates.chat.body}</p>
          )}

          <div className="space-y-6">
            {messages.map((message, i) => (
              <ChatTurn
                key={message.id}
                message={message}
                onSaveCard={(m) => saveAnswerAsCard(doc, messages[i - 1]?.content ?? m.content, m)}
              />
            ))}
          </div>

          {thinking && (
            <p aria-live="polite" className="mt-6 text-base text-fg-muted">
              {chat.thinking}
            </p>
          )}
        </div>
      </div>

      {/* Bottom-anchored. On a phone the on-screen keyboard pushes this up rather than covering it. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
        className="fixed inset-x-0 bottom-16 z-30 border-t border-line bg-bg px-4 py-3 pb-safe lg:bottom-0 lg:pl-64 lg:pr-8"
      >
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            {chat.placeholder}
          </label>
          <input
            id="chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={chat.placeholder}
            autoComplete="off"
            className="min-h-12 flex-1 rounded-md border border-line bg-surface px-4 text-base text-fg placeholder:text-fg-subtle"
          />
          <Button type="submit" size="icon" aria-label={chat.send} disabled={!draft.trim()}>
            <SendHorizontal aria-hidden />
          </Button>
        </div>
      </form>
    </>
  );
}

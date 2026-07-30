import { useState, type ReactNode } from 'react';
import type { ChatMessage } from '@/domain/types';
import { Citation } from '@/ui/components/Citation';
import { chat } from '@/copy/labels';

/* Inline [p. N] markers become real citations rather than staying as literal brackets. */
function withCitations(content: string): ReactNode[] {
  return content.split(/(\[p\.\s*\d+\])/g).map((part, i) => {
    const match = /^\[p\.\s*(\d+)\]$/.exec(part);
    if (!match?.[1]) return part;
    return (
      <span
        key={`${part}-${i}`}
        className="mx-0.5 rounded-sm bg-mark-soft px-1.5 py-0.5 font-mono text-sm tabular text-mark-text"
      >
        {chat.citation(Number(match[1]))}
      </span>
    );
  });
}

interface ChatTurnProps {
  message: ChatMessage;
  onSaveCard: (message: ChatMessage) => Promise<void>;
}

export function ChatTurn({ message, onSaveCard }: ChatTurnProps) {
  const [saved, setSaved] = useState(false);

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-lg rounded-br-sm bg-accent-soft px-4 py-3 text-base text-fg">
          {message.content}
        </p>
      </div>
    );
  }

  return (
    <div className="motion-enter">
      <p className="measure text-base leading-relaxed text-fg">{withCitations(message.content)}</p>

      {message.citations.length > 0 && (
        <div className="mt-4 space-y-3">
          {message.citations.map((citation) => (
            <Citation
              key={citation.chunkId}
              pageStart={citation.pageStart}
              pageEnd={citation.pageEnd}
              quote={citation.quote}
            />
          ))}

          <button
            type="button"
            onClick={() => void onSaveCard(message).then(() => setSaved(true))}
            disabled={saved}
            className="min-h-11 text-base text-accent underline disabled:text-fg-muted disabled:no-underline"
          >
            <span
              key={saved ? 'saved' : 'save'}
              className="motion-enter inline-block"
              style={{ animationDuration: 'var(--duration-fast)' }}
            >
              {saved ? chat.saved : chat.saveAsCard}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

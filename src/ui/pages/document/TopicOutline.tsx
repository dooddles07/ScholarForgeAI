import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { OutlineNode } from '@/domain/types';
import { cn } from '@/lib/utils';
import { documentHub } from '@/copy/labels';

interface TopicOutlineProps {
  nodes: OutlineNode[];
  hasRealOutline: boolean;
  className?: string;
}

export function TopicOutline({ nodes, hasRealOutline, className }: TopicOutlineProps) {
  if (nodes.length === 0) return null;

  return (
    <section className={className}>
      <h2 className="text-lg font-semibold text-fg">
        {hasRealOutline ? documentHub.topics : documentHub.pageRange}
      </h2>

      {/* When outline detection found nothing, say why rather than showing an empty list. */}
      {!hasRealOutline && (
        <p className="mt-1.5 max-w-[62ch] text-sm text-fg-muted">{documentHub.noOutline}</p>
      )}

      <ul className="mt-4 divide-y divide-line border-y border-line">
        {nodes.map((node) => (
          <OutlineRow key={node.id} node={node} depth={0} />
        ))}
      </ul>
    </section>
  );
}

function OutlineRow({ node, depth }: { node: OutlineNode; depth: number }) {
  const [open, setOpen] = useState(false);
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div className="flex items-center">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex min-h-11 flex-1 items-center gap-2 py-2 pr-3 text-left text-base text-fg"
            style={{ paddingLeft: `${depth * 1.25}rem` }}
          >
            <ChevronRight
              aria-hidden
              className={cn(
                'size-4 shrink-0 text-fg-subtle transition-transform duration-[--duration-fast]',
                open && 'rotate-90',
              )}
            />
            <span className="flex-1">{node.title}</span>
            <span className="font-mono text-xs tabular text-fg-muted">p. {node.pageStart}</span>
          </button>
        ) : (
          <div
            className="flex min-h-11 flex-1 items-center gap-2 py-2 pr-3 text-base text-fg"
            style={{ paddingLeft: `${depth * 1.25 + 1.5}rem` }}
          >
            <span className="flex-1">{node.title}</span>
            <span className="font-mono text-xs tabular text-fg-muted">p. {node.pageStart}</span>
          </div>
        )}
      </div>

      {hasChildren && open && (
        <ul className="divide-y divide-line border-t border-line">
          {node.children.map((child) => (
            <OutlineRow key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

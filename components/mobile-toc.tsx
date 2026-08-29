'use client';

import { BookOpenText, ChevronDown } from 'lucide-react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export type TocItem = {
  id: string;
  label: string;
  level: number;
};

export function MobileToc({ items }: { items: TocItem[] }) {
  if (!items.length) return null;

  return (
    <Collapsible className="mobile-toc">
      <CollapsibleTrigger className="mobile-toc-trigger">
        <span>
          <BookOpenText aria-hidden="true" />
          이 글의 목차
        </span>
        <ChevronDown aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mobile-toc-panel">
        <nav aria-label="모바일 글 목차">
          {items.map((item) => (
            <a
              key={item.id}
              className={item.level === 4 ? 'toc-subitem' : undefined}
              href={`#${item.id}`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </CollapsibleContent>
    </Collapsible>
  );
}

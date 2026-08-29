'use client';

import { ChevronDown } from 'lucide-react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { TocItem } from '@/lib/content/schema';

function TocTree({ items, label }: { items: TocItem[]; label: string }) {
  return (
    <ol aria-label={label}>
      {items.map((item) => (
        <li key={item.id}>
          <a href={`#${item.id}`}>
            <span className="toc-number" aria-hidden="true">
              {item.number}
            </span>
            <span>{item.label}</span>
          </a>
          {item.children.length ? (
            <TocTree items={item.children} label={`${item.label} 하위 목차`} />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function ArticleToc({ items }: { items: TocItem[] }) {
  if (!items.length) return null;

  return (
    <>
      <aside className="desktop-toc">
        <p>목차</p>
        <nav aria-label="글 목차">
          <TocTree items={items} label="글 목차 항목" />
        </nav>
      </aside>

      <Collapsible className="mobile-toc">
        <CollapsibleTrigger className="mobile-toc-trigger">
          <span>목차</span>
          <ChevronDown aria-hidden="true" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mobile-toc-panel">
          <nav aria-label="모바일 글 목차">
            <TocTree items={items} label="모바일 글 목차 항목" />
          </nav>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}

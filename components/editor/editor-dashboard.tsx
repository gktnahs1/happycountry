'use client';

/* oxlint-disable next/no-html-link-for-pages -- Native navigation avoids vinext client interception. */

import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { ArticleStatus, EditorArticleSummary } from '@/lib/editor/types';

export function EditorDashboard({
  initialArticles,
  displayName,
}: {
  initialArticles: EditorArticleSummary[];
  displayName: string;
}) {
  const [filter, setFilter] = useState<'all' | ArticleStatus>('all');
  const [creating, setCreating] = useState(false);
  const articles = useMemo(
    () => initialArticles.filter((article) => filter === 'all' || article.status === filter),
    [filter, initialArticles],
  );

  async function createNewArticle() {
    setCreating(true);
    try {
      const response = await fetch('/api/editor/articles', { method: 'POST' });
      const payload = (await response.json()) as { article?: { id: string }; error?: string };
      if (!response.ok || !payload.article) throw new Error(payload.error ?? '새 글을 만들지 못했습니다.');
      window.location.href = `/editor/articles/${payload.article.id}`;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error));
      setCreating(false);
    }
  }

  return (
    <main className="editor-app">
      <header className="editor-topbar">
        <a href="/" className="editor-wordmark">HappyCountry</a>
        <div className="editor-account">
          <span>{displayName}</span>
          <a href="/signout-with-chatgpt?return_to=/">로그아웃</a>
        </div>
      </header>
      <section className="editor-dashboard">
        <div className="editor-dashboard-heading">
          <div><p>글 관리</p><h1>에세이</h1></div>
          <button className="editor-primary-button" type="button" onClick={createNewArticle} disabled={creating}>
            <Plus aria-hidden="true" /> {creating ? '만드는 중' : '새 글'}
          </button>
        </div>
        <nav className="editor-status-tabs" aria-label="글 상태">
          {([
            ['all', '전체'],
            ['draft', '초안'],
            ['published', '발행'],
            ['archived', '보관'],
          ] as const).map(([value, label]) => (
            <button type="button" data-active={filter === value || undefined} onClick={() => setFilter(value)} key={value}>
              {label}
            </button>
          ))}
        </nav>
        <div className="editor-article-list">
          {articles.map((article) => (
            <a href={`/editor/articles/${article.id}`} key={article.id}>
              <span className="editor-status">{statusLabel(article.status)}</span>
              <strong>{article.title}</strong>
              <span>{new Date(article.updatedAt).toLocaleString('ko-KR')}</span>
            </a>
          ))}
          {!articles.length ? <p className="editor-empty">해당 상태의 글이 없습니다.</p> : null}
        </div>
      </section>
    </main>
  );
}

function statusLabel(status: ArticleStatus) {
  return status === 'published' ? '발행' : status === 'archived' ? '보관' : '초안';
}

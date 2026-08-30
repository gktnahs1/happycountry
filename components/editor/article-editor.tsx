'use client';

/* oxlint-disable next/no-html-link-for-pages jsx-a11y/prefer-tag-over-role react/react-compiler -- Vinext needs native navigation; the editor uses a controlled modal surface. */

import { diffLines } from 'diff';
import {
  Archive,
  Bold,
  Code2,
  Columns2,
  Heading2,
  Heading3,
  Heading4,
  Image as ImageIcon,
  Link,
  List,
  Save,
  Send,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ArticleDocumentRenderer } from '@/components/article/article-document';
import type {
  ArticleDraftInput,
  AssetRecord,
  EditorArticle,
  EditorRevision,
  ValidationIssue,
} from '@/lib/editor/types';

type ApiPayload = { article?: EditorArticle; error?: string };

export function ArticleEditor({
  initialArticle,
  initialAssets,
  displayName,
}: {
  initialArticle: EditorArticle;
  initialAssets: AssetRecord[];
  displayName: string;
}) {
  const [article, setArticle] = useState(initialArticle);
  const [draft, setDraft] = useState<ArticleDraftInput>(initialArticle.draft);
  const [preview, setPreview] = useState(initialArticle.draft.compiled);
  const [issues, setIssues] = useState<ValidationIssue[]>(initialArticle.draft.validationIssues);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [mobilePane, setMobilePane] = useState<'edit' | 'preview'>('edit');
  const [showHistory, setShowHistory] = useState(false);
  const [selectedRevisionId, setSelectedRevisionId] = useState(initialArticle.draftRevisionId);
  const [assets, setAssets] = useState(initialAssets);
  const [showAssets, setShowAssets] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);
  const [assetAlt, setAssetAlt] = useState('');
  const [assetCaption, setAssetCaption] = useState('');
  const [assetWidth, setAssetWidth] = useState<'body' | 'wide' | 'full'>('body');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const updateDraft = useCallback(<K extends keyof ArticleDraftInput>(key: K, value: ArticleDraftInput[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setNotice('');
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/editor/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        });
        const payload = (await response.json()) as {
          compiled?: EditorRevision['compiled'];
          issues?: ValidationIssue[];
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? '미리보기를 만들지 못했습니다.');
        setPreview(payload.compiled ?? null);
        setIssues(payload.issues ?? []);
      } catch (error) {
        setPreview(null);
        setIssues([{ message: error instanceof Error ? error.message : String(error) }]);
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    const saveShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener('beforeunload', warn);
    window.addEventListener('keydown', saveShortcut);
    return () => {
      window.removeEventListener('beforeunload', warn);
      window.removeEventListener('keydown', saveShortcut);
    };
  });

  async function runAction(payload: Record<string, unknown>, label: string) {
    setBusy(label);
    setNotice('');
    try {
      const response = await fetch(`/api/editor/articles/${article.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as ApiPayload;
      if (!response.ok || !result.article) throw new Error(result.error ?? '요청을 처리하지 못했습니다.');
      setArticle(result.article);
      setDraft(result.article.draft);
      setPreview(result.article.draft.compiled);
      setIssues(result.article.draft.validationIssues);
      setSelectedRevisionId(result.article.draftRevisionId);
      setDirty(false);
      setNotice(`${label} 완료`);
      return result.article;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (busy) return;
    await runAction(
      { action: 'save', baseRevisionId: article.draftRevisionId, input: draft },
      '저장',
    );
  }

  async function publish() {
    if (dirty || issues.length || busy) return;
    await runAction(
      { action: 'publish', baseRevisionId: article.draftRevisionId },
      '발행',
    );
  }

  async function archive() {
    if (dirty || busy) return;
    if (!window.confirm('공개 목록과 글 URL에서 이 글을 내릴까요?')) return;
    await runAction(
      { action: 'archive', baseRevisionId: article.draftRevisionId },
      '보관',
    );
  }

  async function restore(revisionId: string) {
    if (dirty || busy) return;
    await runAction(
      { action: 'restore', baseRevisionId: article.draftRevisionId, revisionId },
      '복원',
    );
  }

  function insertMarkdown(before: string, after = '', placeholder = '') {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = draft.body.slice(start, end) || placeholder;
    const nextBody = `${draft.body.slice(0, start)}${before}${selected}${after}${draft.body.slice(end)}`;
    updateDraft('body', nextBody);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  async function uploadAsset(file: File) {
    setBusy('업로드');
    const form = new FormData();
    form.append('file', file);
    try {
      const response = await fetch('/api/editor/assets', { method: 'POST', body: form });
      const responseText = await response.text();
      const payload = responseText.startsWith('{')
        ? (JSON.parse(responseText) as { asset?: AssetRecord; error?: string })
        : { error: responseText };
      if (!response.ok || !payload.asset) throw new Error(payload.error ?? '업로드하지 못했습니다.');
      setAssets((current) => [payload.asset!, ...current]);
      setSelectedAsset(payload.asset);
      setNotice('업로드 완료');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  }

  function insertSelectedAsset() {
    if (!selectedAsset || !assetAlt.trim()) return;
    insertMarkdown(
      `\n\n::figure{src="${selectedAsset.url}" alt="${escapeAttribute(assetAlt)}" width="${assetWidth}"${assetCaption.trim() ? ` caption="${escapeAttribute(assetCaption)}"` : ''}}\n\n`,
    );
    setShowAssets(false);
    setSelectedAsset(null);
    setAssetAlt('');
    setAssetCaption('');
  }

  const selectedRevision = article.revisions.find((revision) => revision.id === selectedRevisionId) ?? article.draft;
  const revisionDiff = useMemo(
    () => diffLines(selectedRevision.body, draft.body),
    [draft.body, selectedRevision.body],
  );

  return (
    <main className="editor-app editor-writing-app">
      <header className="editor-topbar editor-writing-topbar">
        <div className="editor-writing-nav">
          <a href="/editor">← 글 목록</a>
          <span className={`editor-state-pill editor-state-${article.status}`}>{statusLabel(article.status)}</span>
        </div>
        <div className="editor-writing-actions">
          {notice ? <output className="editor-notice">{notice}</output> : null}
          <button type="button" onClick={() => setShowHistory((value) => !value)}>버전 {article.revisions.length}</button>
          <button type="button" onClick={archive} disabled={dirty || Boolean(busy)}><Archive /> 보관</button>
          <button type="button" onClick={save} disabled={!dirty || Boolean(busy)}><Save /> {busy === '저장' ? '저장 중' : '저장'}</button>
          <button className="editor-publish-button" type="button" onClick={publish} disabled={dirty || issues.length > 0 || Boolean(busy)}><Send /> 발행</button>
          <span className="editor-user-name">{displayName}</span>
        </div>
      </header>

      <div className="editor-mobile-switch" role="tablist" aria-label="편집 화면">
        <button type="button" data-active={mobilePane === 'edit' || undefined} onClick={() => setMobilePane('edit')}>편집</button>
        <button type="button" data-active={mobilePane === 'preview' || undefined} onClick={() => setMobilePane('preview')}>미리보기</button>
      </div>

      <div className="editor-workspace" data-mobile-pane={mobilePane}>
        <section className="editor-compose-pane" aria-label="글 편집">
          <div className="editor-fields">
            <label>제목<input value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} /></label>
            <label>설명<textarea value={draft.description} onChange={(event) => updateDraft('description', event.target.value)} rows={2} /></label>
            <div className="editor-field-row">
              <label>작성자<input value={draft.author} onChange={(event) => updateDraft('author', event.target.value)} /></label>
              <label>발행일<input type="date" value={draft.publishedAt} onChange={(event) => updateDraft('publishedAt', event.target.value)} /></label>
            </div>
            <div className="editor-field-row">
              <label>Slug<input value={draft.slug} disabled={article.hasPublished} onChange={(event) => updateDraft('slug', event.target.value)} placeholder="essay-slug" /></label>
              <label>태그<input value={draft.tags.join(', ')} onChange={(event) => updateDraft('tags', event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))} placeholder="AI, 비즈니스" /></label>
            </div>
            <div className="editor-cover-field">
              <div><span>대표 이미지</span><small>{draft.cover?.src || '선택되지 않음'}</small></div>
              <button type="button" onClick={() => setShowAssets(true)}><ImageIcon /> 이미지 선택</button>
              {draft.cover ? <button type="button" onClick={() => updateDraft('cover', undefined)}>제거</button> : null}
            </div>
            {draft.cover ? (
              <label>대표 이미지 대체 텍스트<input value={draft.cover.alt} onChange={(event) => updateDraft('cover', { ...draft.cover!, alt: event.target.value })} /></label>
            ) : null}
          </div>

          <div className="editor-markdown-toolbar" aria-label="Markdown 도구">
            <ToolbarButton label="H2" onClick={() => insertMarkdown('\n\n## ', '', '제목')} icon={<Heading2 />} />
            <ToolbarButton label="H3" onClick={() => insertMarkdown('\n\n### ', '', '소제목')} icon={<Heading3 />} />
            <ToolbarButton label="H4" onClick={() => insertMarkdown('\n\n#### ', '', '작은 제목')} icon={<Heading4 />} />
            <ToolbarButton label="굵게" onClick={() => insertMarkdown('**', '**', '강조')} icon={<Bold />} />
            <ToolbarButton label="링크" onClick={() => insertMarkdown('[', '](https://)', '링크')} icon={<Link />} />
            <ToolbarButton label="목록" onClick={() => insertMarkdown('\n- ', '', '항목')} icon={<List />} />
            <ToolbarButton label="코드" onClick={() => insertMarkdown('\n```text\n', '\n```\n', 'code')} icon={<Code2 />} />
            <ToolbarButton label="콜아웃" onClick={() => insertMarkdown('\n:::callout{tone="note" title="메모"}\n', '\n:::\n', '내용')} icon={<Columns2 />} />
            <ToolbarButton label="이미지" onClick={() => setShowAssets(true)} icon={<ImageIcon />} />
          </div>
          <textarea
            ref={textareaRef}
            className="editor-markdown-input"
            value={draft.body}
            onChange={(event) => updateDraft('body', event.target.value)}
            spellCheck={false}
            aria-label="Markdown 본문"
          />
        </section>

        <section className="editor-preview-pane" aria-label="글 미리보기">
          {issues.length ? (
            <div className="editor-validation" role="alert">
              <strong>발행 전에 고쳐야 할 항목</strong>
              <ul>{issues.map((issue, index) => <li key={`${issue.message}-${index}`}>{issue.message}</li>)}</ul>
            </div>
          ) : null}
          {preview ? (
            <article className="editor-preview-article">
              <header><h1>{preview.title}</h1><p>{preview.author} · {preview.displayDate} · 약 {preview.readingMinutes}분</p></header>
              <div className="article-body"><ArticleDocumentRenderer article={preview} /></div>
            </article>
          ) : (
            <div className="editor-preview-empty"><p>유효한 미리보기 없음</p><span>왼쪽의 검증 오류를 수정하면 여기에 실제 글이 나타납니다.</span></div>
          )}
        </section>
      </div>

      {showHistory ? (
        <aside className="editor-side-panel" aria-label="버전 기록">
          <header><div><p>버전 기록</p><strong>{article.revisions.length}개 저장본</strong></div><button type="button" onClick={() => setShowHistory(false)}>닫기</button></header>
          <div className="editor-history-list">
            {article.revisions.map((revision) => (
              <button type="button" data-active={selectedRevisionId === revision.id || undefined} onClick={() => setSelectedRevisionId(revision.id)} key={revision.id}>
                <strong>v{revision.sequence}</strong><span>{new Date(revision.createdAt).toLocaleString('ko-KR')}</span>
              </button>
            ))}
          </div>
          <div className="editor-diff">
            <div className="editor-diff-meta"><strong>v{selectedRevision.sequence}</strong><button type="button" disabled={selectedRevision.id === article.draftRevisionId || dirty || Boolean(busy)} onClick={() => restore(selectedRevision.id)}>이 버전 복원</button></div>
            <pre>{revisionDiff.map((part, index) => <span data-added={part.added || undefined} data-removed={part.removed || undefined} key={index}>{part.value}</span>)}</pre>
          </div>
        </aside>
      ) : null}

      {showAssets ? (
        <div className="editor-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setShowAssets(false); }}>
          <dialog className="editor-asset-modal" open aria-label="이미지 라이브러리">
            <header><div><p>이미지</p><strong>라이브러리</strong></div><button type="button" onClick={() => setShowAssets(false)}>닫기</button></header>
            <label className="editor-upload-button"><Upload /> 새 이미지 업로드<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAsset(file); }} /></label>
            <div className="editor-asset-grid">
              {assets.map((asset) => (
                <button type="button" data-active={selectedAsset?.id === asset.id || undefined} onClick={() => setSelectedAsset(asset)} key={asset.id}>
                  {/* oxlint-disable-next-line next/no-img-element -- R2 and bundled editor thumbnails use stable URLs. */}
                  <img src={asset.url} alt="" /><span>{asset.originalFileName}</span>
                </button>
              ))}
            </div>
            {selectedAsset ? (
              <div className="editor-asset-insert">
                <label>대체 텍스트<input value={assetAlt} onChange={(event) => setAssetAlt(event.target.value)} /></label>
                <label>캡션<input value={assetCaption} onChange={(event) => setAssetCaption(event.target.value)} /></label>
                <label>폭<select value={assetWidth} onChange={(event) => setAssetWidth(event.target.value as typeof assetWidth)}><option value="body">본문</option><option value="wide">넓게</option><option value="full">전체</option></select></label>
                <button type="button" className="editor-primary-button" disabled={!assetAlt.trim()} onClick={insertSelectedAsset}>본문에 삽입</button>
                <button type="button" onClick={() => updateDraft('cover', { src: selectedAsset.url, alt: assetAlt || selectedAsset.originalFileName })}>대표 이미지로 사용</button>
              </div>
            ) : null}
          </dialog>
        </div>
      ) : null}
    </main>
  );
}

function ToolbarButton({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return <button type="button" title={label} aria-label={label} onClick={onClick}>{icon}</button>;
}

function statusLabel(status: EditorArticle['status']) {
  return status === 'published' ? '발행 중' : status === 'archived' ? '보관됨' : '초안';
}

function escapeAttribute(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

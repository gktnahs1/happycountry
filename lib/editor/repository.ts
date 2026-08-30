import type { ArticleDocument } from '@/lib/content/schema';
import { getD1 } from '@/db';

import { compileDraft } from './validation';
import { ensureEditorialSeed } from './seed';
import { revisionMatches, slugChangeAllowed } from './policies';
import type {
  ArticleDraftInput,
  ArticleStatus,
  AssetRecord,
  EditorArticle,
  EditorArticleSummary,
  EditorRevision,
  ValidationIssue,
} from './types';

type ArticleRow = {
  id: string;
  slug: string | null;
  status: ArticleStatus;
  draft_revision_id: string | null;
  published_revision_id: string | null;
  has_published: number;
  created_at: number;
  updated_at: number;
};

type RevisionRow = {
  id: string;
  article_id: string;
  sequence: number;
  title: string;
  description: string;
  author: string;
  published_at: string;
  updated_at: string | null;
  cover_json: string | null;
  tags_json: string;
  body: string;
  compiled_json: string | null;
  validation_json: string;
  created_at: number;
  created_by: string;
};

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function revisionFromRow(row: RevisionRow): EditorRevision {
  return {
    id: row.id,
    sequence: row.sequence,
    slug: '',
    title: row.title,
    description: row.description,
    author: row.author,
    publishedAt: row.published_at,
    ...(row.updated_at ? { updatedAt: row.updated_at } : {}),
    ...(row.cover_json
      ? { cover: parseJson(row.cover_json, undefined) }
      : {}),
    tags: parseJson<string[]>(row.tags_json, []),
    body: row.body,
    compiled: parseJson<ArticleDocument | null>(row.compiled_json, null),
    validationIssues: parseJson<ValidationIssue[]>(row.validation_json, []),
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

function withSlug(revision: EditorRevision, slug: string | null) {
  return { ...revision, slug: slug ?? '' };
}

export async function getPublishedArticles() {
  await ensureEditorialSeed();
  const result = await getD1()
    .prepare(
      `SELECT r.* FROM articles a
       JOIN article_revisions r ON r.id = a.published_revision_id
       WHERE a.status = 'published'
       ORDER BY r.published_at ASC, r.created_at ASC`,
    )
    .all<RevisionRow>();
  return result.results
    .map((row) => parseJson<ArticleDocument | null>(row.compiled_json, null))
    .filter((article): article is ArticleDocument => Boolean(article));
}

export async function getPublishedArticle(slug: string) {
  await ensureEditorialSeed();
  const row = await getD1()
    .prepare(
      `SELECT r.* FROM articles a
       JOIN article_revisions r ON r.id = a.published_revision_id
       WHERE a.status = 'published' AND a.slug = ? LIMIT 1`,
    )
    .bind(slug)
    .first<RevisionRow>();
  return row
    ? parseJson<ArticleDocument | null>(row.compiled_json, null)
    : null;
}

export async function listEditorArticles(): Promise<EditorArticleSummary[]> {
  await ensureEditorialSeed();
  const result = await getD1()
    .prepare(
      `SELECT a.*, r.title, r.published_at
       FROM articles a
       JOIN article_revisions r ON r.id = a.draft_revision_id
       ORDER BY a.updated_at DESC`,
    )
    .all<ArticleRow & { title: string; published_at: string }>();
  return result.results.map((row) => ({
    id: row.id,
    slug: row.slug,
    status: row.status,
    title: row.title || '제목 없는 글',
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    hasPublished: Boolean(row.has_published),
  }));
}

export async function getEditorArticle(id: string): Promise<EditorArticle | null> {
  await ensureEditorialSeed();
  const article = await getD1()
    .prepare('SELECT * FROM articles WHERE id = ? LIMIT 1')
    .bind(id)
    .first<ArticleRow>();
  if (!article?.draft_revision_id) return null;

  const revisions = await getD1()
    .prepare(
      'SELECT * FROM article_revisions WHERE article_id = ? ORDER BY sequence DESC',
    )
    .bind(id)
    .all<RevisionRow>();
  const parsed = revisions.results.map((row) =>
    withSlug(revisionFromRow(row), article.slug),
  );
  const draft = parsed.find((item) => item.id === article.draft_revision_id);
  if (!draft) return null;
  return {
    id: article.id,
    slug: article.slug,
    status: article.status,
    title: draft.title || '제목 없는 글',
    updatedAt: article.updated_at,
    publishedAt: draft.publishedAt,
    hasPublished: Boolean(article.has_published),
    draftRevisionId: article.draft_revision_id,
    publishedRevisionId: article.published_revision_id,
    draft,
    revisions: parsed,
  };
}

export async function createArticle(userId: string) {
  await ensureEditorialSeed();
  const articleId = crypto.randomUUID();
  const revisionId = crypto.randomUUID();
  const now = Date.now();
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const draft: ArticleDraftInput = {
    slug: '',
    title: '',
    description: '',
    author: '이경석',
    publishedAt: today,
    tags: [],
    body: '',
  };
  const { issues } = await compileDraft(draft);
  await getD1().batch([
    getD1()
      .prepare(
        `INSERT INTO articles
         (id, slug, status, draft_revision_id, published_revision_id, has_published, created_at, updated_at)
         VALUES (?, NULL, 'draft', ?, NULL, 0, ?, ?)`,
      )
      .bind(articleId, revisionId, now, now),
    revisionInsert({
      id: revisionId,
      articleId,
      sequence: 1,
      input: draft,
      compiled: null,
      issues,
      createdAt: now,
      createdBy: userId,
    }),
  ]);
  return getEditorArticle(articleId);
}

function revisionInsert(args: {
  id: string;
  articleId: string;
  sequence: number;
  input: ArticleDraftInput;
  compiled: ArticleDocument | null;
  issues: ValidationIssue[];
  createdAt: number;
  createdBy: string;
}) {
  const { input } = args;
  return getD1()
    .prepare(
      `INSERT INTO article_revisions
       (id, article_id, sequence, title, description, author, published_at, updated_at,
        cover_json, tags_json, body, compiled_json, validation_json, created_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      args.id,
      args.articleId,
      args.sequence,
      input.title,
      input.description,
      input.author,
      input.publishedAt,
      input.updatedAt ?? null,
      input.cover ? JSON.stringify(input.cover) : null,
      JSON.stringify(input.tags),
      input.body,
      args.compiled ? JSON.stringify(args.compiled) : null,
      JSON.stringify(args.issues),
      args.createdAt,
      args.createdBy,
    );
}

async function assertBaseRevision(article: ArticleRow | null, baseRevisionId: string) {
  if (!article) throw new RepositoryError(404, '글을 찾을 수 없습니다.');
  if (!revisionMatches(article.draft_revision_id, baseRevisionId)) {
    throw new RepositoryError(409, '다른 탭에서 새 버전이 저장되었습니다.');
  }
}

export async function saveDraft(
  id: string,
  input: ArticleDraftInput,
  baseRevisionId: string,
  userId: string,
) {
  await ensureEditorialSeed();
  const article = await getD1()
    .prepare('SELECT * FROM articles WHERE id = ? LIMIT 1')
    .bind(id)
    .first<ArticleRow>();
  await assertBaseRevision(article, baseRevisionId);
  if (!article) throw new RepositoryError(404, '글을 찾을 수 없습니다.');
  if (!slugChangeAllowed(Boolean(article.has_published), article.slug, input.slug)) {
    throw new RepositoryError(400, '첫 발행 후에는 slug를 변경할 수 없습니다.');
  }
  const slug = input.slug.trim() || null;
  if (slug) {
    const duplicate = await getD1()
      .prepare('SELECT id FROM articles WHERE slug = ? AND id != ? LIMIT 1')
      .bind(slug, id)
      .first<{ id: string }>();
    if (duplicate) throw new RepositoryError(400, '이미 사용 중인 slug입니다.');
  }

  const previous = await getD1()
    .prepare('SELECT sequence FROM article_revisions WHERE id = ? LIMIT 1')
    .bind(baseRevisionId)
    .first<{ sequence: number }>();
  if (!previous) throw new RepositoryError(409, '기준 버전을 찾을 수 없습니다.');
  const { compiled, issues } = await compileDraft({ ...input, slug: slug ?? '' });
  const revisionId = crypto.randomUUID();
  const now = Date.now();
  await getD1().batch([
    revisionInsert({
      id: revisionId,
      articleId: id,
      sequence: previous.sequence + 1,
      input: { ...input, slug: slug ?? '' },
      compiled,
      issues,
      createdAt: now,
      createdBy: userId,
    }),
    getD1()
      .prepare(
        `UPDATE articles SET slug = ?, draft_revision_id = ?, updated_at = ?,
         status = CASE WHEN status = 'archived' THEN 'draft' ELSE status END,
         archived_at = NULL WHERE id = ?`,
      )
      .bind(slug, revisionId, now, id),
  ]);
  return getEditorArticle(id);
}

export async function publishArticle(id: string, baseRevisionId: string) {
  await ensureEditorialSeed();
  const article = await getD1()
    .prepare('SELECT * FROM articles WHERE id = ? LIMIT 1')
    .bind(id)
    .first<ArticleRow>();
  await assertBaseRevision(article, baseRevisionId);
  if (!article?.slug) throw new RepositoryError(400, 'slug가 필요합니다.');
  const revision = await getD1()
    .prepare('SELECT compiled_json, validation_json FROM article_revisions WHERE id = ?')
    .bind(baseRevisionId)
    .first<{ compiled_json: string | null; validation_json: string }>();
  if (!revision?.compiled_json || parseJson<unknown[]>(revision.validation_json, []).length) {
    throw new RepositoryError(400, '검증 오류를 해결한 뒤 발행할 수 있습니다.');
  }
  await getD1()
    .prepare(
      `UPDATE articles SET status = 'published', published_revision_id = ?,
       has_published = 1, archived_at = NULL, updated_at = ? WHERE id = ?`,
    )
    .bind(baseRevisionId, Date.now(), id)
    .run();
  return getEditorArticle(id);
}

export async function archiveArticle(id: string, baseRevisionId: string) {
  await ensureEditorialSeed();
  const article = await getD1()
    .prepare('SELECT * FROM articles WHERE id = ? LIMIT 1')
    .bind(id)
    .first<ArticleRow>();
  await assertBaseRevision(article, baseRevisionId);
  await getD1()
    .prepare(
      `UPDATE articles SET status = 'archived', archived_at = ?, updated_at = ? WHERE id = ?`,
    )
    .bind(Date.now(), Date.now(), id)
    .run();
  return getEditorArticle(id);
}

export async function restoreRevision(
  id: string,
  revisionId: string,
  baseRevisionId: string,
  userId: string,
) {
  await ensureEditorialSeed();
  const article = await getD1()
    .prepare('SELECT * FROM articles WHERE id = ? LIMIT 1')
    .bind(id)
    .first<ArticleRow>();
  await assertBaseRevision(article, baseRevisionId);
  const source = await getD1()
    .prepare('SELECT * FROM article_revisions WHERE id = ? AND article_id = ? LIMIT 1')
    .bind(revisionId, id)
    .first<RevisionRow>();
  if (!source) throw new RepositoryError(404, '복원할 버전을 찾을 수 없습니다.');
  const latest = await getD1()
    .prepare('SELECT MAX(sequence) AS sequence FROM article_revisions WHERE article_id = ?')
    .bind(id)
    .first<{ sequence: number }>();
  const newId = crypto.randomUUID();
  const now = Date.now();
  const restored = withSlug(revisionFromRow(source), article?.slug ?? null);
  await getD1().batch([
    revisionInsert({
      id: newId,
      articleId: id,
      sequence: (latest?.sequence ?? 0) + 1,
      input: restored,
      compiled: restored.compiled,
      issues: restored.validationIssues,
      createdAt: now,
      createdBy: userId,
    }),
    getD1()
      .prepare(
        `UPDATE articles SET draft_revision_id = ?, updated_at = ?,
         status = CASE WHEN status = 'archived' THEN 'draft' ELSE status END,
         archived_at = NULL WHERE id = ?`,
      )
      .bind(newId, now, id),
  ]);
  return getEditorArticle(id);
}

export async function listAssets(): Promise<AssetRecord[]> {
  await ensureEditorialSeed();
  const result = await getD1()
    .prepare('SELECT * FROM assets ORDER BY created_at DESC, original_file_name ASC')
    .all<{
      id: string;
      storage_kind: 'bundled' | 'r2';
      public_path: string | null;
      original_file_name: string;
      content_type: string;
      size_bytes: number;
      created_at: number;
    }>();
  return result.results.map((row) => ({
    id: row.id,
    storageKind: row.storage_kind,
    url: row.storage_kind === 'bundled' ? row.public_path ?? '' : `/media/${row.id}`,
    originalFileName: row.original_file_name,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  }));
}

export async function createAsset(args: {
  id: string;
  r2Key: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  userId: string;
}) {
  await ensureEditorialSeed();
  await getD1()
    .prepare(
      `INSERT INTO assets
       (id, storage_kind, public_path, r2_key, original_file_name, content_type, size_bytes, created_at, created_by)
       VALUES (?, 'r2', NULL, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      args.id,
      args.r2Key,
      args.fileName,
      args.contentType,
      args.sizeBytes,
      Date.now(),
      args.userId,
    )
    .run();
  return { ...args, url: `/media/${args.id}` };
}

export async function getAssetStorage(id: string) {
  await ensureEditorialSeed();
  return getD1()
    .prepare('SELECT r2_key, content_type FROM assets WHERE id = ? AND storage_kind = \'r2\' LIMIT 1')
    .bind(id)
    .first<{ r2_key: string; content_type: string }>();
}

export class RepositoryError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

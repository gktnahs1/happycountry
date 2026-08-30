import { getD1 } from '@/db';
import { articles as bundledArticles } from '@/lib/content/articles';

const SEED_KEY = 'editorial_seed_v1';
let seedPromise: Promise<void> | null = null;

const bundledAssets = [
  ['ai-model-business-cover.jpg', 'image/jpeg', 1313727],
  ['ai-model-business-cover.png', 'image/png', 1313727],
  ['ai-model-cost-cycle.jpg', 'image/jpeg', 935026],
  ['ai-model-cost-cycle.png', 'image/png', 935026],
  ['ai-model-specialization.jpg', 'image/jpeg', 591644],
  ['ai-model-specialization.png', 'image/png', 591644],
  ['ai-model-vertical-integration.jpg', 'image/jpeg', 594972],
  ['ai-model-vertical-integration.png', 'image/png', 594972],
  ['next-platform-cover.png', 'image/png', 2501055],
  ['next-platform-figure.png', 'image/png', 2841950],
] as const;

export async function ensureEditorialSeed() {
  seedPromise ??= seedDatabase();
  return seedPromise;
}

async function seedDatabase() {
  const db = getD1();
  const seeded = await db
    .prepare('SELECT value FROM system_state WHERE key = ? LIMIT 1')
    .bind(SEED_KEY)
    .first<{ value: string }>();
  if (seeded) return;

  const statements: D1PreparedStatement[] = [];
  for (const article of bundledArticles) {
    const articleId = `article_${article.slug.replaceAll('-', '_')}`;
    const revisionId = `${articleId}_revision_1`;
    const createdAt = Date.parse(`${article.publishedAt}T00:00:00+09:00`);
    statements.push(
      db.prepare(
        `INSERT INTO articles
         (id, slug, status, draft_revision_id, published_revision_id, has_published, created_at, updated_at)
         VALUES (?, ?, 'published', ?, ?, 1, ?, ?)`,
      ).bind(
        articleId,
        article.slug,
        revisionId,
        revisionId,
        createdAt,
        createdAt,
      ),
      db.prepare(
        `INSERT INTO article_revisions
         (id, article_id, sequence, title, description, author, published_at, updated_at,
          cover_json, tags_json, body, compiled_json, validation_json, created_at, created_by)
         VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, 'migration')`,
      ).bind(
        revisionId,
        articleId,
        article.title,
        article.description,
        article.author,
        article.publishedAt,
        article.updatedAt ?? null,
        article.cover ? JSON.stringify(article.cover) : null,
        JSON.stringify(article.tags),
        article.source,
        JSON.stringify(article),
        createdAt,
      ),
    );
  }

  for (const [fileName, contentType, sizeBytes] of bundledAssets) {
    const id = `asset_bundled_${fileName.replaceAll(/[^a-z0-9]+/g, '_')}`;
    statements.push(
      db.prepare(
        `INSERT INTO assets
         (id, storage_kind, public_path, r2_key, original_file_name, content_type, size_bytes, created_at, created_by)
         VALUES (?, 'bundled', ?, NULL, ?, ?, ?, 0, 'migration')`,
      ).bind(id, `/images/${fileName}`, fileName, contentType, sizeBytes),
    );
  }

  statements.push(
    db.prepare(
      'INSERT INTO system_state (key, value, updated_at) VALUES (?, ?, ?)',
    ).bind(SEED_KEY, 'complete', Date.now()),
  );
  await db.batch(statements);
}

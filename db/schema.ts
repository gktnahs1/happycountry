import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const articles = sqliteTable(
  'articles',
  {
    id: text('id').primaryKey(),
    slug: text('slug'),
    status: text('status', { enum: ['draft', 'published', 'archived'] })
      .notNull()
      .default('draft'),
    draftRevisionId: text('draft_revision_id'),
    publishedRevisionId: text('published_revision_id'),
    hasPublished: integer('has_published', { mode: 'boolean' })
      .notNull()
      .default(false),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    archivedAt: integer('archived_at'),
  },
  (table) => [
    uniqueIndex('idx_articles_slug').on(table.slug),
    index('idx_articles_status').on(table.status),
  ],
);

export const articleRevisions = sqliteTable(
  'article_revisions',
  {
    id: text('id').primaryKey(),
    articleId: text('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    sequence: integer('sequence').notNull(),
    title: text('title').notNull().default(''),
    description: text('description').notNull().default(''),
    author: text('author').notNull().default(''),
    publishedAt: text('published_at').notNull().default(''),
    updatedAt: text('updated_at'),
    coverJson: text('cover_json'),
    tagsJson: text('tags_json').notNull().default('[]'),
    body: text('body').notNull().default(''),
    compiledJson: text('compiled_json'),
    validationJson: text('validation_json').notNull().default('[]'),
    createdAt: integer('created_at').notNull(),
    createdBy: text('created_by').notNull(),
  },
  (table) => [
    uniqueIndex('idx_article_revisions_sequence').on(
      table.articleId,
      table.sequence,
    ),
    index('idx_article_revisions_article').on(table.articleId),
  ],
);

export const assets = sqliteTable(
  'assets',
  {
    id: text('id').primaryKey(),
    storageKind: text('storage_kind', { enum: ['bundled', 'r2'] }).notNull(),
    publicPath: text('public_path'),
    r2Key: text('r2_key'),
    originalFileName: text('original_file_name').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    createdAt: integer('created_at').notNull(),
    createdBy: text('created_by').notNull(),
  },
  (table) => [uniqueIndex('idx_assets_r2_key').on(table.r2Key)],
);

export const systemState = sqliteTable('system_state', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

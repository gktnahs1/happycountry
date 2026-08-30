import type { ArticleDocument } from '@/lib/content/schema';

export type ArticleStatus = 'draft' | 'published' | 'archived';

export type DraftCover = {
  src: string;
  alt: string;
  caption?: string;
};

export type ArticleDraftInput = {
  slug: string;
  title: string;
  description: string;
  author: string;
  publishedAt: string;
  updatedAt?: string;
  cover?: DraftCover;
  tags: string[];
  body: string;
};

export type ValidationIssue = { message: string };

export type EditorRevision = ArticleDraftInput & {
  id: string;
  sequence: number;
  compiled: ArticleDocument | null;
  validationIssues: ValidationIssue[];
  createdAt: number;
  createdBy: string;
};

export type EditorArticleSummary = {
  id: string;
  slug: string | null;
  status: ArticleStatus;
  title: string;
  updatedAt: number;
  publishedAt: string;
  hasPublished: boolean;
};

export type EditorArticle = EditorArticleSummary & {
  draftRevisionId: string;
  publishedRevisionId: string | null;
  draft: EditorRevision;
  revisions: EditorRevision[];
};

export type AssetRecord = {
  id: string;
  storageKind: 'bundled' | 'r2';
  url: string;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: number;
};

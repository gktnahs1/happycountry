/// <reference types="vite/client" />

import { assertUniqueArticleSlugs, type ArticleDocument } from './schema';

const articleSources = import.meta.glob<ArticleDocument>(
  '/content/articles/*.md',
  {
    eager: true,
    import: 'default',
    query: '?article',
  },
);

const loadedArticles = Object.values(articleSources);

assertUniqueArticleSlugs(loadedArticles);

export const articles: ArticleDocument[] = loadedArticles.sort((left, right) =>
  left.publishedAt.localeCompare(right.publishedAt),
);

export function getArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}

export type { ArticleDocument, ArticleMeta, TocItem } from './schema';

import type { Root } from 'mdast';
import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이어야 합니다.')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, '존재하지 않는 날짜입니다.');

export const articleMetaSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug는 kebab-case여야 합니다.'),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(240),
    author: z.string().trim().min(1).max(80),
    publishedAt: isoDate,
    updatedAt: isoDate.optional(),
    cover: z
      .object({
        src: z.string().trim().min(1),
        alt: z.string().trim().min(1, '대표 이미지 대체 텍스트가 필요합니다.'),
        caption: z.string().trim().min(1).optional(),
      })
      .strict()
      .optional(),
    tags: z.array(z.string().trim().min(1)),
  })
  .strict();

export type ArticleMeta = z.infer<typeof articleMetaSchema>;

export type TocItem = {
  id: string;
  depth: 2 | 3 | 4;
  label: string;
  number: string;
  children: TocItem[];
};

export type EditorialHeadingData = {
  id: string;
  number: string;
};

export type EditorialCodeData = {
  highlightedHtml: string;
  language: string;
};

export type ArticleDocument = ArticleMeta & {
  source: string;
  tree: Root;
  toc: TocItem[];
  readingMinutes: number;
  displayDate: string;
};

export function assertUniqueArticleSlugs(
  articles: Pick<ArticleMeta, 'slug'>[],
) {
  const counts = new Map<string, number>();
  for (const article of articles) {
    counts.set(article.slug, (counts.get(article.slug) ?? 0) + 1);
  }

  const duplicates = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([slug]) => slug);

  if (duplicates.length) {
    throw new Error(`중복된 article slug가 있습니다: ${duplicates.join(', ')}`);
  }
}

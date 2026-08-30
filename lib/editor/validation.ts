import { stringify as stringifyYaml } from 'yaml';

import { parseArticleSource } from '@/lib/content/parse-article';

import type { ArticleDraftInput, ValidationIssue } from './types';

export async function compileDraft(input: ArticleDraftInput) {
  const frontmatter = {
    slug: input.slug,
    title: input.title,
    description: input.description,
    author: input.author,
    publishedAt: input.publishedAt,
    ...(input.updatedAt ? { updatedAt: input.updatedAt } : {}),
    ...(input.cover ? { cover: input.cover } : {}),
    tags: input.tags,
  };
  const source = `---\n${stringifyYaml(frontmatter).trim()}\n---\n\n${input.body}`;

  try {
    const compiled = await parseArticleSource(input.slug || 'draft', source);
    return { compiled, issues: [] satisfies ValidationIssue[] };
  } catch (error) {
    return {
      compiled: null,
      issues: [
        { message: error instanceof Error ? error.message : String(error) },
      ] satisfies ValidationIssue[],
    };
  }
}

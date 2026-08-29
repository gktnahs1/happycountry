import { readFile } from 'node:fs/promises';
import type { Plugin } from 'vite';

import { parseArticleSource } from './parse-article';

export function editorialMarkdownPlugin(): Plugin {
  const slugSources = new Map<string, string>();
  const sourceSlugs = new Map<string, string>();

  return {
    name: 'happycountry-editorial-markdown',
    enforce: 'pre',
    async load(id) {
      const [sourcePath] = id.split('?', 1);
      const normalizedPath = sourcePath.replaceAll('\\', '/');
      const isEditorialSource =
        normalizedPath.includes('/content/articles/') ||
        normalizedPath.includes('/tests/fixtures/');
      if (!sourcePath.endsWith('.md') || !isEditorialSource) return null;

      const article = await parseArticleSource(
        sourcePath,
        await readFile(sourcePath, 'utf8'),
      );

      const previousSlug = sourceSlugs.get(sourcePath);
      if (previousSlug && previousSlug !== article.slug) {
        slugSources.delete(previousSlug);
      }

      const existingSource = slugSources.get(article.slug);
      if (existingSource && existingSource !== sourcePath) {
        throw new Error(
          `중복된 article slug가 있습니다: ${article.slug} (${existingSource}, ${sourcePath})`,
        );
      }

      sourceSlugs.set(sourcePath, article.slug);
      slugSources.set(article.slug, sourcePath);

      return `export default ${JSON.stringify(article)};`;
    },
  };
}

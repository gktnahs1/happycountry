import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { toString } from 'mdast-util-to-string';

import { parseArticleSource } from '../lib/content/parse-article';

const expectedDigests = {
  'ai-model-business':
    '2f18aa4d6ead403c80cc4260aaccdb1eeffbdddfd4bd712dc472f69958f64198',
  'next-platform':
    'a4dcad3071e285116e668f3ecf39c9254d4a41398abf6ba68a82c40819d50ffb',
} as const;

function normalizeProse(text: string) {
  return text.replace(/\s+/gu, ' ').trim();
}

type CanonicalBlock =
  | { type: 'heading'; depth: number; text: string }
  | { type: 'paragraph' | 'warning'; text: string }
  | { type: 'image'; src: string; alt: string };

function markdownSequence(
  tree: Awaited<ReturnType<typeof parseArticleSource>>['tree'],
) {
  const sequence: CanonicalBlock[] = [];
  for (const node of tree.children) {
    if (node.type === 'heading') {
      sequence.push({
        type: 'heading',
        depth: node.depth,
        text: normalizeProse(toString(node)),
      });
      continue;
    }
    if (node.type === 'paragraph') {
      if (node.children.length === 1 && node.children[0].type === 'image') {
        sequence.push({
          type: 'image',
          src: node.children[0].url,
          alt: node.children[0].alt ?? '',
        });
      } else {
        sequence.push({
          type: 'paragraph',
          text: normalizeProse(toString(node)),
        });
      }
      continue;
    }
    if (node.type === 'containerDirective' && node.name === 'callout') {
      sequence.push({ type: 'warning', text: normalizeProse(toString(node)) });
    }
  }
  return sequence;
}

for (const [slug, expectedDigest] of Object.entries(expectedDigests)) {
  void test(`${slug} 이전 원문의 문장·순서·제목·이미지·경고문을 보존한다`, async () => {
    const markdownUrl = new URL(
      `../content/articles/${slug}.md`,
      import.meta.url,
    );
    const article = await parseArticleSource(
      slug,
      await readFile(markdownUrl, 'utf8'),
    );
    const digest = createHash('sha256')
      .update(
        JSON.stringify({
          slug: article.slug,
          title: article.title,
          description: article.description,
          author: article.author,
          publishedAt: article.publishedAt,
          cover: article.cover,
          sequence: markdownSequence(article.tree),
        }),
      )
      .digest('hex');

    assert.equal(digest, expectedDigest);
  });
}

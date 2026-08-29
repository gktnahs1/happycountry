import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import { visit } from 'unist-util-visit';
import { stringify as stringifyYaml } from 'yaml';

import { ArticleDocumentRenderer } from '../components/article/article-document';
import { parseArticleSource } from '../lib/content/parse-article';
import { assertUniqueArticleSlugs } from '../lib/content/schema';

const defaultMeta = {
  slug: 'test-article',
  title: '테스트 글',
  description: '검증을 위한 테스트 글이다.',
  author: '테스트 작성자',
  publishedAt: '2026-08-30',
  tags: [],
};

function source(body: string, overrides: Record<string, unknown> = {}) {
  return `---\n${stringifyYaml({ ...defaultMeta, ...overrides }).trim()}\n---\n\n${body}`;
}

void test('fixture의 GFM, 지시문, 코드, 각주를 한 AST에서 렌더링한다', async () => {
  const fixtureUrl = new URL('./fixtures/editorial-system.md', import.meta.url);
  const article = await parseArticleSource(
    'editorial-system.md',
    await readFile(fixtureUrl, 'utf8'),
  );

  assert.equal(article.slug, 'editorial-fixture');
  assert.equal(article.readingMinutes, 1);
  assert.deepEqual(
    article.toc.map(({ number, id, children }) => ({
      number,
      id,
      children: children.map((child) => ({
        number: child.number,
        children: child.children.map((grandchild) => grandchild.number),
      })),
    })),
    [
      {
        number: '1',
        id: '첫-번째-장',
        children: [{ number: '1.1', children: ['1.1.1'] }],
      },
      { number: '2', id: '두-번째-장', children: [] },
    ],
  );

  let highlightedCode = '';
  visit(article.tree, 'code', (node) => {
    highlightedCode =
      (node.data as { editorialCode?: { highlightedHtml: string } })
        .editorialCode?.highlightedHtml ?? '';
  });
  assert.match(highlightedCode, /class="shiki/);

  const html = renderToStaticMarkup(
    createElement(ArticleDocumentRenderer, { article }),
  );
  assert.match(html, /class="article-code"/);
  assert.match(html, /<table>/);
  assert.match(html, /data-columns="2"/);
  assert.match(html, /data-tone="note"/);
  assert.match(html, /class="task-list-item"/);
  assert.match(html, /<input[^>]*type="checkbox"[^>]*checked=""/);
  assert.match(html, /id="fn-fact"/);
  assert.match(html, /href="#fnref-fact-1"/);
  assert.match(html, /href="#fnref-fact-2"/);
});

void test('제목 번호가 단계별로 증가하고 H2에서 하위 번호가 리셋된다', async () => {
  const article = await parseArticleSource(
    'numbering.md',
    source(
      '## 같은 제목\n\n### 세부\n\n#### 항목\n\n## 같은 제목\n\n### 다음 세부',
    ),
  );

  assert.equal(article.toc[0].number, '1');
  assert.equal(article.toc[0].children[0].number, '1.1');
  assert.equal(article.toc[0].children[0].children[0].number, '1.1.1');
  assert.equal(article.toc[1].number, '2');
  assert.equal(article.toc[1].children[0].number, '2.1');
  assert.deepEqual(
    article.toc.map((item) => item.id),
    ['같은-제목', '같은-제목-2'],
  );
});

void test('잘못된 날짜와 문서 구조는 빌드 오류가 된다', async () => {
  await assert.rejects(
    () =>
      parseArticleSource(
        'date.md',
        source('본문', { publishedAt: '2026-02-30' }),
      ),
    /존재하지 않는 날짜/,
  );
  await assert.rejects(
    () => parseArticleSource('h1.md', source('# 본문 H1')),
    /H1은 글 제목/,
  );
  await assert.rejects(
    () => parseArticleSource('skip.md', source('## 장\n\n#### 건너뛴 제목')),
    /바로 사용할 수 없습니다/,
  );
  await assert.rejects(
    () => parseArticleSource('number.md', source('## 1. 수동 번호')),
    /제목 번호는 사이트가 생성/,
  );
  await assert.rejects(
    () => parseArticleSource('alt.md', source('![](/images/empty-alt.png)')),
    /대체 텍스트/,
  );
  await assert.rejects(
    () => parseArticleSource('html.md', source('<div>임의 HTML</div>')),
    /원문 HTML은 허용하지 않습니다/,
  );
  await assert.rejects(
    () =>
      parseArticleSource(
        'figure.md',
        source('::figure{src="/images/no-alt.png" width="body"}'),
      ),
    /figure alt가 필요합니다/,
  );
  await assert.rejects(
    () =>
      parseArticleSource(
        'unknown-attribute.md',
        source('::figure{src="/image.png" alt="설명" decoration="none"}'),
      ),
    /지원하지 않는 속성/,
  );
  await assert.rejects(
    () =>
      parseArticleSource(
        'gallery.md',
        source(':::gallery{columns="2"}\n![이미지](/image.png)\n:::'),
      ),
    /이미지가 두 개 이상/,
  );
  await assert.rejects(
    () =>
      parseArticleSource(
        'link.md',
        source('[위험한 링크](javascript:alert(1))'),
      ),
    /실행 가능한 링크 URL/,
  );
});

void test('중복 slug는 컬렉션 검증 단계에서 거부한다', () => {
  assert.throws(
    () => assertUniqueArticleSlugs([{ slug: 'same' }, { slug: 'same' }]),
    /중복된 article slug/,
  );
});

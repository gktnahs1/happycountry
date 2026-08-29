import type { Code, Heading, Image, Root } from 'mdast';
import { toString } from 'mdast-util-to-string';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { bundledLanguages, codeToHtml } from 'shiki';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { parse as parseYaml } from 'yaml';

import {
  articleMetaSchema,
  type ArticleDocument,
  type EditorialCodeData,
  type EditorialHeadingData,
  type TocItem,
} from './schema';

const markdownParser = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkDirective);

const authoredNumberPatterns = [
  /^<\s*\d+\s*(?:장|절|항)[.·:\s]/,
  /^\d+(?:\.\d+)*[.)]\s+/,
  /^\d+\s*(?:장|절|항)[.·:\s]/,
];

type MutableData = Record<string, unknown> & {
  editorialHeading?: EditorialHeadingData;
  editorialCode?: EditorialCodeData;
};

function fail(sourceName: string, message: string): never {
  throw new Error(`[${sourceName}] ${message}`);
}

function splitFrontmatter(sourceName: string, rawSource: string) {
  const normalized = rawSource.replaceAll('\r\n', '\n');
  if (!normalized.startsWith('---\n')) {
    fail(sourceName, 'YAML frontmatter가 파일 첫 줄에 필요합니다.');
  }

  const closing = normalized.indexOf('\n---\n', 4);
  if (closing === -1)
    fail(sourceName, 'YAML frontmatter 종료 구분자(---)가 없습니다.');

  return {
    frontmatter: normalized.slice(4, closing),
    body: normalized.slice(closing + 5).trim(),
  };
}

function slugifyHeading(label: string) {
  const slug = label
    .normalize('NFKC')
    .toLocaleLowerCase('ko-KR')
    .replace(/[‘’'“”"`]/g, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'section';
}

function buildTocItem(
  roots: TocItem[],
  current: { h2?: TocItem; h3?: TocItem },
  item: TocItem,
  sourceName: string,
) {
  if (item.depth === 2) {
    roots.push(item);
    current.h2 = item;
    current.h3 = undefined;
    return;
  }

  if (item.depth === 3) {
    if (!current.h2) fail(sourceName, 'H3 앞에는 H2가 필요합니다.');
    current.h2.children.push(item);
    current.h3 = item;
    return;
  }

  if (!current.h3) fail(sourceName, 'H4 앞에는 H3가 필요합니다.');
  current.h3.children.push(item);
}

function directiveAttributes(node: {
  attributes?: Record<string, string | null> | null;
}) {
  return node.attributes ?? {};
}

function rejectUnknownAttributes(
  attributes: Record<string, string | null>,
  allowed: string[],
  directiveName: string,
  sourceName: string,
) {
  const unknown = Object.keys(attributes).filter(
    (key) => !allowed.includes(key),
  );
  if (unknown.length) {
    fail(
      sourceName,
      `${directiveName}에서 지원하지 않는 속성입니다: ${unknown.join(', ')}`,
    );
  }
}

function validateDirectives(tree: Root, sourceName: string) {
  visit(tree, (node: unknown) => {
    const directive = node as {
      type?: string;
      name?: string;
      attributes?: Record<string, string | null> | null;
      children?: unknown[];
    };

    if (!directive.type?.endsWith('Directive')) return;

    if (directive.name === 'callout') {
      if (directive.type !== 'containerDirective') {
        fail(sourceName, 'callout은 :::callout 컨테이너 형식이어야 합니다.');
      }
      const attributes = directiveAttributes(directive);
      rejectUnknownAttributes(
        attributes,
        ['tone', 'title'],
        'callout',
        sourceName,
      );
      const tone = attributes.tone;
      if (!['note', 'warning', 'caution'].includes(tone ?? '')) {
        fail(
          sourceName,
          'callout tone은 note, warning, caution 중 하나여야 합니다.',
        );
      }
      if (attributes.title !== undefined && !attributes.title?.trim()) {
        fail(sourceName, 'callout title은 비워둘 수 없습니다.');
      }
      return;
    }

    if (directive.name === 'figure') {
      if (directive.type !== 'leafDirective') {
        fail(sourceName, 'figure는 ::figure 리프 형식이어야 합니다.');
      }
      const attributes = directiveAttributes(directive);
      rejectUnknownAttributes(
        attributes,
        ['src', 'alt', 'width', 'caption'],
        'figure',
        sourceName,
      );
      if (!attributes.src?.trim()) fail(sourceName, 'figure src가 필요합니다.');
      if (!attributes.alt?.trim()) fail(sourceName, 'figure alt가 필요합니다.');
      if (!['body', 'wide', 'full'].includes(attributes.width ?? 'body')) {
        fail(sourceName, 'figure width는 body, wide, full 중 하나여야 합니다.');
      }
      if (attributes.caption !== undefined && !attributes.caption?.trim()) {
        fail(sourceName, 'figure caption은 비워둘 수 없습니다.');
      }
      return;
    }

    if (directive.name === 'gallery') {
      if (directive.type !== 'containerDirective') {
        fail(sourceName, 'gallery는 :::gallery 컨테이너 형식이어야 합니다.');
      }
      const attributes = directiveAttributes(directive);
      rejectUnknownAttributes(attributes, ['columns'], 'gallery', sourceName);
      const columns = attributes.columns ?? '2';
      if (!['2', '3'].includes(columns)) {
        fail(sourceName, 'gallery columns는 2 또는 3이어야 합니다.');
      }
      const validChildren = directive.children?.every((child) => {
        const paragraph = child as {
          type?: string;
          children?: { type?: string }[];
        };
        return (
          paragraph.type === 'paragraph' &&
          paragraph.children?.length === 1 &&
          paragraph.children[0].type === 'image'
        );
      });
      if (
        !directive.children ||
        directive.children.length < 2 ||
        !validChildren
      ) {
        fail(
          sourceName,
          'gallery에는 Markdown 이미지가 두 개 이상 필요합니다.',
        );
      }
      return;
    }

    fail(
      sourceName,
      `지원하지 않는 지시문입니다: ${directive.name ?? 'unknown'}`,
    );
  });
}

async function highlightCodeBlocks(tree: Root) {
  const codeNodes: Code[] = [];
  visit(tree, 'code', (node) => {
    codeNodes.push(node);
  });

  await Promise.all(
    codeNodes.map(async (node) => {
      const requested = node.lang?.toLowerCase() ?? 'text';
      const language = Object.hasOwn(bundledLanguages, requested)
        ? requested
        : 'text';
      const highlightedHtml = await codeToHtml(node.value, {
        lang: language,
        theme: 'github-light-default',
      });
      node.data = {
        ...node.data,
        editorialCode: {
          highlightedHtml,
          language: requested,
        } satisfies EditorialCodeData,
      } as MutableData;
    }),
  );
}

export async function parseArticleSource(
  sourceName: string,
  rawSource: string,
) {
  const { frontmatter, body } = splitFrontmatter(sourceName, rawSource);
  const parsedFrontmatter = parseYaml(frontmatter);
  const result = articleMetaSchema.safeParse(parsedFrontmatter);

  if (!result.success) {
    const details = result.error.issues
      .map(
        (issue) => `${issue.path.join('.') || 'frontmatter'}: ${issue.message}`,
      )
      .join('; ');
    fail(sourceName, details);
  }

  const tree = markdownParser.parse(body) as Root;
  const htmlNodes: string[] = [];
  visit(tree, 'html', (node) => {
    htmlNodes.push(node.value);
  });
  if (htmlNodes.length) fail(sourceName, '원문 HTML은 허용하지 않습니다.');

  visit(tree, (node: unknown) => {
    const candidate = node as { type?: string; url?: string };
    if (
      !['link', 'definition'].includes(candidate.type ?? '') ||
      !candidate.url
    )
      return;
    if (/^\s*(?:javascript|vbscript):/iu.test(candidate.url)) {
      fail(
        sourceName,
        `실행 가능한 링크 URL은 허용하지 않습니다: ${candidate.url}`,
      );
    }
  });

  const images: Image[] = [];
  visit(tree, 'image', (node) => {
    images.push(node);
  });
  for (const image of images) {
    if (!image.alt?.trim())
      fail(sourceName, '모든 이미지에 대체 텍스트가 필요합니다.');
  }

  validateDirectives(tree, sourceName);

  const toc: TocItem[] = [];
  const current: { h2?: TocItem; h3?: TocItem } = {};
  const counters = [0, 0, 0];
  const slugCounts = new Map<string, number>();
  let previousDepth = 1;

  const headings: Heading[] = [];
  visit(tree, 'heading', (node) => {
    headings.push(node);
  });

  for (const heading of headings) {
    if (heading.depth === 1)
      fail(sourceName, 'H1은 글 제목 전용이며 본문에서 사용할 수 없습니다.');
    if (heading.depth > 4)
      fail(sourceName, '본문 제목은 H2부터 H4까지만 사용할 수 있습니다.');
    if (heading.depth > previousDepth + 1) {
      fail(
        sourceName,
        `H${previousDepth} 다음에 H${heading.depth}를 바로 사용할 수 없습니다.`,
      );
    }

    const label = toString(heading).trim();
    if (!label) fail(sourceName, '빈 제목은 사용할 수 없습니다.');
    if (authoredNumberPatterns.some((pattern) => pattern.test(label))) {
      fail(sourceName, `제목 번호는 사이트가 생성합니다: ${label}`);
    }

    const counterIndex = heading.depth - 2;
    counters[counterIndex] += 1;
    counters.fill(0, counterIndex + 1);
    const number = counters.slice(0, counterIndex + 1).join('.');
    const baseId = slugifyHeading(label);
    const duplicateCount = (slugCounts.get(baseId) ?? 0) + 1;
    slugCounts.set(baseId, duplicateCount);
    const id = duplicateCount === 1 ? baseId : `${baseId}-${duplicateCount}`;

    heading.data = {
      ...heading.data,
      editorialHeading: { id, number } satisfies EditorialHeadingData,
    } as MutableData;

    buildTocItem(
      toc,
      current,
      { id, depth: heading.depth as 2 | 3 | 4, label, number, children: [] },
      sourceName,
    );
    previousDepth = heading.depth;
  }

  await highlightCodeBlocks(tree);

  const compactCharacterCount = toString(tree).replace(/\s/gu, '').length;
  const readingMinutes = Math.max(1, Math.ceil(compactCharacterCount / 500));
  const publishedDate = new Date(`${result.data.publishedAt}T00:00:00+09:00`);
  const displayDate = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(publishedDate);

  return {
    ...result.data,
    source: body,
    tree,
    toc,
    readingMinutes,
    displayDate,
  } satisfies ArticleDocument;
}

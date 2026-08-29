/* oxlint-disable next/no-img-element -- Editorial images have author-defined dimensions and validated alt text. */
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- Scrollable tables need a keyboard focus target. */
import type {
  Definition,
  FootnoteDefinition,
  FootnoteReference,
  Image,
  ImageReference,
  LinkReference,
  PhrasingContent,
  RootContent,
} from 'mdast';
import type { ContainerDirective, LeafDirective } from 'mdast-util-directive';
import { toString } from 'mdast-util-to-string';
import type { CSSProperties, ReactNode } from 'react';
import { Fragment } from 'react';
import { visit } from 'unist-util-visit';

import type {
  ArticleDocument,
  EditorialCodeData,
  EditorialHeadingData,
} from '@/lib/content/schema';

import { CopyCodeButton } from './copy-code-button';

type Directive = ContainerDirective | LeafDirective;
type RenderableNode = RootContent | Directive;

type FootnoteReferenceInfo = {
  number: number;
  occurrence: number;
};

type RenderContext = {
  definitions: Map<string, Definition>;
  footnoteDefinitions: Map<string, FootnoteDefinition>;
  footnoteOrder: string[];
  footnoteOccurrences: Map<string, number>;
  footnoteReferences: WeakMap<FootnoteReference, FootnoteReferenceInfo>;
};

function normalizedIdentifier(identifier: string) {
  return identifier.trim().toLocaleLowerCase('en-US');
}

function createRenderContext(article: ArticleDocument): RenderContext {
  const definitions = new Map<string, Definition>();
  const footnoteDefinitions = new Map<string, FootnoteDefinition>();
  const footnoteOrder: string[] = [];
  const footnoteNumbers = new Map<string, number>();
  const footnoteOccurrences = new Map<string, number>();
  const footnoteReferences = new WeakMap<
    FootnoteReference,
    FootnoteReferenceInfo
  >();

  visit(article.tree, 'definition', (node) => {
    definitions.set(normalizedIdentifier(node.identifier), node);
  });
  visit(article.tree, 'footnoteDefinition', (node) => {
    footnoteDefinitions.set(normalizedIdentifier(node.identifier), node);
  });
  visit(article.tree, 'footnoteReference', (node) => {
    const identifier = normalizedIdentifier(node.identifier);
    let number = footnoteNumbers.get(identifier);
    if (!number) {
      number = footnoteOrder.length + 1;
      footnoteNumbers.set(identifier, number);
      footnoteOrder.push(identifier);
    }
    const occurrence = (footnoteOccurrences.get(identifier) ?? 0) + 1;
    footnoteOccurrences.set(identifier, occurrence);
    footnoteReferences.set(node, { number, occurrence });
  });

  return {
    definitions,
    footnoteDefinitions,
    footnoteOrder,
    footnoteOccurrences,
    footnoteReferences,
  };
}

function definitionForReference(
  node: LinkReference | ImageReference,
  context: RenderContext,
) {
  return context.definitions.get(normalizedIdentifier(node.identifier));
}

function renderInline(
  children: PhrasingContent[],
  context: RenderContext,
  keyPrefix: string,
): ReactNode[] {
  return children.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (node.type) {
      case 'text':
        return <Fragment key={key}>{node.value}</Fragment>;
      case 'emphasis':
        return <em key={key}>{renderInline(node.children, context, key)}</em>;
      case 'strong':
        return (
          <strong key={key}>{renderInline(node.children, context, key)}</strong>
        );
      case 'delete':
        return <del key={key}>{renderInline(node.children, context, key)}</del>;
      case 'inlineCode':
        return <code key={key}>{node.value}</code>;
      case 'break':
        return <br key={key} />;
      case 'link':
        return (
          <a href={node.url} title={node.title ?? undefined} key={key}>
            {renderInline(node.children, context, key)}
          </a>
        );
      case 'linkReference': {
        const definition = definitionForReference(node, context);
        if (!definition) return <Fragment key={key}>{toString(node)}</Fragment>;
        return (
          <a
            href={definition.url}
            title={definition.title ?? undefined}
            key={key}
          >
            {renderInline(node.children, context, key)}
          </a>
        );
      }
      case 'image':
        return (
          <img
            className="inline-article-image"
            src={node.url}
            alt={node.alt ?? ''}
            title={node.title ?? undefined}
            loading="lazy"
            key={key}
          />
        );
      case 'imageReference': {
        const definition = definitionForReference(node, context);
        if (!definition) return <Fragment key={key}>{node.alt ?? ''}</Fragment>;
        return (
          <img
            className="inline-article-image"
            src={definition.url}
            alt={node.alt ?? ''}
            title={definition.title ?? undefined}
            loading="lazy"
            key={key}
          />
        );
      }
      case 'footnoteReference': {
        const info = context.footnoteReferences.get(node);
        if (!info) return null;
        const identifier = normalizedIdentifier(node.identifier);
        const referenceId = `fnref-${identifier}-${info.occurrence}`;
        return (
          <sup className="footnote-reference" id={referenceId} key={key}>
            <a href={`#fn-${identifier}`} aria-label={`각주 ${info.number}`}>
              {info.number}
            </a>
          </sup>
        );
      }
      default:
        return null;
    }
  });
}

function ArticleImage({
  image,
  width = 'body',
}: {
  image: Image;
  width?: 'body' | 'wide' | 'full';
}) {
  return (
    <figure className={`editorial-figure editorial-figure-${width}`}>
      <img src={image.url} alt={image.alt ?? ''} loading="lazy" />
      {image.title ? <figcaption>{image.title}</figcaption> : null}
    </figure>
  );
}

function renderGallery(node: ContainerDirective, key: string) {
  const images: Image[] = [];
  visit(node, 'image', (image) => {
    images.push(image);
  });
  const columns = node.attributes?.columns === '3' ? 3 : 2;

  return (
    <div
      className="article-gallery"
      data-columns={columns}
      key={key}
      aria-label="이미지 갤러리"
    >
      {images.map((image, index) => (
        <ArticleImage image={image} key={`${key}-image-${index}`} />
      ))}
    </div>
  );
}

function renderDirective(node: Directive, context: RenderContext, key: string) {
  if (node.name === 'callout' && node.type === 'containerDirective') {
    const tone = node.attributes?.tone ?? 'note';
    const title = node.attributes?.title;
    return (
      <aside className="article-callout" data-tone={tone} key={key}>
        {title ? <p className="callout-title">{title}</p> : null}
        <div>
          {renderBlocks(node.children as RenderableNode[], context, key)}
        </div>
      </aside>
    );
  }

  if (node.name === 'gallery' && node.type === 'containerDirective') {
    return renderGallery(node, key);
  }

  if (node.name === 'figure' && node.type === 'leafDirective') {
    const attributes = node.attributes ?? {};
    const width = (attributes.width ?? 'body') as 'body' | 'wide' | 'full';
    return (
      <ArticleImage
        image={{
          type: 'image',
          url: attributes.src ?? '',
          alt: attributes.alt ?? '',
          title: attributes.caption ?? (toString(node) || null),
        }}
        width={width}
        key={key}
      />
    );
  }

  return null;
}

function renderBlocks(
  nodes: RenderableNode[],
  context: RenderContext,
  keyPrefix: string,
): ReactNode[] {
  return nodes.flatMap((node, index) => {
    const key = `${keyPrefix}-${index}`;

    if (node.type.endsWith('Directive')) {
      return [renderDirective(node as Directive, context, key)];
    }

    switch (node.type) {
      case 'paragraph': {
        if (node.children.length === 1 && node.children[0].type === 'image') {
          return [<ArticleImage image={node.children[0]} key={key} />];
        }
        return [<p key={key}>{renderInline(node.children, context, key)}</p>];
      }
      case 'heading': {
        const heading = (
          node.data as { editorialHeading?: EditorialHeadingData }
        )?.editorialHeading;
        if (!heading) return [];
        const content = (
          <>
            <span className="section-number" aria-hidden="true">
              {heading.number}
            </span>
            <span>{renderInline(node.children, context, key)}</span>
          </>
        );
        if (node.depth === 2) {
          return [
            <h2 id={heading.id} key={key}>
              {content}
            </h2>,
          ];
        }
        if (node.depth === 3) {
          return [
            <h3 id={heading.id} key={key}>
              {content}
            </h3>,
          ];
        }
        return [
          <h4 id={heading.id} key={key}>
            {content}
          </h4>,
        ];
      }
      case 'blockquote':
        return [
          <blockquote key={key}>
            {renderBlocks(node.children as RenderableNode[], context, key)}
          </blockquote>,
        ];
      case 'list': {
        const Tag = node.ordered ? 'ol' : 'ul';
        const containsTasks = node.children.some(
          (item) => typeof item.checked === 'boolean',
        );
        return [
          <Tag
            className={containsTasks ? 'task-list' : undefined}
            start={node.ordered ? (node.start ?? undefined) : undefined}
            key={key}
          >
            {renderBlocks(node.children as RenderableNode[], context, key)}
          </Tag>,
        ];
      }
      case 'listItem': {
        if (typeof node.checked === 'boolean') {
          return [
            <li className="task-list-item" key={key}>
              <input
                type="checkbox"
                checked={node.checked ?? false}
                aria-label={node.checked ? '완료된 항목' : '완료되지 않은 항목'}
                disabled
              />
              <div>
                {renderBlocks(node.children as RenderableNode[], context, key)}
              </div>
            </li>,
          ];
        }
        return [
          <li key={key}>
            {renderBlocks(node.children as RenderableNode[], context, key)}
          </li>,
        ];
      }
      case 'thematicBreak':
        return [<hr key={key} />];
      case 'code': {
        const code = (node.data as { editorialCode?: EditorialCodeData })
          ?.editorialCode;
        return [
          <figure className="article-code" key={key}>
            <figcaption>
              <span>{code?.language ?? node.lang ?? 'text'}</span>
              <CopyCodeButton code={node.value} />
            </figcaption>
            {code ? (
              <div dangerouslySetInnerHTML={{ __html: code.highlightedHtml }} />
            ) : (
              <pre>
                <code>{node.value}</code>
              </pre>
            )}
          </figure>,
        ];
      }
      case 'table':
        return [
          <div className="article-table-wrap" key={key} tabIndex={0}>
            <table>
              <thead>
                <tr>
                  {node.children[0]?.children.map((cell, cellIndex) => (
                    <th
                      style={
                        {
                          textAlign: node.align?.[cellIndex] ?? undefined,
                        } as CSSProperties
                      }
                      key={`${key}-head-${cellIndex}`}
                    >
                      {renderInline(
                        cell.children,
                        context,
                        `${key}-head-${cellIndex}`,
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {node.children.slice(1).map((row, rowIndex) => (
                  <tr key={`${key}-row-${rowIndex}`}>
                    {row.children.map((cell, cellIndex) => (
                      <td
                        style={
                          {
                            textAlign: node.align?.[cellIndex] ?? undefined,
                          } as CSSProperties
                        }
                        key={`${key}-cell-${rowIndex}-${cellIndex}`}
                      >
                        {renderInline(
                          cell.children,
                          context,
                          `${key}-cell-${rowIndex}-${cellIndex}`,
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        ];
      case 'definition':
      case 'footnoteDefinition':
      case 'html':
      case 'yaml':
        return [];
      default:
        return [];
    }
  });
}

function Footnotes({ context }: { context: RenderContext }) {
  if (!context.footnoteOrder.length) return null;

  return (
    <section className="article-footnotes" aria-label="각주">
      <h2 className="sr-only">각주</h2>
      <ol>
        {context.footnoteOrder.map((identifier, index) => {
          const definition = context.footnoteDefinitions.get(identifier);
          if (!definition) return null;
          const occurrences = context.footnoteOccurrences.get(identifier) ?? 1;
          return (
            <li id={`fn-${identifier}`} key={identifier}>
              <div>
                {renderBlocks(
                  definition.children as RenderableNode[],
                  context,
                  `footnote-${index}`,
                )}
              </div>
              {Array.from({ length: occurrences }, (_, referenceIndex) => (
                <a
                  className="footnote-backref"
                  href={`#fnref-${identifier}-${referenceIndex + 1}`}
                  aria-label={`본문의 각주 ${index + 1}${occurrences > 1 ? ` (${referenceIndex + 1})` : ''}로 돌아가기`}
                  key={`backref-${referenceIndex + 1}`}
                >
                  ↩{occurrences > 1 ? referenceIndex + 1 : ''}
                </a>
              ))}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function ArticleDocumentRenderer({
  article,
}: {
  article: ArticleDocument;
}) {
  const context = createRenderContext(article);
  return (
    <>
      {renderBlocks(
        article.tree.children as RenderableNode[],
        context,
        'article',
      )}
      <Footnotes context={context} />
    </>
  );
}

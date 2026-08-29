/* oxlint-disable next/no-html-link-for-pages -- Native navigation avoids the broken vinext client-router interception. */
import type { Metadata } from 'next';
import Image from 'next/image';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { MobileToc, type TocItem } from '@/components/mobile-toc';
import { ReadingProgress } from '@/components/reading-progress';
import { articles, getArticle } from '@/lib/articles';

type EssayPageProps = {
  params: Promise<{ slug: string }>;
};

const SITE_URL = 'https://happycountry-essays.gktnahs.chatgpt.site';

function getToc(article: NonNullable<ReturnType<typeof getArticle>>): TocItem[] {
  let headingIndex = 0;
  return article.blocks.flatMap((block) => {
    if (block.type !== 'heading') return [];
    headingIndex += 1;
    return [{ id: `section-${headingIndex}`, label: block.text, level: block.level }];
  });
}

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: EssayPageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);

  if (!article) return { title: '글을 찾을 수 없습니다' };

  const primaryImage = article.coverImage
    ? new URL(article.coverImage, SITE_URL).toString()
    : undefined;

  return {
    title: article.title,
    description: article.description,
    authors: [{ name: article.author }],
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.description,
      publishedTime: article.publishedAt,
      authors: [article.author],
      url: `/essays/${article.slug}`,
      images: primaryImage
        ? [{ url: primaryImage, alt: article.coverAlt ?? article.title }]
        : [],
    },
    twitter: {
      card: primaryImage ? 'summary_large_image' : 'summary',
      title: article.title,
      description: article.description,
      images: primaryImage ? [primaryImage] : [],
    },
  };
}

export default async function EssayPage({ params }: EssayPageProps) {
  const { slug } = await params;
  const article = getArticle(slug);

  if (!article) {
    return (
      <main className="missing-page">
        <p>404</p>
        <h1>글을 찾을 수 없습니다.</h1>
        <a href="/">글 목록으로 돌아가기</a>
      </main>
    );
  }

  const articleIndex = articles.findIndex((item) => item.slug === article.slug);
  const previous = articleIndex > 0 ? articles[articleIndex - 1] : undefined;
  const next = articleIndex < articles.length - 1 ? articles[articleIndex + 1] : undefined;
  const toc = getToc(article);

  return (
    <main className="article-page">
      <ReadingProgress />
      <header className="article-nav">
        <a className="article-back" href="/">
          <ArrowLeft aria-hidden="true" />
          <span>글 목록</span>
        </a>
        <a className="article-brand" href="/">
          HappyCountry
        </a>
      </header>

      <article>
        <header className="article-hero">
          <h1>{article.title}</h1>
          <div className="article-byline">
            <strong>{article.author}</strong>
            <time dateTime={article.publishedAt}>{article.displayDate}</time>
            <span>약 {article.readingMinutes}분</span>
          </div>
        </header>

        {article.coverImage ? (
          <figure className="article-cover">
            <Image
              src={article.coverImage}
              alt={article.coverAlt ?? ''}
              width={1254}
              height={1254}
              sizes="(max-width: 1264px) calc(100vw - 64px), 1200px"
              priority
            />
          </figure>
        ) : null}

        <MobileToc items={toc} />

        <div className={`article-layout ${toc.length ? 'has-toc' : ''}`}>
          {toc.length ? (
            <aside className="desktop-toc">
              <p>이 글의 목차</p>
              <nav aria-label="글 목차">
                {toc.map((item) => (
                  <a
                    key={item.id}
                    className={item.level === 4 ? 'toc-subitem' : undefined}
                    href={`#${item.id}`}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </aside>
          ) : null}

          <div className="article-body">
            {article.blocks.map((block, blockIndex) => {
              if (block.type === 'heading') {
                const headingNumber = article.blocks
                  .slice(0, blockIndex + 1)
                  .filter((candidate) => candidate.type === 'heading').length;
                const id = `section-${headingNumber}`;
                if (block.level === 3) {
                  return (
                    <h2 id={id} key={`${id}-${blockIndex}`}>
                      {block.text}
                    </h2>
                  );
                }
                return (
                  <h3 id={id} key={`${id}-${blockIndex}`}>
                    {block.text}
                  </h3>
                );
              }

              if (block.type === 'image') {
                return (
                  <figure className="article-figure" key={`image-${blockIndex}`}>
                    <Image
                      src={block.src}
                      alt={block.alt}
                      width={1254}
                      height={1254}
                      sizes="(max-width: 752px) calc(100vw - 32px), 720px"
                    />
                  </figure>
                );
              }

              if (block.type === 'warning') {
                return (
                  <aside className="article-warning" key={`warning-${blockIndex}`}>
                    <p>{block.text}</p>
                  </aside>
                );
              }

              return <p key={`paragraph-${blockIndex}`}>{block.text}</p>;
            })}
          </div>
        </div>

        <nav className="article-pagination" aria-label="다른 에세이">
          {previous ? (
            <a href={`/essays/${previous.slug}`}>
              <span>
                <ArrowLeft aria-hidden="true" /> 이전 글
              </span>
              <strong>{previous.title}</strong>
            </a>
          ) : (
            <span />
          )}
          {next ? (
            <a href={`/essays/${next.slug}`}>
              <span>
                다음 글 <ArrowRight aria-hidden="true" />
              </span>
              <strong>{next.title}</strong>
            </a>
          ) : (
            <span />
          )}
        </nav>
      </article>
    </main>
  );
}

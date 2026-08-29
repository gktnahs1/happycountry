import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Clock3 } from 'lucide-react';

import { MobileToc, type TocItem } from '@/components/mobile-toc';
import { ReadingProgress } from '@/components/reading-progress';
import { articles, getArticle } from '@/lib/articles';

type EssayPageProps = {
  params: Promise<{ slug: string }>;
};

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
      images: [],
    },
    twitter: {
      card: 'summary',
      title: article.title,
      description: article.description,
      images: [],
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
        <Link href="/">글 목록으로 돌아가기</Link>
      </main>
    );
  }

  const articleIndex = articles.findIndex((item) => item.slug === article.slug);
  const previous = articleIndex > 0 ? articles[articleIndex - 1] : undefined;
  const next = articleIndex < articles.length - 1 ? articles[articleIndex + 1] : undefined;
  const toc = getToc(article);
  let headingIndex = 0;

  return (
    <main className="article-page">
      <ReadingProgress />
      <header className="article-nav">
        <Link className="article-back" href="/">
          <ArrowLeft aria-hidden="true" />
          <span>글 목록</span>
        </Link>
        <Link className="article-brand" href="/">
          HappyCountry
        </Link>
        <span className="article-number">
          {String(articleIndex + 1).padStart(2, '0')} / {String(articles.length).padStart(2, '0')}
        </span>
      </header>

      <article>
        <header className="article-hero">
          <p className="article-eyebrow">{article.eyebrow}</p>
          <div className="article-title-row">
            <span aria-hidden="true">{article.emoji}</span>
            <h1>{article.title}</h1>
          </div>
          <p className="article-description">{article.description}</p>
          <div className="article-byline">
            <div className="author-monogram" aria-hidden="true">
              이
            </div>
            <div>
              <strong>{article.author}</strong>
              <span>{article.authorDetail}</span>
            </div>
            <time dateTime={article.publishedAt}>{article.displayDate}</time>
            <span className="read-time">
              <Clock3 aria-hidden="true" /> 약 {article.readingMinutes}분
            </span>
          </div>
        </header>

        {article.coverImage ? (
          <figure className="article-cover">
            <img src={article.coverImage} alt={article.coverAlt ?? ''} />
          </figure>
        ) : (
          <div className="article-divider-art" aria-hidden="true">
            <span>Value creation</span>
            <i />
            <span>Value capture</span>
          </div>
        )}

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
                headingIndex += 1;
                const id = `section-${headingIndex}`;
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
                    <img src={block.src} alt={block.alt} loading="lazy" />
                    {block.caption ? <figcaption>{block.caption}</figcaption> : null}
                  </figure>
                );
              }

              if (block.type === 'warning') {
                return (
                  <aside className="article-warning" key={`warning-${blockIndex}`}>
                    <strong>투자 관련 안내</strong>
                    <p>{block.text.replace(/^<경고>\s*:\s*/, '')}</p>
                  </aside>
                );
              }

              return <p key={`paragraph-${blockIndex}`}>{block.text}</p>;
            })}
          </div>
        </div>

        <nav className="article-pagination" aria-label="다른 에세이">
          {previous ? (
            <Link href={`/essays/${previous.slug}`}>
              <span>
                <ArrowLeft aria-hidden="true" /> 이전 글
              </span>
              <strong>{previous.title}</strong>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/essays/${next.slug}`}>
              <span>
                다음 글 <ArrowRight aria-hidden="true" />
              </span>
              <strong>{next.title}</strong>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </article>
    </main>
  );
}

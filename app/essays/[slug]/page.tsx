/* oxlint-disable next/no-html-link-for-pages -- Native navigation avoids the broken vinext client-router interception. */
import type { Metadata } from 'next';
import Image from 'next/image';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { ArticleDocumentRenderer } from '@/components/article/article-document';
import { ArticleToc } from '@/components/article/article-toc';
import { ReadingProgress } from '@/components/reading-progress';
import { articles, getArticle } from '@/lib/content/articles';

type EssayPageProps = {
  params: Promise<{ slug: string }>;
};

const SITE_URL = 'https://happycountry-essays.gktnahs.chatgpt.site';

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: EssayPageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);

  if (!article) return { title: '글을 찾을 수 없습니다' };

  const primaryImage = article.cover
    ? new URL(article.cover.src, SITE_URL).toString()
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
      modifiedTime: article.updatedAt,
      authors: [article.author],
      tags: article.tags,
      url: `/essays/${article.slug}`,
      images: primaryImage
        ? [{ url: primaryImage, alt: article.cover?.alt ?? article.title }]
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
  const next =
    articleIndex < articles.length - 1 ? articles[articleIndex + 1] : undefined;

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

        {article.cover ? (
          <figure className="article-cover">
            <Image
              src={article.cover.src}
              alt={article.cover.alt}
              width={1254}
              height={1254}
              sizes="(max-width: 1264px) calc(100vw - 64px), 1200px"
              priority
            />
            {article.cover.caption ? (
              <figcaption>{article.cover.caption}</figcaption>
            ) : null}
          </figure>
        ) : null}

        <div
          className={`article-layout ${article.toc.length ? 'has-toc' : ''}`}
        >
          <ArticleToc items={article.toc} />
          <div className="article-body">
            <ArticleDocumentRenderer article={article} />
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

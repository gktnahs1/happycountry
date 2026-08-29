import Link from 'next/link';

import { articles } from '@/lib/articles';

export default function Home() {
  return (
    <main className="index-page">
      <header className="site-header">
        <Link className="brand-mark" href="/">
          HappyCountry
        </Link>
      </header>

      <section className="index-content" aria-labelledby="index-heading">
        <h1 className="sr-only" id="index-heading">
          HappyCountry 에세이
        </h1>

        <div className="essay-list">
          {articles.map((article) => (
            <Link
              className="essay-row"
              href={`/essays/${article.slug}`}
              key={article.slug}
            >
              <div className="essay-row-meta">
                <time dateTime={article.publishedAt}>{article.displayDate}</time>
                <span>약 {article.readingMinutes}분</span>
              </div>
              <h2>{article.title}</h2>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

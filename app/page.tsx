/* oxlint-disable next/no-html-link-for-pages -- Native navigation avoids the broken vinext client-router interception. */
/* oxlint-disable next/no-img-element -- Thumbnail images have author-defined dimensions and validated alt text. */
import { articles } from '@/lib/content/articles';

export default function Home() {
  return (
    <main className="index-page">
      <header className="site-header">
        <a className="brand-mark" href="/">
          HappyCountry
        </a>
      </header>

      <section className="index-content" aria-labelledby="index-heading">
        <h1 className="sr-only" id="index-heading">
          HappyCountry 에세이
        </h1>

        <div className="essay-list">
          {articles.map((article) => (
            <a
              className="essay-row"
              href={`/essays/${article.slug}`}
              key={article.slug}
            >
              <div className="essay-row-meta">
                <time dateTime={article.publishedAt}>
                  {article.displayDate}
                </time>
                <span>약 {article.readingMinutes}분</span>
              </div>
              <div className="essay-row-main">
                <h2>{article.title}</h2>
                <p className="essay-row-description">{article.description}</p>
              </div>
              {article.cover ? (
                <div className="essay-row-cover">
                  <img
                    src={article.cover.src}
                    alt={article.cover.alt}
                    loading="lazy"
                  />
                </div>
              ) : null}
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}

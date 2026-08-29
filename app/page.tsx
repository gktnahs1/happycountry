import Link from 'next/link';
import { ArrowUpRight, BookOpenText, Clock3 } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { articles } from '@/lib/articles';

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <Link className="brand-mark" href="/" aria-label="HappyCountry 홈">
          <span aria-hidden="true">HC</span>
          <strong>HappyCountry</strong>
        </Link>
        <a className="header-link" href="#essays">
          에세이 읽기
          <ArrowUpRight aria-hidden="true" />
        </a>
      </header>

      <section className="home-hero" aria-labelledby="home-heading">
        <div className="hero-kicker">
          <span className="kicker-line" />
          Essays on business &amp; technology
        </div>
        <div className="hero-grid">
          <h1 id="home-heading">
            생각을 오래 붙잡아,
            <span>한 편의 글로 남깁니다.</span>
          </h1>
          <div className="hero-note">
            <BookOpenText aria-hidden="true" />
            <p>
              기술과 사업, 플랫폼의 다음 장면을 질문하고 나름의 언어로
              답합니다.
            </p>
          </div>
        </div>
      </section>

      <section className="essay-section" id="essays" aria-labelledby="essay-heading">
        <div className="section-heading">
          <div>
            <p>Written archive</p>
            <h2 id="essay-heading">최근 에세이</h2>
          </div>
          <span>{String(articles.length).padStart(2, '0')}편</span>
        </div>

        <div className="essay-grid">
          {articles.map((article, index) => (
            <Link
              key={article.slug}
              className={`essay-link essay-link-${index + 1}`}
              href={`/essays/${article.slug}`}
            >
              <Card className="essay-card">
                {article.coverImage ? (
                  <div className="card-image-wrap">
                    <img src={article.coverImage} alt={article.coverAlt ?? ''} />
                    <span className="image-wash" aria-hidden="true" />
                  </div>
                ) : (
                  <div className="card-type-art" aria-hidden="true">
                    <span>AI</span>
                    <span>BUSINESS</span>
                    <i>{article.emoji}</i>
                  </div>
                )}
                <div className="card-copy">
                  <div className="card-meta-top">
                    <span>{article.eyebrow}</span>
                    <span>No. {String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <h3>{article.title}</h3>
                  <p>{article.description}</p>
                  <div className="card-meta-bottom">
                    <time dateTime={article.publishedAt}>{article.displayDate}</time>
                    <span>
                      <Clock3 aria-hidden="true" /> 약 {article.readingMinutes}분
                    </span>
                    <ArrowUpRight className="card-arrow" aria-hidden="true" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <p>HappyCountry</p>
        <p>질문에서 시작한 생각의 기록</p>
        <span>© 2026</span>
      </footer>
    </main>
  );
}

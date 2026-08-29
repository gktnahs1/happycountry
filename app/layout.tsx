import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://happycountry-essays.gktnahs.chatgpt.site'),
  title: {
    default: 'HappyCountry | 에세이',
    template: '%s | HappyCountry',
  },
  description:
    '기술과 사업, 플랫폼의 다음 장면을 질문하고 나름의 언어로 답하는 에세이 아카이브.',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'HappyCountry | 에세이',
    title: 'HappyCountry | 에세이',
    description: '질문에서 시작한 생각의 기록',
    url: '/',
    images: [
      {
        url: '/og.png',
        width: 1729,
        height: 910,
        alt: 'HappyCountry | 에세이 — 질문에서 시작한 생각의 기록',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HappyCountry | 에세이',
    description: '질문에서 시작한 생각의 기록',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

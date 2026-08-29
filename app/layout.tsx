import type { Metadata } from 'next';
import { Noto_Serif_KR } from 'next/font/google';

import './globals.css';

const notoSerifKr = Noto_Serif_KR({
  display: 'swap',
  preload: false,
  variable: '--font-noto-serif-kr',
  weight: ['400', '600'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://happycountry-essays.gktnahs.chatgpt.site'),
  title: {
    default: 'HappyCountry | 에세이',
    template: '%s | HappyCountry',
  },
  description: '이경석의 에세이 아카이브.',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'HappyCountry | 에세이',
    title: 'HappyCountry | 에세이',
    description: '이경석의 에세이 아카이브',
    url: '/',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'HappyCountry 에세이',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HappyCountry | 에세이',
    description: '이경석의 에세이 아카이브',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={notoSerifKr.variable}>{children}</body>
    </html>
  );
}

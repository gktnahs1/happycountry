import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'HappyCountry | 에세이',
    template: '%s | HappyCountry',
  },
  description:
    '기술과 사업, 플랫폼의 다음 장면을 질문하고 나름의 언어로 답하는 에세이 아카이브.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

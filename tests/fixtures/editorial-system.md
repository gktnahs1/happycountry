---
slug: editorial-fixture
title: 편집 시스템 검증 글
description: 지원하는 Markdown 요소를 한 번에 검증한다.
author: 테스트 작성자
publishedAt: 2026-08-30
cover:
  src: /images/next-platform-cover.png
  alt: 검증용 대표 이미지
tags:
  - fixture
---

도입부에는 [식별 가능한 링크](https://example.com)와 `inline code`, 그리고 각주가 있다.[^fact] 같은 각주를 다시 인용한다.[^fact]

## 첫 번째 장

> 얇은 선으로 표시되는 인용문이다.

- 첫 항목
- 두 번째 항목

일반 목록 다음에는 작업 목록이 온다.

- [x] 완료된 작업 항목

### 세부 절

| 이름 | 값 |
| --- | ---: |
| alpha | 1 |

#### 더 작은 절

```ts
const answer: number = 42;
const longMessage = '코드 블록은 본문 너비보다 긴 한 줄을 포함하더라도 페이지 전체가 아니라 코드 영역 안에서만 가로로 스크롤되어야 한다.';
```

::figure{src="/images/next-platform-figure.png" alt="넓은 검증 이미지" width="wide" caption="넓은 이미지 캡션"}

:::gallery{columns="2"}
![첫 번째 갤러리 이미지](/images/next-platform-cover.png "첫 번째 캡션")

![두 번째 갤러리 이미지](/images/next-platform-figure.png)
:::

:::callout{tone="note" title="작성자 메모"}
아이콘 없이 표현되는 메모다.
:::

## 두 번째 장

번호가 다시 시작되는지 확인한다.

[^fact]: 각주 본문이다.

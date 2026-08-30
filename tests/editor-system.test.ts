import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { revisionMatches, slugChangeAllowed, validateImageUpload } from '../lib/editor/policies';
import { compileDraft } from '../lib/editor/validation';

void test('완성되지 않은 초안은 검증 오류를 반환하지만 예외로 저장 흐름을 막지 않는다', async () => {
  const result = await compileDraft({
    slug: '',
    title: '',
    description: '',
    author: '이경석',
    publishedAt: '2026-08-30',
    tags: [],
    body: '#### 건너뛴 제목',
  });
  assert.equal(result.compiled, null);
  assert.ok(result.issues.length > 0);
});

void test('유효한 초안은 번호와 목차가 포함된 발행 문서로 컴파일된다', async () => {
  const result = await compileDraft({
    slug: 'editor-test',
    title: '에디터 테스트',
    description: '에디터 테스트 설명입니다.',
    author: '이경석',
    publishedAt: '2026-08-30',
    tags: ['테스트'],
    body: '## 장\n\n본문\n\n### 절\n\n내용',
  });
  assert.equal(result.issues.length, 0);
  assert.equal(result.compiled?.toc[0]?.number, '1');
  assert.equal(result.compiled?.toc[0]?.children[0]?.number, '1.1');
});

void test('저장 기준 버전과 첫 발행 후 slug 고정 정책을 강제한다', () => {
  assert.equal(revisionMatches('revision-2', 'revision-2'), true);
  assert.equal(revisionMatches('revision-3', 'revision-2'), false);
  assert.equal(slugChangeAllowed(false, null, 'new-slug'), true);
  assert.equal(slugChangeAllowed(true, 'fixed-slug', 'other-slug'), false);
});

void test('이미지 형식과 10MB 제한을 검증한다', () => {
  assert.equal(validateImageUpload('image/webp', 1024), null);
  assert.match(validateImageUpload('image/svg+xml', 1024) ?? '', /JPEG/);
  assert.match(validateImageUpload('image/png', 10 * 1024 * 1024 + 1) ?? '', /10MB/);
});

void test('D1 migration은 편집 테이블과 실제 조회 인덱스를 포함한다', async () => {
  const sql = await readFile(
    new URL('../drizzle/0000_swift_sister_grimm.sql', import.meta.url),
    'utf8',
  );
  for (const table of ['articles', 'article_revisions', 'assets', 'system_state']) {
    assert.ok(sql.includes(`CREATE TABLE \`${table}\``));
  }
  assert.match(sql, /idx_articles_status/);
  assert.match(sql, /idx_article_revisions_article/);
});

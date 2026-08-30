import { EditorDashboard } from '@/components/editor/editor-dashboard';
/* oxlint-disable next/no-html-link-for-pages -- Native navigation avoids vinext client interception. */
import { requireEditorPage } from '@/lib/editor/auth';
import { listEditorArticles } from '@/lib/editor/repository';

export const dynamic = 'force-dynamic';

export default async function EditorPage() {
  const user = await requireEditorPage('/editor');
  if (!user) return <EditorDenied />;
  return (
    <EditorDashboard
      initialArticles={await listEditorArticles()}
      displayName={user.displayName}
    />
  );
}

function EditorDenied() {
  return (
    <main className="editor-denied">
      <p>403</p>
      <h1>이 에디터를 사용할 권한이 없습니다.</h1>
      <a href="/">공개 사이트로 돌아가기</a>
    </main>
  );
}

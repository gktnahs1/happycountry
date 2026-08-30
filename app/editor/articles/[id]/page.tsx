/* oxlint-disable next/no-html-link-for-pages -- Native navigation avoids vinext client interception. */
import { ArticleEditor } from '@/components/editor/article-editor';
import { requireEditorPage } from '@/lib/editor/auth';
import { getEditorArticle, listAssets } from '@/lib/editor/repository';

export const dynamic = 'force-dynamic';

type EditorArticlePageProps = { params: Promise<{ id: string }> };

export default async function EditorArticlePage({ params }: EditorArticlePageProps) {
  const { id } = await params;
  const user = await requireEditorPage(`/editor/articles/${id}`);
  if (!user) {
    return (
      <main className="editor-denied">
        <p>403</p>
        <h1>이 에디터를 사용할 권한이 없습니다.</h1>
        <a href="/">공개 사이트로 돌아가기</a>
      </main>
    );
  }
  const article = await getEditorArticle(id);
  if (!article) {
    return (
      <main className="editor-denied">
        <p>404</p>
        <h1>글을 찾을 수 없습니다.</h1>
        <a href="/editor">에디터로 돌아가기</a>
      </main>
    );
  }
  return (
    <ArticleEditor
      initialArticle={article}
      initialAssets={await listAssets()}
      displayName={user.displayName}
    />
  );
}

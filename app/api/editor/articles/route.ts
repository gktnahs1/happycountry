import { authorizeApi, errorResponse } from '@/lib/editor/http';
import { createArticle, listEditorArticles } from '@/lib/editor/repository';

export async function GET(request: Request) {
  const auth = await authorizeApi(request);
  if ('response' in auth) return auth.response;
  try {
    return Response.json({ articles: await listEditorArticles() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await authorizeApi(request, true);
  if ('response' in auth) return auth.response;
  try {
    return Response.json(
      { article: await createArticle(auth.user.userId) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

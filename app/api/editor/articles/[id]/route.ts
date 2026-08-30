import { z } from 'zod';

import { authorizeApi, draftInputSchema, errorResponse } from '@/lib/editor/http';
import {
  archiveArticle,
  getEditorArticle,
  publishArticle,
  RepositoryError,
  restoreRevision,
  saveDraft,
} from '@/lib/editor/repository';

type RouteContext = { params: Promise<{ id: string }> };

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save'), baseRevisionId: z.string(), input: draftInputSchema }),
  z.object({ action: z.literal('publish'), baseRevisionId: z.string() }),
  z.object({ action: z.literal('archive'), baseRevisionId: z.string() }),
  z.object({
    action: z.literal('restore'),
    baseRevisionId: z.string(),
    revisionId: z.string(),
  }),
]);

export async function GET(request: Request, context: RouteContext) {
  const auth = await authorizeApi(request);
  if ('response' in auth) return auth.response;
  try {
    const { id } = await context.params;
    const article = await getEditorArticle(id);
    if (!article) throw new RepositoryError(404, '글을 찾을 수 없습니다.');
    return Response.json({ article });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await authorizeApi(request, true);
  if ('response' in auth) return auth.response;
  try {
    const { id } = await context.params;
    const payload = actionSchema.parse(await request.json());
    const article =
      payload.action === 'save'
        ? await saveDraft(id, payload.input, payload.baseRevisionId, auth.user.userId)
        : payload.action === 'publish'
          ? await publishArticle(id, payload.baseRevisionId)
          : payload.action === 'archive'
            ? await archiveArticle(id, payload.baseRevisionId)
            : await restoreRevision(
                id,
                payload.revisionId,
                payload.baseRevisionId,
                auth.user.userId,
              );
    return Response.json({ article });
  } catch (error) {
    return errorResponse(error);
  }
}

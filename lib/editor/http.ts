import { z } from 'zod';

import { getEditorApiUser } from './auth';
import { RepositoryError } from './repository';

export const draftInputSchema = z.object({
  slug: z.string().max(160),
  title: z.string().max(160),
  description: z.string().max(400),
  author: z.string().max(120),
  publishedAt: z.string().max(20),
  updatedAt: z.string().max(20).optional(),
  cover: z
    .object({
      src: z.string().max(600),
      alt: z.string().max(400),
      caption: z.string().max(600).optional(),
    })
    .optional(),
  tags: z.array(z.string().max(80)).max(30),
  body: z.string().max(1_500_000),
});

export function errorResponse(error: unknown) {
  if (error instanceof RepositoryError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof z.ZodError) {
    return Response.json(
      { error: '입력값을 확인해주세요.', issues: error.issues },
      { status: 400 },
    );
  }
  console.error(error);
  return Response.json({ error: '요청을 처리하지 못했습니다.' }, { status: 500 });
}

export async function authorizeApi(request: Request, mutation = false) {
  if (mutation) {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) {
      return { response: Response.json({ error: '잘못된 요청 출처입니다.' }, { status: 403 }) };
    }
  }
  try {
    const result = await getEditorApiUser();
    if (!result.ok) {
      return {
        response: Response.json(
          { error: result.status === 401 ? '로그인이 필요합니다.' : '접근 권한이 없습니다.' },
          { status: result.status },
        ),
      };
    }
    return { user: result.user };
  } catch (error) {
    return { response: errorResponse(error) };
  }
}

import { compileDraft } from '@/lib/editor/validation';
import { authorizeApi, draftInputSchema, errorResponse } from '@/lib/editor/http';

export async function POST(request: Request) {
  const auth = await authorizeApi(request, true);
  if ('response' in auth) return auth.response;
  try {
    const input = draftInputSchema.parse(await request.json());
    return Response.json(await compileDraft(input));
  } catch (error) {
    return errorResponse(error);
  }
}

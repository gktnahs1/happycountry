import { getFilesBucket } from '@/db';
import { authorizeApi, errorResponse } from '@/lib/editor/http';
import { createAsset, listAssets } from '@/lib/editor/repository';
import { validateImageUpload } from '@/lib/editor/policies';

export async function GET(request: Request) {
  const auth = await authorizeApi(request);
  if ('response' in auth) return auth.response;
  try {
    return Response.json({ assets: await listAssets() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await authorizeApi(request, true);
  if ('response' in auth) return auth.response;
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return Response.json({ error: '이미지 파일이 필요합니다.' }, { status: 400 });
    }
    const uploadError = validateImageUpload(file.type, file.size);
    if (uploadError) return Response.json({ error: uploadError }, { status: 400 });
    const id = crypto.randomUUID();
    const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
    const r2Key = `editor/${id}.${extension}`;
    await getFilesBucket().put(r2Key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });
    const asset = await createAsset({
      id,
      r2Key,
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
      userId: auth.user.userId,
    });
    return Response.json({ asset }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

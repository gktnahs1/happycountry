import { getFilesBucket } from '@/db';
import { getAssetStorage } from '@/lib/editor/repository';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const asset = await getAssetStorage(id);
  if (!asset) return new Response('Not found', { status: 404 });
  const object = await getFilesBucket().get(asset.r2_key);
  if (!object) return new Response('Not found', { status: 404 });
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? asset.content_type,
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: object.httpEtag,
    },
  });
}

export const allowedImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

export const maxImageBytes = 10 * 1024 * 1024;

export function validateImageUpload(contentType: string, sizeBytes: number) {
  if (!allowedImageTypes.has(contentType)) {
    return 'JPEG, PNG, WebP, AVIF만 업로드할 수 있습니다.';
  }
  if (sizeBytes > maxImageBytes) return '이미지는 10MB 이하여야 합니다.';
  return null;
}

export function revisionMatches(currentRevisionId: string | null, baseRevisionId: string) {
  return currentRevisionId === baseRevisionId;
}

export function slugChangeAllowed(
  hasPublished: boolean,
  currentSlug: string | null,
  nextSlug: string,
) {
  return !hasPublished || nextSlug === currentSlug;
}

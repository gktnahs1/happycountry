import { env } from 'cloudflare:workers';

export function getD1() {
  const workerEnv = env as unknown as { DB?: D1Database };
  if (!workerEnv.DB) throw new Error('Cloudflare D1 binding `DB` is unavailable.');
  return workerEnv.DB;
}

export function getFilesBucket() {
  const workerEnv = env as unknown as { FILES?: R2Bucket };
  if (!workerEnv.FILES) throw new Error('Cloudflare R2 binding `FILES` is unavailable.');
  return workerEnv.FILES;
}

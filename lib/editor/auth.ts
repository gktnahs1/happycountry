import { env } from 'cloudflare:workers';

import { getChatGPTUser, requireChatGPTUser } from '@/app/chatgpt-auth';

function isOwner(email: string) {
  const workerEnv = env as unknown as { EDITOR_OWNER_EMAIL?: string };
  const ownerEmail = workerEnv.EDITOR_OWNER_EMAIL?.trim().toLocaleLowerCase('en-US');
  if (!ownerEmail) throw new Error('EDITOR_OWNER_EMAIL is not configured.');
  return email.trim().toLocaleLowerCase('en-US') === ownerEmail;
}

export async function requireEditorPage(returnTo: string) {
  const user = await requireChatGPTUser(returnTo);
  return isOwner(user.email) ? user : null;
}

export async function getEditorApiUser() {
  const user = await getChatGPTUser();
  if (!user) return { ok: false as const, status: 401 as const };
  if (!isOwner(user.email)) return { ok: false as const, status: 403 as const };
  return { ok: true as const, user };
}

declare module 'cloudflare:workers' {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      FILES: R2Bucket;
      EDITOR_OWNER_EMAIL?: string;
    }
  }
}

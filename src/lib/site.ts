// src/lib/site.ts
// Canonical public URL of the site, used by metadata, sitemap and JSON-LD.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
).replace(/\/$/, '')

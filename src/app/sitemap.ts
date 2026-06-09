// src/app/sitemap.ts
import type { MetadataRoute } from 'next'
import { getAllSlugs } from '@/lib/content'
import { SITE_URL } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const statiques: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/recherche`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/contribuer`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/a-propos`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/accessibilite`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/mentions-legales`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.3 },
  ]

  const plages: MetadataRoute.Sitemap = getAllSlugs().map((slug) => ({
    url: `${SITE_URL}/plage/${slug}`,
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  return [...statiques, ...plages]
}

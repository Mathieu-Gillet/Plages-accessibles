// scripts/enrich-photos.ts
// One-shot script: walks content/plages/*.json, queries Wikimedia Commons for a
// real photo of each beach, and updates the file in place.
//
// Run: `npx tsx scripts/enrich-photos.ts [--force]`
//   --force   re-fetch even if the photo already comes from Wikimedia
//   default   only enriches plages with no photo or a picsum.photos fallback
//
// Idempotent: re-running doesn't re-query plages that already have a wikipedia photo
// (unless --force).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fetchBeachPhoto } from './lib/wikimedia'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'plages')

interface BeachJson {
  slug: string
  nom: string
  commune: string
  photo?: string | null
  [key: string]: unknown
}

function isPlaceholder(url: string | null | undefined): boolean {
  if (!url) return true
  return url.includes('picsum.photos')
}

function isWikimedia(url: string | null | undefined): boolean {
  return !!url && url.includes('upload.wikimedia.org')
}

async function main(): Promise<void> {
  const force = process.argv.includes('--force')
  const files = (await fs.readdir(CONTENT_DIR)).filter((f) => f.endsWith('.json'))

  let enriched = 0
  let skipped = 0
  let notFound = 0

  for (const file of files) {
    const full = path.join(CONTENT_DIR, file)
    const data = JSON.parse(await fs.readFile(full, 'utf8')) as BeachJson

    if (!force && isWikimedia(data.photo)) {
      console.log(`[skip] ${data.slug} déjà sur wikimedia`)
      skipped++
      continue
    }
    if (!force && data.photo && !isPlaceholder(data.photo)) {
      console.log(`[skip] ${data.slug} a déjà une photo non-placeholder`)
      skipped++
      continue
    }

    process.stdout.write(`[fetch] ${data.slug} ... `)
    const url = await fetchBeachPhoto({ nom: data.nom, commune: data.commune })

    if (url) {
      data.photo = url
      await fs.writeFile(full, JSON.stringify(data, null, 2) + '\n', 'utf8')
      console.log('OK')
      enriched++
    } else {
      console.log('rien trouvé (placeholder conservé)')
      notFound++
    }

    // Be polite with the Wikimedia API: small pause between calls.
    await new Promise((r) => setTimeout(r, 300))
  }

  console.log(`\nEnrichies : ${enriched}  |  Skippées : ${skipped}  |  Sans photo réelle : ${notFound}`)
}

main().catch((err) => {
  console.error('Erreur fatale :', err)
  process.exit(1)
})

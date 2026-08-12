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
import { fetchBeachPhoto, isOffTopicPhoto } from './lib/wikimedia'
import { chargerPhotosRejetees } from './lib/photos-rejetees'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'plages')

interface BeachJson {
  slug: string
  nom: string
  commune: string
  latitude?: number
  longitude?: number
  photo?: string | null
  [key: string]: unknown
}

function isPlaceholder(url: string | null | undefined): boolean {
  if (!url) return true
  return url.includes('picsum.photos')
}

/** Neutral placeholder — deterministic per beach, better than a misleading photo. */
function placeholderFor(slug: string): string {
  return `https://picsum.photos/seed/${slug}/1200/600`
}

/**
 * A photo needs (re)fetching when it is a placeholder OR an off-topic Wikimedia
 * image (mairie/église/pont…) that slipped in before the relevance filter existed.
 */
function needsEnrichment(url: string | null | undefined): boolean {
  return isPlaceholder(url) || (!!url && isOffTopicPhoto(url))
}

async function main(): Promise<void> {
  const force = process.argv.includes('--force')
  const files = (await fs.readdir(CONTENT_DIR)).filter((f) => f.endsWith('.json'))

  // Images déjà écartées après relecture : la recherche Wikimedia étant
  // déterministe, sans cette exclusion le cron les réattribuerait à l'identique.
  const rejetees = await chargerPhotosRejetees()
  if (rejetees.size > 0) {
    console.log(`${rejetees.size} images exclues (content/photos-rejetees.json)`)
  }

  // Photos déjà attribuées. Sans ce relevé, deux plages d'une même commune
  // héritent du même cliché : la recherche Wikimedia est déterministe et rend
  // le même premier résultat. `import-plages.ts` s'en prémunit déjà, pas ce
  // script — d'où trois plages de Mimizan illustrées à l'identique.
  const dejaUtilisees = new Set<string>()
  for (const file of files) {
    const data = JSON.parse(await fs.readFile(path.join(CONTENT_DIR, file), 'utf8')) as BeachJson
    if (data.photo && !isPlaceholder(data.photo)) dejaUtilisees.add(data.photo)
  }

  let enriched = 0
  let skipped = 0
  let notFound = 0
  let cleaned = 0

  for (const file of files) {
    const full = path.join(CONTENT_DIR, file)
    const data = JSON.parse(await fs.readFile(full, 'utf8')) as BeachJson

    // In non-force mode, only touch beaches that actually need it: placeholder
    // photos and off-topic Wikimedia images (mairie/église/…).
    if (!force && !needsEnrichment(data.photo)) {
      skipped++
      continue
    }

    const wasOffTopic = !!data.photo && isOffTopicPhoto(data.photo)
    process.stdout.write(`[fetch] ${data.slug}${wasOffTopic ? ' (hors-sujet)' : ''} ... `)
    const url = await fetchBeachPhoto({
      nom: data.nom,
      commune: data.commune,
      // Ouvre la recherche géographique, seule voie pour les baignades
      // intérieures dont le nom ne dit ni « plage » ni la commune.
      latitude: data.latitude,
      longitude: data.longitude,
      excludeUrls: new Set([...rejetees, ...dejaUtilisees]),
    })

    if (url) {
      data.photo = url
      dejaUtilisees.add(url)
      await fs.writeFile(full, JSON.stringify(data, null, 2) + '\n', 'utf8')
      console.log('OK')
      enriched++
    } else if (wasOffTopic) {
      // No reliable beach photo found — a neutral placeholder is still better
      // than a misleading town-hall/church photo.
      data.photo = placeholderFor(data.slug)
      await fs.writeFile(full, JSON.stringify(data, null, 2) + '\n', 'utf8')
      console.log('hors-sujet remplacé par placeholder')
      cleaned++
    } else {
      console.log('rien trouvé (placeholder conservé)')
      notFound++
    }

    // Be polite with the Wikimedia API: small pause between calls.
    await new Promise((r) => setTimeout(r, 300))
  }

  console.log(
    `\nEnrichies : ${enriched}  |  Hors-sujet nettoyées : ${cleaned}  |  Skippées : ${skipped}  |  Sans photo réelle : ${notFound}`,
  )
}

main().catch((err) => {
  console.error('Erreur fatale :', err)
  process.exit(1)
})

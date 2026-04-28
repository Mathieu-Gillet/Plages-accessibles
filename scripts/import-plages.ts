// scripts/import-plages.ts
// Daily beach import orchestrator. Run as: `npx tsx scripts/import-plages.ts [--dry-run]`
//
// Pipeline:
//   1. Read existing slugs from content/plages/*.json
//   2. Fetch raw candidates from each registered source
//   3. Drop candidates whose slug already exists
//   4. Validate each remaining candidate (Zod + quality gates)
//   5. Take up to MAX_PER_RUN qualified candidates
//   6. Write each as a JSON file under content/plages/
//   7. Emit a summary to stdout AND to GITHUB_OUTPUT (for the workflow)
//
// Exit code is always 0 — even with 0 added — so the workflow can decide
// whether to open a PR based on the `added` output.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { handiplageSampleSource } from './sources/handiplage-sample'
import { handiplageLiveSource } from './sources/handiplage-live'
import { tourismeHandicapSource } from './sources/tourisme-handicap'
import { acceslibreSource } from './sources/acceslibre'
import { openStreetMapSource } from './sources/openstreetmap'
import { dataTourismeSource } from './sources/datatourisme'
import type { Source } from './sources/types'
import { validateCandidate, type Candidate } from './lib/validate-candidate'
import { fetchBeachPhoto } from './lib/wikimedia'
import { generateDescription, isAiDescriptionAvailable } from './lib/ai-description'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'plages')
const MAX_PER_RUN = 5

// Order matters: inter-source dedup keeps the first occurrence of each slug.
// We prioritise official labels (Handiplage, Tourisme & Handicap) over
// crowd-sourced data (OSM), over curated fallbacks (sample list).
const SOURCES: Source[] = [
  handiplageLiveSource,    // handiplage.fr — HTML scraper, official Handiplage label
  tourismeHandicapSource,  // data.economie.gouv.fr — label Tourisme & Handicap
  acceslibreSource,        // acceslibre.beta.gouv.fr — physical accessibility data
  dataTourismeSource,      // public.opendatasoft.com — DataTourisme national POI feed
  openStreetMapSource,     // overpass-api.de — crowd-sourced wheelchair-tagged beaches
  handiplageSampleSource,  // curated fallback — exhausted once live sources stabilise
]

interface RunSummary {
  added: string[]
  skippedDuplicates: string[]
  rejected: Array<{ slug: string; reason: string }>
  capped: number
  deleted: string[]
}

interface BeachFile {
  slug: string
  file: string
  photo?: string
  latitude?: number
  longitude?: number
}

async function readAllBeaches(): Promise<BeachFile[]> {
  const files = await fs.readdir(CONTENT_DIR)
  const beaches: BeachFile[] = []
  for (const f of files.filter((f) => f.endsWith('.json'))) {
    try {
      const raw = await fs.readFile(path.join(CONTENT_DIR, f), 'utf8')
      const data = JSON.parse(raw) as { photo?: string; latitude?: number; longitude?: number }
      beaches.push({
        slug: f.replace(/\.json$/, ''),
        file: path.join(CONTENT_DIR, f),
        photo: data.photo,
        latitude: data.latitude,
        longitude: data.longitude,
      })
    } catch { /* ignore malformed file */ }
  }
  return beaches
}

async function readExistingSlugs(): Promise<Set<string>> {
  const beaches = await readAllBeaches()
  return new Set(beaches.map((b) => b.slug))
}

/** Remove duplicate beach files already on disk (same photo URL or same GPS cell). */
async function cleanupDuplicates(summary: RunSummary, dryRun: boolean): Promise<void> {
  const beaches = await readAllBeaches()

  const deletedFiles = new Set<string>()

  // 1. Dedup by identical photo URL (picsum uses unique slug-based seeds, skip those).
  const byPhoto = new Map<string, BeachFile[]>()
  for (const b of beaches) {
    if (!b.photo || b.photo.includes('picsum.photos')) continue
    const group = byPhoto.get(b.photo) ?? []
    group.push(b)
    byPhoto.set(b.photo, group)
  }
  for (const [, group] of byPhoto) {
    if (group.length <= 1) continue
    group.sort((a, b) => a.slug.localeCompare(b.slug))
    for (const dupe of group.slice(1)) {
      if (deletedFiles.has(dupe.file)) continue
      if (!dryRun) await fs.unlink(dupe.file)
      deletedFiles.add(dupe.file)
      summary.deleted.push(dupe.slug)
      console.log(`[dedup] doublon photo supprimé : ${dupe.slug}`)
    }
  }

  // 2. Dedup by GPS proximity (±0.001° ≈ 100 m cell).
  const geoKey = (b: BeachFile) =>
    `${Math.round((b.latitude ?? 0) * 1000)},${Math.round((b.longitude ?? 0) * 1000)}`
  const byGeo = new Map<string, BeachFile[]>()
  for (const b of beaches) {
    if (!b.latitude || !b.longitude) continue
    const k = geoKey(b)
    const group = byGeo.get(k) ?? []
    group.push(b)
    byGeo.set(k, group)
  }
  for (const [, group] of byGeo) {
    if (group.length <= 1) continue
    group.sort((a, b) => a.slug.localeCompare(b.slug))
    for (const dupe of group.slice(1)) {
      if (deletedFiles.has(dupe.file)) continue
      try {
        if (!dryRun) await fs.unlink(dupe.file)
        deletedFiles.add(dupe.file)
        summary.deleted.push(dupe.slug)
        console.log(`[dedup] doublon GPS supprimé : ${dupe.slug}`)
      } catch { /* already deleted */ }
    }
  }
}

async function gatherCandidates(): Promise<Candidate[]> {
  const all: Candidate[] = []
  for (const source of SOURCES) {
    try {
      const items = await source.fetch()
      console.log(`[source ${source.name}] ${items.length} candidat(s)`)
      all.push(...items)
    } catch (err) {
      console.error(`[source ${source.name}] échec : ${(err as Error).message}`)
    }
  }
  // Dedup across sources by slug (first occurrence wins).
  const seen = new Set<string>()
  return all.filter((c) => {
    if (seen.has(c.slug)) return false
    seen.add(c.slug)
    return true
  })
}

async function writeBeach(slug: string, data: unknown): Promise<void> {
  const file = path.join(CONTENT_DIR, `${slug}.json`)
  await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

async function appendGithubOutput(key: string, value: string): Promise<void> {
  const out = process.env.GITHUB_OUTPUT
  if (!out) return
  await fs.appendFile(out, `${key}=${value}\n`)
}

function printSummary(summary: RunSummary, dryRun: boolean): void {
  console.log('\n=== Récapitulatif ===')
  console.log(`Ajoutées      : ${summary.added.length}${dryRun ? ' (dry-run, non écrites)' : ''}`)
  summary.added.forEach((s) => console.log(`  + ${s}`))
  console.log(`Doublons supprimés : ${summary.deleted.length}`)
  summary.deleted.forEach((s) => console.log(`  x ${s}`))
  console.log(`Doublons skippés   : ${summary.skippedDuplicates.length}`)
  summary.skippedDuplicates.forEach((s) => console.log(`  ~ ${s}`))
  console.log(`Rejetées      : ${summary.rejected.length}`)
  summary.rejected.forEach((r) => console.log(`  - ${r.slug} : ${r.reason}`))
  if (summary.capped > 0) {
    console.log(`Plafond MAX_PER_RUN=${MAX_PER_RUN} atteint, ${summary.capped} candidat(s) reportés à demain`)
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')
  const summary: RunSummary = {
    added: [],
    skippedDuplicates: [],
    rejected: [],
    capped: 0,
    deleted: [],
  }

  if (isAiDescriptionAvailable()) {
    console.log('[ai-description] enrichissement actif (claude-haiku-4-5)')
  } else {
    console.log('[ai-description] ANTHROPIC_API_KEY absent — descriptions template conservées')
  }

  // Remove duplicates already on disk before computing the slug index.
  await cleanupDuplicates(summary, dryRun)

  const existingSlugs = await readExistingSlugs()
  console.log(`[index] ${existingSlugs.size} plage(s) déjà en base`)

  // Collect every photo URL already in use so new beaches don't reuse them.
  const usedPhotos = new Set<string>(
    (await readAllBeaches())
      .map((b) => b.photo)
      .filter((p): p is string => !!p),
  )

  const candidates = await gatherCandidates()
  console.log(`[total] ${candidates.length} candidat(s) uniques après dedup inter-sources`)

  let qualifiedCount = 0
  for (const candidate of candidates) {
    if (existingSlugs.has(candidate.slug)) {
      summary.skippedDuplicates.push(candidate.slug)
      continue
    }

    const aiDesc = await generateDescription({
      nom: candidate.nom,
      commune: candidate.commune,
      accessibilites: (candidate.accessibilites ?? []) as Parameters<typeof generateDescription>[0]['accessibilites'],
      nativeText: candidate.description,
      verifiedBy: candidate.verifiedBy,
    })
    const enrichedCandidate = aiDesc ? { ...candidate, description: aiDesc } : candidate

    const result = validateCandidate(enrichedCandidate)
    if (!result.ok) {
      summary.rejected.push({ slug: result.slug, reason: result.reason })
      continue
    }

    if (qualifiedCount >= MAX_PER_RUN) {
      summary.capped++
      continue
    }

    // Try to upgrade the placeholder photo with a real Wikimedia Commons one.
    // Exclude URLs already used by other beaches to avoid photo duplicates.
    const realPhoto = await fetchBeachPhoto({
      nom: result.plage.nom,
      commune: result.plage.commune,
      excludeUrls: usedPhotos,
    })
    const chosenPhoto = realPhoto ?? result.plage.photo
    const finalPlage = realPhoto ? { ...result.plage, photo: realPhoto } : result.plage
    // Register the chosen photo so the next beach won't reuse it.
    if (chosenPhoto) usedPhotos.add(chosenPhoto)

    if (!dryRun) {
      await writeBeach(finalPlage.slug, finalPlage)
    }
    summary.added.push(finalPlage.slug)
    qualifiedCount++
  }

  printSummary(summary, dryRun)

  // Expose machine-readable outputs for the GitHub Actions workflow.
  await appendGithubOutput('added', String(summary.added.length))
  await appendGithubOutput('rejected', String(summary.rejected.length))
  await appendGithubOutput('slugs', summary.added.join(','))
}

main().catch((err) => {
  console.error('Erreur fatale :', err)
  process.exit(1)
})

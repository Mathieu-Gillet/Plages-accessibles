// scripts/lib/dedup.ts
// Shared beach deduplication logic used by both import-plages.ts and dedup-plages.ts.
//
// Two criteria:
//   1. Same photo URL (picsum placeholder excluded — it uses slug as seed, so always unique)
//   2. GPS proximity < GEO_DEDUP_KM (handles "Plage d'Ondres" vs "Ondres Océan" etc.)
//
// When two records are merged, the one with more accessibility features is kept.

import { promises as fs } from 'node:fs'
import path from 'node:path'

export const CONTENT_DIR = path.join(process.cwd(), 'content', 'plages')

/** Physical distance threshold — two beaches within this radius are considered the same. */
const GEO_DEDUP_KM = 0.5

export interface BeachFile {
  slug: string
  file: string
  photo?: string
  latitude?: number
  longitude?: number
  accessibilitesCount: number
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dlat = (lat2 - lat1) * 111
  const dlon = (lon2 - lon1) * 111 * Math.cos((lat1 * Math.PI) / 180)
  return Math.sqrt(dlat * dlat + dlon * dlon)
}

export async function readAllBeaches(dir = CONTENT_DIR): Promise<BeachFile[]> {
  let files: string[]
  try {
    files = await fs.readdir(dir)
  } catch {
    return []
  }
  const beaches: BeachFile[] = []
  for (const f of files.filter((f) => f.endsWith('.json'))) {
    try {
      const raw = await fs.readFile(path.join(dir, f), 'utf8')
      const data = JSON.parse(raw) as {
        photo?: string
        latitude?: number
        longitude?: number
        accessibilites?: unknown[]
      }
      beaches.push({
        slug: f.replace(/\.json$/, ''),
        file: path.join(dir, f),
        photo: data.photo,
        latitude: data.latitude,
        longitude: data.longitude,
        accessibilitesCount: data.accessibilites?.length ?? 0,
      })
    } catch { /* ignore malformed file */ }
  }
  return beaches
}

export interface DedupResult {
  deleted: string[]
}

export async function dedupBeaches(beaches: BeachFile[], dryRun: boolean): Promise<DedupResult> {
  const result: DedupResult = { deleted: [] }
  const deletedFiles = new Set<string>()

  // 1. Dedup by identical photo URL.
  const byPhoto = new Map<string, BeachFile[]>()
  for (const b of beaches) {
    if (!b.photo || b.photo.includes('picsum.photos')) continue
    const group = byPhoto.get(b.photo) ?? []
    group.push(b)
    byPhoto.set(b.photo, group)
  }
  for (const [, group] of byPhoto) {
    if (group.length <= 1) continue
    // Keep richest; tiebreak alphabetically.
    group.sort(
      (a, b) => (b.accessibilitesCount - a.accessibilitesCount) || a.slug.localeCompare(b.slug),
    )
    for (const dupe of group.slice(1)) {
      if (deletedFiles.has(dupe.file)) continue
      if (!dryRun) await fs.unlink(dupe.file).catch(() => {})
      deletedFiles.add(dupe.file)
      result.deleted.push(dupe.slug)
      console.log(`[dedup] photo dupliquée supprimée : ${dupe.slug}`)
    }
  }

  // 2. Dedup by GPS proximity — O(n²) but n < 1000 so negligible.
  const withGeo = beaches.filter((b) => b.latitude && b.longitude)
  for (let i = 0; i < withGeo.length; i++) {
    const a = withGeo[i]
    if (deletedFiles.has(a.file)) continue
    for (let j = i + 1; j < withGeo.length; j++) {
      const b = withGeo[j]
      if (deletedFiles.has(b.file)) continue
      const km = distanceKm(a.latitude!, a.longitude!, b.latitude!, b.longitude!)
      if (km >= GEO_DEDUP_KM) continue
      // Keep the richer beach; tiebreak: keep whichever slug sorts first.
      const toDelete =
        b.accessibilitesCount > a.accessibilitesCount ? a
        : a.accessibilitesCount > b.accessibilitesCount ? b
        : a.slug.localeCompare(b.slug) <= 0 ? b : a
      if (deletedFiles.has(toDelete.file)) continue
      if (!dryRun) await fs.unlink(toDelete.file).catch(() => {})
      deletedFiles.add(toDelete.file)
      result.deleted.push(toDelete.slug)
      console.log(
        `[dedup] doublon GPS ${km.toFixed(2)} km supprimé : ${toDelete.slug}` +
          ` (gardé : ${toDelete === a ? b.slug : a.slug})`,
      )
      // If a was deleted, stop comparing a against further beaches.
      if (toDelete === a) break
    }
  }

  return result
}

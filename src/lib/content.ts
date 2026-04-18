// src/lib/content.ts
// Filesystem content loader — replaces Prisma queries.
// Reads content/plages/*.json at build time, validates each via Zod,
// caches in module scope for the lifetime of the server process.
import 'server-only'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  plageContentSchema,
  type PlageContent,
  TYPES_ACCESSIBILITE,
} from './content-schema'
import type {
  PlageDetail,
  PlageResume,
  TypeAccessibilite,
  Hebergement,
  OffreCulturelle,
  Avis,
} from '@/types'

const CONTENT_DIR = join(process.cwd(), 'content', 'plages')

let cache: PlageDetail[] | null = null

/** Read + validate every JSON file under content/plages/. Throws on first invalid file. */
function loadAll(): PlageDetail[] {
  if (cache) return cache

  const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'))
  const plages: PlageDetail[] = []

  for (const file of files) {
    const path = join(CONTENT_DIR, file)
    const raw = readFileSync(path, 'utf-8')
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch (err) {
      throw new Error(`Invalid JSON in ${file}: ${(err as Error).message}`)
    }
    const result = plageContentSchema.safeParse(parsed)
    if (!result.success) {
      throw new Error(
        `Invalid content in ${file}:\n${result.error.errors.map((e) => `  - ${e.path.join('.')}: ${e.message}`).join('\n')}`,
      )
    }
    if (!result.data.actif) continue // skip drafts
    plages.push(toPlageDetail(result.data))
  }

  // Stable order: rating desc, then name asc.
  plages.sort((a, b) => b.noteGlobale - a.noteGlobale || a.nom.localeCompare(b.nom))
  cache = plages
  return cache
}

function toPlageDetail(raw: PlageContent): PlageDetail {
  const id = raw.slug // slug is the stable, human-readable id

  const accessibilites: TypeAccessibilite[] = raw.accessibilites
    .map((a) => (typeof a === 'string' ? a : a.disponible ? a.type : null))
    .filter((t): t is TypeAccessibilite => t !== null && TYPES_ACCESSIBILITE.includes(t as TypeAccessibilite))

  const hebergements: Hebergement[] = raw.hebergements
    .map((h, idx) => ({ id: `${raw.slug}-h-${idx}`, ...h }))
    .sort((a, b) => a.distanceKm - b.distanceKm)

  const offresCulturelles: OffreCulturelle[] = raw.offresCulturelles
    .map((o, idx) => ({ id: `${raw.slug}-o-${idx}`, ...o }))
    .sort((a, b) => a.distanceKm - b.distanceKm)

  const avis: Avis[] = raw.avis
    .map((a, idx) => ({ id: `${raw.slug}-a-${idx}`, ...a, date: new Date(a.date) }))
    .sort((a, b) => b.date.getTime() - a.date.getTime())

  return {
    id,
    nom: raw.nom,
    slug: raw.slug,
    description: raw.description ?? null,
    commune: raw.commune,
    codePostal: raw.codePostal,
    departement: raw.departement,
    region: raw.region,
    latitude: raw.latitude,
    longitude: raw.longitude,
    photo: raw.photo ?? null,
    photos: raw.photos,
    noteGlobale: raw.noteGlobale,
    nombreAvis: raw.nombreAvis,
    accessibilites,
    hebergements,
    offresCulturelles,
    avis,
  }
}

function toResume(p: PlageDetail): PlageResume {
  return {
    id: p.id,
    nom: p.nom,
    slug: p.slug,
    commune: p.commune,
    departement: p.departement,
    region: p.region,
    latitude: p.latitude,
    longitude: p.longitude,
    noteGlobale: p.noteGlobale,
    nombreAvis: p.nombreAvis,
    photo: p.photo,
    accessibilites: p.accessibilites,
  }
}

// ─── Public API (mirrors the previous Prisma-based call sites) ───

export function getAllPlages(): PlageDetail[] {
  return loadAll()
}

export function getAllPlagesResume(): PlageResume[] {
  return loadAll().map(toResume)
}

export function getPlageBySlug(slug: string): PlageDetail | null {
  return loadAll().find((p) => p.slug === slug) ?? null
}

export function getAllSlugs(): string[] {
  return loadAll().map((p) => p.slug)
}

export function getRegions(): string[] {
  return Array.from(new Set(loadAll().map((p) => p.region))).sort((a, b) => a.localeCompare(b))
}

export function getDepartements(region?: string): string[] {
  const filtered = region ? loadAll().filter((p) => p.region === region) : loadAll()
  return Array.from(new Set(filtered.map((p) => p.departement))).sort((a, b) => a.localeCompare(b))
}

export function getStats(): { totalPlages: number; totalRegions: number } {
  const all = loadAll()
  return {
    totalPlages: all.length,
    totalRegions: new Set(all.map((p) => p.region)).size,
  }
}

export interface SearchFilter {
  region?: string
  departement?: string
  q?: string
  page?: number
  pageSize?: number
}

export function searchPlages(filter: SearchFilter): { plages: PlageResume[]; total: number } {
  const { region, departement, q, page = 1, pageSize = 12 } = filter
  const needle = q?.trim().toLowerCase()
  const filtered = loadAll().filter((p) => {
    if (region && p.region !== region) return false
    if (departement && p.departement !== departement) return false
    if (needle) {
      const haystack = `${p.nom} ${p.commune} ${p.departement}`.toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    return true
  })
  const start = (page - 1) * pageSize
  return {
    plages: filtered.slice(start, start + pageSize).map(toResume),
    total: filtered.length,
  }
}

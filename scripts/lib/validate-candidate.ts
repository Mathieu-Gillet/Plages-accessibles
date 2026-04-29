// scripts/lib/validate-candidate.ts
// Validates a raw candidate from a source against the content schema PLUS
// extra editorial quality gates (well-documented beaches only).

import { plageContentSchema, type PlageContent } from '../../src/lib/content-schema'

// Bounding boxes to keep candidates inside French territory (metropolitan + DOM-TOM).
// Loose ranges — the goal is to reject obvious garbage (e.g. lat 0/0), not to be cartographically exact.
const FRENCH_BBOXES: Array<{ name: string; latMin: number; latMax: number; lonMin: number; lonMax: number }> = [
  { name: 'metropole', latMin: 41, latMax: 51.5, lonMin: -5.5, lonMax: 9.7 },
  { name: 'corse', latMin: 41, latMax: 43.2, lonMin: 8.4, lonMax: 9.7 },
  { name: 'guadeloupe', latMin: 15.8, latMax: 16.6, lonMin: -61.9, lonMax: -61 },
  { name: 'martinique', latMin: 14.3, latMax: 14.9, lonMin: -61.3, lonMax: -60.7 },
  { name: 'guyane', latMin: 2, latMax: 6, lonMin: -55, lonMax: -51.5 },
  { name: 'reunion', latMin: -21.5, latMax: -20.8, lonMin: 55.2, lonMax: 55.9 },
  { name: 'mayotte', latMin: -13.1, latMax: -12.6, lonMin: 45, lonMax: 45.4 },
]

// Source labels considered "validated" — only these can be the verifiedBy of an auto-imported beach.
// Order: official French labels, then public gov data, then crowd-sourced (traceable back to OSM history).
const ALLOWED_SOURCES = new Set([
  'handiplage.fr',
  'tourisme-handicap',
  'data.gouv.fr',
  'datatourisme',
  'openstreetmap',
])

const MIN_DESCRIPTION_LENGTH = 150
const MIN_ACCESSIBILITES = 2

export interface Candidate extends Partial<PlageContent> {
  // A candidate must at least carry these fields from its source; everything else can be defaulted.
  slug: string
  nom: string
  commune: string
  codePostal: string
  departement: string
  region: string
  latitude: number
  longitude: number
  verifiedBy: string
}

export type ValidationResult =
  | { ok: true; plage: PlageContent }
  | { ok: false; slug: string; reason: string }

function isInsideFrance(lat: number, lon: number): boolean {
  return FRENCH_BBOXES.some(
    (b) => lat >= b.latMin && lat <= b.latMax && lon >= b.lonMin && lon <= b.lonMax
  )
}

function upgradeHttps(url: string | undefined): string | undefined {
  if (!url) return url
  return url.startsWith('http://') ? 'https://' + url.slice(7) : url
}

export function validateCandidate(raw: Candidate): ValidationResult {
  // Quality gate 1 — source must be allowlisted
  if (!ALLOWED_SOURCES.has(raw.verifiedBy)) {
    return { ok: false, slug: raw.slug, reason: `source non labellisée : "${raw.verifiedBy}"` }
  }

  // Quality gate 2 — GPS inside France
  if (!isInsideFrance(raw.latitude, raw.longitude)) {
    return {
      ok: false,
      slug: raw.slug,
      reason: `coordonnées hors France (lat=${raw.latitude}, lon=${raw.longitude})`,
    }
  }

  // Quality gate 3 — description sufficiently documented
  const description = raw.description ?? ''
  if (description.trim().length < MIN_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      slug: raw.slug,
      reason: `description trop courte (${description.trim().length} < ${MIN_DESCRIPTION_LENGTH} chars)`,
    }
  }

  // Quality gate 4 — at least 2 accessibility features
  const accessibilites = raw.accessibilites ?? []
  if (accessibilites.length < MIN_ACCESSIBILITES) {
    return {
      ok: false,
      slug: raw.slug,
      reason: `pas assez d'accessibilités documentées (${accessibilites.length} < ${MIN_ACCESSIBILITES})`,
    }
  }

  // Final gate — Zod schema (catches malformed slugs, codePostal, types, etc.)
  const today = new Date().toISOString().slice(0, 10)
  const draft = {
    ...raw,
    verifiedAt: raw.verifiedAt ?? today,
    actif: raw.actif ?? true,
    noteGlobale: raw.noteGlobale ?? 0,
    nombreAvis: raw.nombreAvis ?? 0,
    photos: (raw.photos ?? []).map((p) => (p.startsWith('http://') ? 'https://' + p.slice(7) : p)),
    hebergements: (raw.hebergements ?? []).map((h) => ({ ...h, siteWeb: upgradeHttps(h.siteWeb) })),
    offresCulturelles: (raw.offresCulturelles ?? []).map((o) => ({ ...o, siteWeb: upgradeHttps(o.siteWeb) })),
    avis: raw.avis ?? [],
  }
  const parsed = plageContentSchema.safeParse(draft)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return {
      ok: false,
      slug: raw.slug,
      reason: `schéma invalide : ${issue.path.join('.')} — ${issue.message}`,
    }
  }

  return { ok: true, plage: parsed.data }
}

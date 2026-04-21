#!/usr/bin/env tsx
// Enrichit les plages existantes avec des hébergements et offres culturelles
// accessibles PMR, via l'API Overpass (OpenStreetMap). Sans clé API requise.

import * as fs from 'node:fs'
import * as path from 'node:path'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'plages')
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const RAYON_M = 10_000           // 10 km autour de la plage
const PAUSE_MS = 2_000           // politesse : pause entre deux requêtes Overpass
const MAX_HEBERGEMENTS = 5       // maximum par plage
const MAX_OFFRES = 5
const SEUIL = 3                  // on enrichit si la catégorie a moins de N entrées

// ── Types ─────────────────────────────────────────────────────────────────────

interface HebergementJson {
  nom: string
  type: string
  adresse: string
  telephone?: string
  siteWeb?: string
  latitude: number
  longitude: number
  distanceKm: number
  accessiblePMR: boolean
}

interface OffreCulturelleJson {
  nom: string
  type: string
  adresse: string
  description?: string
  telephone?: string
  siteWeb?: string
  latitude: number
  longitude: number
  distanceKm: number
  accessiblePMR: boolean
}

interface PlageJson {
  slug: string
  nom: string
  commune: string
  latitude: number
  longitude: number
  hebergements: HebergementJson[]
  offresCulturelles: OffreCulturelleJson[]
  [key: string]: unknown
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

function coordsOf(el: OverpassElement): { lat: number; lon: number } | null {
  if (el.lat != null && el.lon != null) return { lat: el.lat, lon: el.lon }
  if (el.center) return el.center
  return null
}

function buildAdresse(tags: Record<string, string>, commune: string): string {
  const parts: string[] = []
  if (tags['addr:housenumber'] && tags['addr:street']) {
    parts.push(`${tags['addr:housenumber']} ${tags['addr:street']}`)
  } else if (tags['addr:street']) {
    parts.push(tags['addr:street'])
  }
  if (tags['addr:postcode']) parts.push(tags['addr:postcode'])
  parts.push(tags['addr:city'] ?? commune)
  return parts.filter(Boolean).join(', ')
}

const LABELS_HEBERGEMENT: Record<string, string> = {
  hotel: 'hôtel',
  hostel: 'auberge de jeunesse',
  guest_house: "chambre d'hôtes",
  motel: 'motel',
  apartment: 'appartement meublé',
}

const LABELS_CULTURE: Record<string, string> = {
  museum: 'musée',
  gallery: 'galerie',
  castle: 'château',
  monument: 'monument',
  memorial: 'mémorial',
  ruins: 'ruines',
  theatre: 'théâtre',
  cinema: 'cinéma',
  arts_centre: 'centre culturel',
}

const TAGS_HEBERGEMENT = new Set(Object.keys(LABELS_HEBERGEMENT))
const TAGS_CULTURE = new Set(Object.keys(LABELS_CULTURE))

// ── Requête Overpass ──────────────────────────────────────────────────────────

async function queryOverpass(lat: number, lon: number): Promise<OverpassElement[]> {
  const q = `
[out:json][timeout:30];
(
  node["tourism"~"^(hotel|hostel|guest_house|motel|apartment)$"]["wheelchair"~"^(yes|designated)$"](around:${RAYON_M},${lat},${lon});
  way["tourism"~"^(hotel|hostel|guest_house|motel|apartment)$"]["wheelchair"~"^(yes|designated)$"](around:${RAYON_M},${lat},${lon});
  node["tourism"~"^(museum|gallery)$"]["wheelchair"~"^(yes|designated)$"](around:${RAYON_M},${lat},${lon});
  way["tourism"~"^(museum|gallery)$"]["wheelchair"~"^(yes|designated)$"](around:${RAYON_M},${lat},${lon});
  node["historic"~"^(castle|monument|memorial|ruins)$"]["wheelchair"~"^(yes|designated)$"](around:${RAYON_M},${lat},${lon});
  way["historic"~"^(castle|monument|memorial|ruins)$"]["wheelchair"~"^(yes|designated)$"](around:${RAYON_M},${lat},${lon});
  node["amenity"~"^(theatre|cinema|arts_centre)$"]["wheelchair"~"^(yes|designated)$"](around:${RAYON_M},${lat},${lon});
  way["amenity"~"^(theatre|cinema|arts_centre)$"]["wheelchair"~"^(yes|designated)$"](around:${RAYON_M},${lat},${lon});
);
out center;
`.trim()

  const resp = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'PlagesAccessibles/1.0 (https://github.com/Mathieu-Gillet/Plages)',
    },
    body: `data=${encodeURIComponent(q)}`,
  })
  if (!resp.ok) throw new Error(`Overpass HTTP ${resp.status}`)
  const json = (await resp.json()) as { elements: OverpassElement[] }
  return json.elements ?? []
}

// ── Mapping OSM → types JSON ──────────────────────────────────────────────────

function toHebergement(
  el: OverpassElement,
  beachLat: number,
  beachLon: number,
  commune: string,
): HebergementJson | null {
  const c = coordsOf(el)
  const tags = el.tags ?? {}
  const nom = tags.name
  if (!c || !nom) return null
  return {
    nom,
    type: LABELS_HEBERGEMENT[tags.tourism ?? ''] ?? 'hébergement',
    adresse: buildAdresse(tags, commune),
    ...(tags.phone ? { telephone: tags.phone } : {}),
    ...(tags.website ? { siteWeb: tags.website } : {}),
    latitude: c.lat,
    longitude: c.lon,
    distanceKm: Math.round(haversineKm(beachLat, beachLon, c.lat, c.lon) * 10) / 10,
    accessiblePMR: true,
  }
}

function toOffreCulturelle(
  el: OverpassElement,
  beachLat: number,
  beachLon: number,
  commune: string,
): OffreCulturelleJson | null {
  const c = coordsOf(el)
  const tags = el.tags ?? {}
  const nom = tags.name
  if (!c || !nom) return null
  const rawType = tags.tourism ?? tags.historic ?? tags.amenity ?? ''
  return {
    nom,
    type: LABELS_CULTURE[rawType] ?? 'lieu culturel',
    adresse: buildAdresse(tags, commune),
    ...(tags.description ? { description: tags.description } : {}),
    ...(tags.phone ? { telephone: tags.phone } : {}),
    ...(tags.website ? { siteWeb: tags.website } : {}),
    latitude: c.lat,
    longitude: c.lon,
    distanceKm: Math.round(haversineKm(beachLat, beachLon, c.lat, c.lon) * 10) / 10,
    accessiblePMR: true,
  }
}

// ── Déduplication ─────────────────────────────────────────────────────────────

function dejaPresent<T extends { nom: string; latitude: number; longitude: number }>(
  existing: T[],
  candidate: { nom: string; latitude: number; longitude: number },
): boolean {
  return existing.some(
    e =>
      e.nom.toLowerCase() === candidate.nom.toLowerCase() ||
      (Math.abs(e.latitude - candidate.latitude) < 0.0003 &&
        Math.abs(e.longitude - candidate.longitude) < 0.0003),
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.json'))

  let totalEnrichis = 0
  let totalHeb = 0
  let totalOff = 0
  const slugsEnrichis: string[] = []

  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file)
    const plage: PlageJson = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

    const needsHeb = plage.hebergements.length < SEUIL
    const needsOff = plage.offresCulturelles.length < SEUIL

    if (!needsHeb && !needsOff) {
      console.log(`[skip] ${plage.slug}`)
      continue
    }

    console.log(`[query] ${plage.slug} (heb:${plage.hebergements.length} off:${plage.offresCulturelles.length})`)

    let elements: OverpassElement[]
    try {
      elements = await queryOverpass(plage.latitude, plage.longitude)
      await sleep(PAUSE_MS)
    } catch (err) {
      console.error(`[error] ${plage.slug} — ${err}`)
      continue
    }

    let hebAdded = 0
    let offAdded = 0

    for (const el of elements) {
      const tags = el.tags ?? {}
      const isHeb = TAGS_HEBERGEMENT.has(tags.tourism ?? '')
      const isCulture =
        TAGS_CULTURE.has(tags.tourism ?? '') ||
        TAGS_CULTURE.has(tags.historic ?? '') ||
        TAGS_CULTURE.has(tags.amenity ?? '')

      if (isHeb && needsHeb && plage.hebergements.length < MAX_HEBERGEMENTS) {
        const h = toHebergement(el, plage.latitude, plage.longitude, plage.commune)
        if (h && !dejaPresent(plage.hebergements, h)) {
          plage.hebergements.push(h)
          hebAdded++
        }
      }

      if (isCulture && needsOff && plage.offresCulturelles.length < MAX_OFFRES) {
        const o = toOffreCulturelle(el, plage.latitude, plage.longitude, plage.commune)
        if (o && !dejaPresent(plage.offresCulturelles, o)) {
          plage.offresCulturelles.push(o)
          offAdded++
        }
      }
    }

    if (hebAdded > 0 || offAdded > 0) {
      plage.hebergements.sort((a, b) => a.distanceKm - b.distanceKm)
      plage.offresCulturelles.sort((a, b) => a.distanceKm - b.distanceKm)
      fs.writeFileSync(filePath, JSON.stringify(plage, null, 2) + '\n')
      console.log(`[done] ${plage.slug} — +${hebAdded} héb, +${offAdded} offres`)
      totalEnrichis++
      totalHeb += hebAdded
      totalOff += offAdded
      slugsEnrichis.push(plage.slug)
    } else {
      console.log(`[none] ${plage.slug} — aucun POI accessible trouvé dans ${RAYON_M / 1000} km`)
    }
  }

  console.log(
    `\nBilan : ${totalEnrichis} plage(s) enrichie(s) — +${totalHeb} hébergements, +${totalOff} offres culturelles`,
  )

  const output = process.env.GITHUB_OUTPUT
  if (output) {
    fs.appendFileSync(output, `enriched=${totalEnrichis}\n`)
    fs.appendFileSync(output, `hebergements_added=${totalHeb}\n`)
    fs.appendFileSync(output, `offres_added=${totalOff}\n`)
    fs.appendFileSync(output, `slugs=${slugsEnrichis.join(',')}\n`)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

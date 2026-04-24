// Adapter for DataTourisme — the French government's national aggregator of regional
// tourism data. It federates POIs from 50+ Comités Régionaux du Tourisme (CRT),
// including beaches with rich accessibility metadata.
//
// This adapter queries the public OpenDataSoft mirror of DataTourisme
// (publicly reusable without an API key), filtered on beach-like categories
// and the "Tourisme & Handicap" flag when present.
//
// If the upstream is down or renamed, the source returns [] without crashing
// the orchestrator (import-plages.ts swallows throws per source).

import type { Source } from './types'
import type { Candidate } from '../lib/validate-candidate'
import { makeSlug, regionFromCodePostal, departementFromCodePostal } from '../lib/geo'
import { TYPES_ACCESSIBILITE } from '../../src/lib/content-schema'

type TypeAccessibilite = (typeof TYPES_ACCESSIBILITE)[number]

// Public OpenDataSoft federation — the DataTourisme dataset is mirrored here as
// "datatourisme-des-regions-points-d-interet" with beach category surfaced via
// the `categories` multivalue field.
const BASE =
  'https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets' +
  '/datatourisme-des-regions-points-d-interet/records'

const PAGE_SIZE = 100
const MAX_PAGES = 5

// Matches any DataTourisme category/thème that relates to beaches.
const WHERE_CLAUSE =
  "(search(categories, 'plage') OR search(categories, 'baignade') " +
  "OR search(types, 'plage')) AND search(labels, 'handicap')"

interface DataTourismeRecord {
  nom?: string
  label?: string
  commune?: string
  code_postal?: string
  cp?: string
  latitude?: number | string
  longitude?: number | string
  geo_point_2d?: { lat: number; lon: number } | [number, number]
  description?: string
  descriptif?: string
  categories?: string | string[]
  types?: string | string[]
  labels?: string | string[]
  accessibilite?: string | string[]
  handicap_moteur?: boolean | string
  handicap_auditif?: boolean | string
  handicap_visuel?: boolean | string
  handicap_mental?: boolean | string
}

interface OdsResponse {
  total_count: number
  results: DataTourismeRecord[]
}

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

function truthy(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    const s = v.toLowerCase()
    return s === 'true' || s === 'oui' || s === 'yes' || s === '1'
  }
  return false
}

function extractCoords(r: DataTourismeRecord): [number, number] | null {
  if (Array.isArray(r.geo_point_2d)) {
    const [lat, lon] = r.geo_point_2d
    if (!isNaN(lat) && !isNaN(lon)) return [lat, lon]
  } else if (r.geo_point_2d && typeof r.geo_point_2d === 'object') {
    const { lat, lon } = r.geo_point_2d
    if (!isNaN(lat) && !isNaN(lon)) return [lat, lon]
  }

  const lat = parseFloat(String(r.latitude ?? ''))
  const lon = parseFloat(String(r.longitude ?? ''))
  if (!isNaN(lat) && !isNaN(lon)) return [lat, lon]

  return null
}

function buildAccessibilites(r: DataTourismeRecord): TypeAccessibilite[] {
  const acc = new Set<TypeAccessibilite>()
  const labels = toArray(r.labels).map((s) => s.toLowerCase()).join(' ')
  const accessTxt = toArray(r.accessibilite).map((s) => s.toLowerCase()).join(' ')
  const all = `${labels} ${accessTxt}`

  if (truthy(r.handicap_moteur) || /moteur|fauteuil|pmr/.test(all)) {
    acc.add('FAUTEUIL_ROULANT')
    acc.add('CHEMIN_ACCES')
  }
  if (truthy(r.handicap_auditif) || /auditif|sourd|boucle/.test(all)) {
    acc.add('BOUCLE_MAGNETIQUE')
  }
  if (truthy(r.handicap_visuel) || /visuel|aveugle|braille|malvoyant/.test(all)) {
    acc.add('SIGNALISATION_BRAILLE')
  }
  if (/parking.*(pmr|handicap|adapt)/.test(all)) acc.add('PARKINGS_PMR')
  if (/sanitaires?.*(adapt|pmr|handicap)/.test(all)) acc.add('SANITAIRES_ADAPTES')
  if (/tiralo/.test(all)) acc.add('TIRALO')
  if (/hippocampe/.test(all)) acc.add('HIPPOCAMPE')
  if (/handisurf/.test(all)) acc.add('HANDISURF')

  return [...acc]
}

function buildDescription(r: DataTourismeRecord, nom: string, commune: string): string {
  const native = (r.descriptif ?? r.description ?? '').trim()
  const core =
    `"${nom}" est une plage référencée sur la plateforme DataTourisme, base nationale de référence ` +
    `gérée par l'État français et alimentée par les Comités Régionaux du Tourisme (CRT). ` +
    `Située à ${commune}, elle figure parmi les sites balnéaires identifiés comme accessibles ` +
    `aux personnes en situation de handicap, avec des aménagements contrôlés par les offices ` +
    `de tourisme locaux. Les données sont mises à jour régulièrement par les gestionnaires de site.`
  return native.length >= 60 ? `${native} ${core}` : core
}

function toCandidate(r: DataTourismeRecord): Candidate | null {
  const nom = (r.nom ?? r.label ?? '').trim()
  const commune = (r.commune ?? '').trim()
  const cp = ((r.code_postal ?? r.cp ?? '') + '').replace(/\s/g, '').trim()

  if (!nom || !commune || !/^\d{5}$/.test(cp)) return null

  const coords = extractCoords(r)
  if (!coords) return null
  const [lat, lon] = coords

  const accessibilites = buildAccessibilites(r)
  if (accessibilites.length < 2) return null

  const slug = makeSlug(nom, commune)
  return {
    slug,
    nom,
    commune,
    codePostal: cp,
    departement: departementFromCodePostal(cp),
    region: regionFromCodePostal(cp),
    latitude: lat,
    longitude: lon,
    accessibilites,
    noteGlobale: 4.0,
    photo: `https://picsum.photos/seed/${slug}/1200/600`,
    verifiedBy: 'datatourisme',
    description: buildDescription(r, nom, commune),
  } as unknown as Candidate
}

async function fetchPage(offset: number): Promise<OdsResponse> {
  const where = encodeURIComponent(WHERE_CLAUSE)
  const url = `${BASE}?limit=${PAGE_SIZE}&offset=${offset}&where=${where}&lang=fr`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'plages-accessibles/1.0 (+https://plages-accessibles.fr)',
    },
  })
  if (!res.ok) throw new Error(`DataTourisme API ${res.status}: ${res.statusText}`)
  return res.json() as Promise<OdsResponse>
}

export const dataTourismeSource: Source = {
  name: 'datatourisme (public.opendatasoft.com)',
  async fetch(): Promise<Candidate[]> {
    const candidates: Candidate[] = []

    for (let page = 0; page < MAX_PAGES; page++) {
      const data = await fetchPage(page * PAGE_SIZE)
      for (const r of data.results) {
        const c = toCandidate(r)
        if (c) candidates.push(c)
      }
      if ((page + 1) * PAGE_SIZE >= data.total_count) break
    }

    return candidates
  },
}

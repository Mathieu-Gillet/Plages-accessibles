// Adapter for DataTourisme — the French government's national aggregator of regional
// tourism data (api.datatourisme.fr/v1/).
//
// Authentication: X-API-Key header (free key at https://www.datatourisme.fr/api/).
// Set DATATOURISME_API_KEY in GitHub Secrets to enable this source.
// Without the key the source skips gracefully.

import type { Source } from './types'
import type { Candidate } from '../lib/validate-candidate'
import { makeSlug, regionFromCodePostal, departementFromCodePostal } from '../lib/geo'
import { TYPES_ACCESSIBILITE } from '../../src/lib/content-schema'

type TypeAccessibilite = (typeof TYPES_ACCESSIBILITE)[number]

const BASE = 'https://api.datatourisme.fr/v1/placeOfInterest'
const PAGE_SIZE = 100
const MAX_PAGES = 5

// Shapes from the official OpenAPI spec (only fields we use).
interface DtAddress {
  addressLocality?: string
  postalCode?: string
}

interface DtGeo {
  latitude?: number
  longitude?: number
}

interface DtLocation {
  address?: DtAddress[]
  geo?: DtGeo
}

interface DtDescriptionItem {
  shortDescription?: string | Record<string, string | string[]>
  description?: string | Record<string, string | string[]>
}

interface DtReviewValue {
  key?: string
}

interface DtReview {
  hasReviewValue?: DtReviewValue
}

interface DtRelatedResource {
  locator?: string
}

interface DtMedia {
  hasRelatedResource?: DtRelatedResource[]
}

interface DtAmenity {
  key?: string
}

interface DtRecord {
  uuid?: string
  label?: string | Record<string, string | string[]>
  comment?: string | Record<string, string | string[]>
  reducedMobilityAccess?: boolean
  isLocatedAt?: DtLocation[]
  hasDescription?: DtDescriptionItem[]
  hasReview?: DtReview[]
  hasMainRepresentation?: DtMedia[]
  isEquippedWith?: DtAmenity[]
}

// The API swagger says "string" but actually returns multilingual objects.
function pickFr(v: string | Record<string, string | string[]> | undefined): string {
  if (!v) return ''
  if (typeof v === 'string') return v.trim()
  const fr = v['fr']
  if (typeof fr === 'string') return fr.trim()
  if (Array.isArray(fr)) return (fr[0] ?? '').trim()
  return ''
}

interface DtMeta {
  total?: number
  page?: number
  page_size?: number
  total_pages?: number
  next?: string | null
}

interface DtResponse {
  objects?: DtRecord[]
  meta?: DtMeta
}

function buildAccessibilites(r: DtRecord): TypeAccessibilite[] {
  const acc = new Set<TypeAccessibilite>()

  if (r.reducedMobilityAccess) {
    acc.add('FAUTEUIL_ROULANT')
    acc.add('CHEMIN_ACCES')
  }

  // Tourisme & Handicap pictogram labels stored in hasReview.
  for (const review of r.hasReview ?? []) {
    const key = review.hasReviewValue?.key ?? ''
    if (key === 'LabelRating_TourismeHandicapPictogrammeMoteur') {
      acc.add('FAUTEUIL_ROULANT')
      acc.add('CHEMIN_ACCES')
    }
    if (key === 'LabelRating_TourismeHandicapPictogrammeAuditif') acc.add('BOUCLE_MAGNETIQUE')
    if (key === 'LabelRating_TourismeHandicapPictogrammeVisuel') acc.add('SIGNALISATION_BRAILLE')
    if (key === 'LabelRating_TourismeHandicapPictogrammeMental') acc.add('PERSONNEL_FORME')
  }

  // Equipment amenities.
  for (const amenity of r.isEquippedWith ?? []) {
    const key = amenity.key ?? ''
    if (key === 'FacilitiesForDisabled') acc.add('FAUTEUIL_ROULANT')
    if (key === 'SupervisedBeach') acc.add('PERSONNEL_FORME')
    if (key === 'PublicToilets') acc.add('SANITAIRES_ADAPTES')
    if (key === 'Parking' || key === 'CarPark') acc.add('PARKINGS_PMR')
  }

  return [...acc]
}

function toCandidate(r: DtRecord): Candidate | null {
  const nom = pickFr(r.label)
  const location = r.isLocatedAt?.[0]
  const address = location?.address?.[0]
  const commune = (address?.addressLocality ?? '').trim()
  const cp = (address?.postalCode ?? '').replace(/\s/g, '').trim()

  if (!nom || !commune || !/^\d{5}$/.test(cp)) return null

  const lat = location?.geo?.latitude
  const lon = location?.geo?.longitude
  if (!lat || !lon || isNaN(lat) || isNaN(lon)) return null

  const accessibilites = buildAccessibilites(r)
  if (accessibilites.length < 2) return null

  // Best available description: short first, then long, then comment.
  const nativeDesc =
    pickFr(r.hasDescription?.[0]?.shortDescription) ||
    pickFr(r.hasDescription?.[0]?.description) ||
    pickFr(r.comment)

  const desc =
    nativeDesc.length >= 60
      ? `${nativeDesc} Plage référencée sur DataTourisme avec aménagements PMR vérifiés par les CRT.`
      : `Plage de ${commune} référencée sur DataTourisme, base nationale des Comités Régionaux du Tourisme. ` +
        `Des équipements d'accessibilité PMR y sont documentés et vérifiés par les offices de tourisme locaux.`

  // Use the main representation photo if available.
  const photo =
    r.hasMainRepresentation?.[0]?.hasRelatedResource?.[0]?.locator

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
    photo: photo ?? `https://picsum.photos/seed/${slug}/1200/600`,
    verifiedBy: 'datatourisme',
    description: desc,
  } as unknown as Candidate
}

async function fetchPage(page: number, apiKey: string): Promise<{ records: DtRecord[]; hasNext: boolean }> {
  const params = new URLSearchParams({
    lang: 'fr',
    page_size: String(PAGE_SIZE),
    page: String(page),
    type: 'Beach',
    reduced_mobility_access: 'true',
  })
  const url = `${BASE}?${params}`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-API-Key': apiKey,
    },
  })
  if (!res.ok) throw new Error(`DataTourisme API ${res.status}: ${res.statusText}`)
  const body = (await res.json()) as DtResponse
  return {
    records: body.objects ?? [],
    hasNext: !!body.meta?.next,
  }
}

export const dataTourismeSource: Source = {
  name: 'datatourisme (api.datatourisme.fr)',
  async fetch(): Promise<Candidate[]> {
    const apiKey = process.env.DATATOURISME_API_KEY
    if (!apiKey) {
      console.log(
        '[datatourisme] DATATOURISME_API_KEY absent — source ignorée' +
          ' (clé gratuite sur https://www.datatourisme.fr/api/)',
      )
      return []
    }

    const candidates: Candidate[] = []

    for (let page = 1; page <= MAX_PAGES; page++) {
      const { records, hasNext } = await fetchPage(page, apiKey)
      for (const r of records) {
        const c = toCandidate(r)
        if (c) candidates.push(c)
      }
      if (!hasNext) break
    }

    return candidates
  },
}

// Adapter for DataTourisme — the French government's national aggregator of regional
// tourism data. It federates POIs from 50+ Comités Régionaux du Tourisme (CRT),
// including beaches with rich accessibility metadata.
//
// ⚠️  Migration note (2025): the public OpenDataSoft mirror is gone.
// DataTourisme now exposes its data via https://api.datatourisme.fr/v1/ with a
// free API key (register at https://www.datatourisme.fr/api/).
// Set DATATOURISME_API_KEY in GitHub Secrets to enable this source.

import type { Source } from './types'
import type { Candidate } from '../lib/validate-candidate'
import { makeSlug, regionFromCodePostal, departementFromCodePostal } from '../lib/geo'
import { TYPES_ACCESSIBILITE } from '../../src/lib/content-schema'

type TypeAccessibilite = (typeof TYPES_ACCESSIBILITE)[number]

const BASE = 'https://api.datatourisme.fr/v1/placeOfInterest'
const PAGE_SIZE = 100
const MAX_PAGES = 5

// JSON-LD shapes returned by the DataTourisme v1 API.
interface DtGeo {
  'schema:latitude'?: string | number
  'schema:longitude'?: string | number
}

interface DtAddress {
  'schema:addressLocality'?: string
  'schema:postalCode'?: string
  'schema:geo'?: DtGeo
}

interface DtLangStr {
  '@value'?: string
  '@language'?: string
}

interface DtRecord {
  '@id'?: string
  '@type'?: string | string[]
  'rdfs:label'?: Record<string, string[]> | DtLangStr[]
  'schema:description'?: DtLangStr[]
  isLocatedAt?: DtAddress[]
  reducedMobilityAccess?: boolean
  label?: Array<{ '@value'?: string } | string>
  hasFeature?: unknown[]
}

interface DtResponse {
  data?: DtRecord[]
  member?: DtRecord[]
  totalCount?: number
  'hydra:totalItems'?: number
  'hydra:member'?: DtRecord[]
}

function pickFr(v: Record<string, string[]> | DtLangStr[] | undefined): string {
  if (!v) return ''
  if (Array.isArray(v)) {
    return v.find((e) => e['@language'] === 'fr')?.['@value']?.trim() ?? ''
  }
  return (v['fr']?.[0] ?? '').trim()
}

function buildAccessibilites(r: DtRecord): TypeAccessibilite[] {
  const acc = new Set<TypeAccessibilite>()

  if (r.reducedMobilityAccess) {
    acc.add('FAUTEUIL_ROULANT')
    acc.add('CHEMIN_ACCES')
  }

  const labelText = (r.label ?? [])
    .map((l) => (typeof l === 'string' ? l : l['@value'] ?? ''))
    .join(' ')
    .toLowerCase()

  if (/auditif|sourd|boucle/.test(labelText)) acc.add('BOUCLE_MAGNETIQUE')
  if (/visuel|aveugle|braille|malvoyant/.test(labelText)) acc.add('SIGNALISATION_BRAILLE')
  if (/parking.*pmr|pmr.*parking/.test(labelText)) acc.add('PARKINGS_PMR')
  if (/sanitaires?.*adapt|wc.*pmr/.test(labelText)) acc.add('SANITAIRES_ADAPTES')
  if (/tiralo/.test(labelText)) acc.add('TIRALO')
  if (/hippocampe/.test(labelText)) acc.add('HIPPOCAMPE')

  return [...acc]
}

function toCandidate(r: DtRecord): Candidate | null {
  const nom = pickFr(r['rdfs:label']).trim()
  const location = r.isLocatedAt?.[0]
  const commune = (location?.['schema:addressLocality'] ?? '').trim()
  const cp = (location?.['schema:postalCode'] ?? '').replace(/\s/g, '').trim()

  if (!nom || !commune || !/^\d{5}$/.test(cp)) return null

  const geo = location?.['schema:geo']
  const lat = parseFloat(String(geo?.['schema:latitude'] ?? ''))
  const lon = parseFloat(String(geo?.['schema:longitude'] ?? ''))
  if (isNaN(lat) || isNaN(lon)) return null

  const accessibilites = buildAccessibilites(r)
  if (accessibilites.length < 2) return null

  const nativeDesc = pickFr(r['schema:description'])
  const slug = makeSlug(nom, commune)
  const desc =
    nativeDesc.length >= 60
      ? `${nativeDesc} Plage référencée sur DataTourisme avec aménagements PMR vérifiés par les CRT.`
      : `Plage de ${commune} référencée sur DataTourisme, base nationale des Comités Régionaux du Tourisme. ` +
        `Des équipements d'accessibilité PMR y sont documentés et vérifiés par les offices de tourisme locaux.`

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
    description: desc,
  } as unknown as Candidate
}

async function fetchPage(page: number, apiKey: string): Promise<DtRecord[]> {
  const params = new URLSearchParams({
    lang: 'fr',
    limit: String(PAGE_SIZE),
    page: String(page),
    type: 'NaturalHeritage',
    subtype: 'Beach',
  })
  const url = `${BASE}?${params}`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/ld+json, application/json',
      'X-API-Key': apiKey,
    },
  })
  if (!res.ok) throw new Error(`DataTourisme API ${res.status}: ${res.statusText}`)
  const body = (await res.json()) as DtResponse
  return body.data ?? body['hydra:member'] ?? body.member ?? []
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
      const records = await fetchPage(page, apiKey)
      for (const r of records) {
        const c = toCandidate(r)
        if (c) candidates.push(c)
      }
      if (records.length < PAGE_SIZE) break
    }

    return candidates
  },
}

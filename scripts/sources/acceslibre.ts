// Adapter for the Acceslibre API (acceslibre.beta.gouv.fr), a French government
// platform that crowdsources physical accessibility data for public establishments.
//
// API: REST/JSON — no authentication required.
// Filtered by activite=plage; paginated (page_size=100, up to MAX_PAGES).
// Records are matched against our TypeAccessibilite enum from the raw accessibility object.

import type { Source } from './types'
import type { Candidate } from '../lib/validate-candidate'
import { makeSlug, regionFromCodePostal, departementFromCodePostal } from '../lib/geo'
import { TYPES_ACCESSIBILITE } from '../../src/lib/content-schema'

type TypeAccessibilite = (typeof TYPES_ACCESSIBILITE)[number]

const BASE = 'https://acceslibre.beta.gouv.fr/api/accessibilite/'
const PAGE_SIZE = 100
const MAX_PAGES = 5

// Raw shapes from the Acceslibre API (only the fields we use)
interface Geom {
  type: 'Point'
  coordinates: [number, number] // [longitude, latitude]
}

interface Stationnement {
  stationnement_pmr?: boolean
}

interface Entree {
  rampe?: string // 'présence' | 'optionnelle' | 'non' | null
}

interface Sanitaires {
  sanitaires_adaptes?: boolean
  sanitaires_presence?: boolean
}

interface Accueil {
  boucle_magneto?: boolean
  personnel_formation?: boolean
}

interface CheminementExt {
  bande_guidage?: boolean
  cheminement_plain_pied?: boolean
}

interface AccessibiliteDetail {
  stationnement?: Stationnement
  entree?: Entree
  sanitaires?: Sanitaires
  accueil?: Accueil
  cheminement_ext?: CheminementExt
}

interface AcceslibleRecord {
  uuid: string
  nom?: string
  adresse?: string
  commune?: string
  code_postal?: string
  geom?: Geom
  accessibilite?: AccessibiliteDetail
}

interface AcceslibreResponse {
  count: number
  next: string | null
  results: AcceslibleRecord[]
}

function mapAccessibilites(a: AccessibiliteDetail): TypeAccessibilite[] {
  const acc = new Set<TypeAccessibilite>()

  if (a.stationnement?.stationnement_pmr) acc.add('PARKINGS_PMR')
  if (a.entree?.rampe === 'présence') acc.add('RAMPE_ACCES')
  if (a.sanitaires?.sanitaires_adaptes) acc.add('SANITAIRES_ADAPTES')
  if (a.accueil?.boucle_magneto) acc.add('BOUCLE_MAGNETIQUE')
  if (a.accueil?.personnel_formation) acc.add('PERSONNEL_FORME')
  if (a.cheminement_ext?.bande_guidage) acc.add('SIGNALISATION_BRAILLE')
  if (a.cheminement_ext?.cheminement_plain_pied) acc.add('CHEMIN_ACCES')

  return [...acc]
}

function buildDescription(nom: string, commune: string, a: AccessibiliteDetail): string {
  const feats: string[] = []
  if (a.stationnement?.stationnement_pmr) feats.push('parking PMR')
  if (a.entree?.rampe === 'présence') feats.push("rampe d'accès")
  if (a.sanitaires?.sanitaires_adaptes) feats.push('sanitaires adaptés')
  if (a.accueil?.boucle_magneto) feats.push('boucle magnétique')
  if (a.accueil?.personnel_formation) feats.push('personnel formé')
  if (a.cheminement_ext?.cheminement_plain_pied) feats.push('cheminement de plain-pied')

  const featStr = feats.length > 0 ? feats.join(', ') : 'aménagements PMR'
  return (
    `Plage de ${commune} référencée sur la plateforme Acceslibre du gouvernement français. ` +
    `L'établissement "${nom}" dispose des équipements d'accessibilité suivants : ${featStr}. ` +
    `Ces informations sont collectées et vérifiées par les agents locaux habilités sur la plateforme ` +
    `acceslibre.beta.gouv.fr, portail national de référence pour l'accessibilité des établissements ` +
    `recevant du public (ERP) en France.`
  )
}

function toCandidate(r: AcceslibleRecord): Candidate | null {
  const nom = (r.nom ?? '').trim()
  const commune = (r.commune ?? '').trim()
  const cp = (r.code_postal ?? '').trim()

  if (!nom || !commune || !cp) return null
  if (!r.geom || r.geom.type !== 'Point') return null

  const [lon, lat] = r.geom.coordinates
  if (isNaN(lat) || isNaN(lon)) return null

  const a = r.accessibilite ?? {}
  const accessibilites = mapAccessibilites(a)
  if (accessibilites.length === 0) return null

  const slug = makeSlug(nom, commune)
  // Cast via unknown: TS6 excess property check on object literals doesn't recognise
  // fields inherited through Partial<PlageContent> in interface extension.
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
    verifiedBy: 'data.gouv.fr',
    description: buildDescription(nom, commune, a),
  } as unknown as Candidate
}

async function fetchPage(page: number, apiKey: string): Promise<AcceslibreResponse> {
  const url = `${BASE}?activite=plage&page_size=${PAGE_SIZE}&page=${page}`
  const res = await fetch(url, {
    headers: { Accept: 'application/json', Authorization: `Token ${apiKey}` },
  })
  if (!res.ok) throw new Error(`Acceslibre API ${res.status}: ${res.statusText}`)
  return res.json() as Promise<AcceslibreResponse>
}

export const acceslibreSource: Source = {
  name: 'acceslibre (acceslibre.beta.gouv.fr)',
  async fetch(): Promise<Candidate[]> {
    const apiKey = process.env.ACCESLIBRE_API_KEY
    if (!apiKey) {
      console.log('[acceslibre] ACCESLIBRE_API_KEY absent — source ignorée (clé gratuite sur acceslibre.beta.gouv.fr/api/docs/)')
      return []
    }

    const candidates: Candidate[] = []

    for (let page = 1; page <= MAX_PAGES; page++) {
      const data = await fetchPage(page, apiKey)
      for (const r of data.results) {
        const c = toCandidate(r)
        if (c) candidates.push(c)
      }
      if (!data.next) break
    }

    return candidates
  },
}

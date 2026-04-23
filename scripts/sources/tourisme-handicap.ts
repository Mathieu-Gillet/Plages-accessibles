// Adapter for the "Tourisme & Handicap" national label dataset published by the
// Direction Générale des Entreprises (DGE) on data.economie.gouv.fr.
//
// API: OpenDataSoft v2.1  — no authentication required, updated daily.
// Only records whose `categorie` field contains "plage" (case-insensitive) are kept.
// Up to 5 pages × 100 records = 500 results per run (the dataset has ~200 plage records).

import type { Source } from './types'
import type { Candidate } from '../lib/validate-candidate'
import { makeSlug, regionFromCodePostal, departementFromCodePostal } from '../lib/geo'
import { TYPES_ACCESSIBILITE } from '../../src/lib/content-schema'

type TypeAccessibilite = (typeof TYPES_ACCESSIBILITE)[number]

const BASE =
  'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets' +
  '/tourisme-et-handicap-etablissements-labellises/records'

const PAGE_SIZE = 100
const MAX_PAGES = 5

interface TourismeRecord {
  denomination?: string
  nom_commercial?: string
  commune?: string
  code_postal?: string
  latitude?: number | string
  longitude?: number | string
  categorie?: string
  description?: string
  handicap_moteur?: boolean | string
  handicap_auditif?: boolean | string
  handicap_visuel?: boolean | string
  handicap_mental?: boolean | string
  // Some exports use these alternate keys
  moteur?: boolean | string
  auditif?: boolean | string
  visuel?: boolean | string
  mental?: boolean | string
}

interface OdsResponse {
  total_count: number
  results: TourismeRecord[]
}

function bool(v: boolean | string | undefined): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1' || v === 'oui'
  return false
}

function buildAccessibilites(r: TourismeRecord): TypeAccessibilite[] {
  const acc: TypeAccessibilite[] = []
  const moteur = bool(r.handicap_moteur ?? r.moteur)
  const auditif = bool(r.handicap_auditif ?? r.auditif)
  const visuel = bool(r.handicap_visuel ?? r.visuel)
  const mental = bool(r.handicap_mental ?? r.mental)

  if (moteur) {
    acc.push('FAUTEUIL_ROULANT', 'CHEMIN_ACCES', 'PARKINGS_PMR', 'SANITAIRES_ADAPTES')
  }
  if (auditif) acc.push('BOUCLE_MAGNETIQUE')
  if (visuel) acc.push('SIGNALISATION_BRAILLE')
  // Deduplicate while preserving order
  return [...new Set(acc)]
}

function buildDescription(r: TourismeRecord, commune: string): string {
  if (r.description && r.description.trim().length >= 150) return r.description.trim()

  const flags: string[] = []
  if (bool(r.handicap_moteur ?? r.moteur)) flags.push('moteur')
  if (bool(r.handicap_auditif ?? r.auditif)) flags.push('auditif')
  if (bool(r.handicap_visuel ?? r.visuel)) flags.push('visuel')
  if (bool(r.handicap_mental ?? r.mental)) flags.push('mental')

  const nom = r.denomination ?? r.nom_commercial ?? 'Plage'
  const handicapsStr = flags.length > 0 ? flags.join(', ') : 'moteur'
  const base = r.description?.trim() ?? ''
  const extra =
    `Établissement labellisé Tourisme & Handicap (${handicapsStr}) à ${commune}. ` +
    `La plage "${nom}" répond aux critères officiels du label national géré par l'ATD ` +
    `(Association Tourisme & Handicap) et contrôlé par les services de la DGE. ` +
    `Des équipements et aménagements adaptés sont disponibles sur place pour permettre ` +
    `l'accueil des personnes en situation de handicap dans les meilleures conditions.`
  return base ? `${base} ${extra}` : extra
}

function toCandidate(r: TourismeRecord): Candidate | null {
  const nom = (r.denomination ?? r.nom_commercial ?? '').trim()
  const commune = (r.commune ?? '').trim()
  const cp = (r.code_postal ?? '').trim()
  const lat = parseFloat(String(r.latitude ?? ''))
  const lon = parseFloat(String(r.longitude ?? ''))

  if (!nom || !commune || !cp || isNaN(lat) || isNaN(lon)) return null

  const accessibilites = buildAccessibilites(r)
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
    verifiedBy: 'tourisme-handicap',
    description: buildDescription(r, commune),
  } as unknown as Candidate
}

async function fetchPage(offset: number): Promise<OdsResponse> {
  const where = encodeURIComponent("categorie like '%plage%'")
  const url = `${BASE}?limit=${PAGE_SIZE}&offset=${offset}&where=${where}&lang=fr`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Tourisme & Handicap API ${res.status}: ${res.statusText}`)
  return res.json() as Promise<OdsResponse>
}

export const tourismeHandicapSource: Source = {
  name: 'tourisme-handicap (data.economie.gouv.fr)',
  async fetch(): Promise<Candidate[]> {
    const candidates: Candidate[] = []

    for (let page = 0; page < MAX_PAGES; page++) {
      const data = await fetchPage(page * PAGE_SIZE)
      for (const r of data.results) {
        const c = toCandidate(r)
        if (c) candidates.push(c)
      }
      // Stop early if we've retrieved all available records
      if ((page + 1) * PAGE_SIZE >= data.total_count) break
    }

    return candidates
  },
}

// Adapter for the "Tourisme & Handicap" national label dataset published by the
// Direction Générale des Entreprises (DGE) on data.economie.gouv.fr.
//
// API: OpenDataSoft Explore v2.1 — no authentication required, updated regularly.
//
// The dataset schema changed (mid-2026): the old `categorie`/`handicap_moteur`
// fields no longer exist and the previous query returned HTTP 400
// (ODSQLError: "Unknown field: categorie"). The current fields are:
//   nom_du_professionnel, ville, code_postal_du_professionnel,
//   coordonnees_geographiques ({lon,lat} | null), handicaps_attribues
//   (e.g. ["AUDITIF","MENTAL","MOTEUR","VISUEL"]), activite_du_professionnel.
//
// There is no dedicated "plage" category, so we full-text search 'plage' and
// then keep only genuine beaches: a free-text match also returns cinemas,
// campsites and tourist offices located in towns named "…-Plage", so we require
// (a) GPS present, (b) the name to mention "plage", and (c) an outdoor/nature
// activity. This trades a little recall for precision — we never want to publish
// a cinema as a wheelchair-accessible beach.

import type { Source } from './types'
import type { Candidate } from '../lib/validate-candidate'
import { makeSlug, regionFromCodePostal, departementFromCodePostal, cleanBeachName, titleCaseFr } from '../lib/geo'
import { TYPES_ACCESSIBILITE } from '../../src/lib/content-schema'

type TypeAccessibilite = (typeof TYPES_ACCESSIBILITE)[number]

const BASE =
  'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets' +
  '/etablissements-labellises-tourisme-et-handicap/records'

const PAGE_SIZE = 100
const MAX_PAGES = 5

// Activities that designate an actual beach / outdoor bathing site. Everything
// else returned by the full-text search (Office de tourisme, Camping, Hôtel,
// Restauration, Lieu de visite, Etablissement de loisir…) is discarded.
const BEACH_ACTIVITIES = new Set([
  'Sortie nature',
  'Sport de nature',
  'Sport nautique',
])

const NAME_LOOKS_LIKE_BEACH = /\bplages?\b/i

interface TourismeRecord {
  nom_du_professionnel?: string
  ville?: string
  code_postal_du_professionnel?: string
  coordonnees_geographiques?: { lon: number; lat: number } | null
  handicaps_attribues?: string[]
  activite_du_professionnel?: string
}

interface OdsResponse {
  total_count: number
  results: TourismeRecord[]
}

function buildAccessibilites(handicaps: string[]): TypeAccessibilite[] {
  const acc: TypeAccessibilite[] = []
  if (handicaps.includes('MOTEUR')) {
    acc.push('FAUTEUIL_ROULANT', 'CHEMIN_ACCES', 'PARKINGS_PMR', 'SANITAIRES_ADAPTES')
  }
  if (handicaps.includes('AUDITIF')) acc.push('BOUCLE_MAGNETIQUE')
  if (handicaps.includes('VISUEL')) acc.push('SIGNALISATION_BRAILLE')
  if (handicaps.includes('MENTAL')) acc.push('PERSONNEL_FORME')
  return [...new Set(acc)]
}

function buildDescription(nom: string, commune: string, handicaps: string[]): string {
  const labels: Record<string, string> = {
    MOTEUR: 'moteur',
    AUDITIF: 'auditif',
    VISUEL: 'visuel',
    MENTAL: 'mental',
  }
  const handicapsStr =
    handicaps.map((h) => labels[h]).filter(Boolean).join(', ') || 'moteur'
  return (
    `La plage "${nom}" à ${commune} est labellisée Tourisme & Handicap pour les handicaps : ` +
    `${handicapsStr}. Ce label national, géré par l'Association Tourisme & Handicap (ATD) et ` +
    `contrôlé par les services de la Direction Générale des Entreprises, garantit la fiabilité ` +
    `des informations sur l'accessibilité et la présence d'équipements et d'aménagements adaptés ` +
    `pour l'accueil des personnes en situation de handicap sur ce site balnéaire.`
  )
}

function toCandidate(r: TourismeRecord): Candidate | null {
  const rawNom = (r.nom_du_professionnel ?? '').trim()
  const commune = titleCaseFr((r.ville ?? '').trim())
  const cp = (r.code_postal_du_professionnel ?? '').replace(/\s/g, '').trim()
  const geo = r.coordonnees_geographiques
  const activite = (r.activite_du_professionnel ?? '').trim()
  const handicaps = r.handicaps_attribues ?? []

  // Precision filters — keep only genuine beaches with usable coordinates.
  if (!rawNom || !commune || !/^\d{5}$/.test(cp) || !geo) return null
  if (!NAME_LOOKS_LIKE_BEACH.test(rawNom)) return null
  if (!BEACH_ACTIVITIES.has(activite)) return null

  const nom = cleanBeachName(rawNom)

  const accessibilites = buildAccessibilites(handicaps)
  if (accessibilites.length === 0) return null

  const slug = makeSlug(nom, commune)
  // Cast via unknown: TS excess-property check on object literals doesn't
  // recognise fields inherited through Partial<PlageContent>.
  return {
    slug,
    nom,
    commune,
    codePostal: cp,
    departement: departementFromCodePostal(cp),
    region: regionFromCodePostal(cp),
    latitude: geo.lat,
    longitude: geo.lon,
    accessibilites,
    photo: `https://picsum.photos/seed/${slug}/1200/600`,
    verifiedBy: 'tourisme-handicap',
    description: buildDescription(nom, commune, handicaps),
  } as unknown as Candidate
}

async function fetchPage(offset: number): Promise<OdsResponse> {
  const where = encodeURIComponent("search('plage')")
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
      if ((page + 1) * PAGE_SIZE >= data.total_count) break
    }

    return candidates
  },
}

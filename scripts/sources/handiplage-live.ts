// Adapter for handiplage.fr — the official directory of French beaches labelled
// "Handiplage". The site runs a GeoDirectory (WordPress) custom post type whose
// beaches are exposed as structured JSON at:
//   /wp-json/geodir/v2/plages-accessibles
//
// History: this used to be an HTML scraper that probed wp/v2/{plage,plages,…}.
// Those endpoints now 404 (wp/v2/posts only returns blog articles), so the
// scraper silently yielded 0 beaches. The geodir/v2 endpoint returns ~220
// beaches with coordinates and detailed equipment fields, so we consume it
// directly. Most records have empty `zip` and a noisy `city` (the full title),
// so the commune/postcode are recovered from the coordinates via the free
// government reverse-geocoder.
//
// All network errors are swallowed (logged to stderr) so a temporary outage on
// handiplage.fr never blocks the daily import; the other sources still run.

import type { Source } from './types'
import type { Candidate } from '../lib/validate-candidate'
import { makeSlug, regionFromCodePostal, departementFromCodePostal, reverseGeocode, cleanBeachName } from '../lib/geo'
import { TYPES_ACCESSIBILITE } from '../../src/lib/content-schema'

type TypeAccessibilite = (typeof TYPES_ACCESSIBILITE)[number]

const ORIGIN = 'https://www.handiplage.fr'
const GEODIR_API = `${ORIGIN}/wp-json/geodir/v2/plages-accessibles`
const PAGE_SIZE = 100
const MAX_PAGES = 5 // 5 × 100 covers the whole catalogue (~220) with margin.

// Browser-like headers — handiplage.fr blocks plain curl/wget user agents.
const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64; plages-accessibles/1.0; +https://plages-accessibles.fr) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.5',
}

// GeoDirectory equipment fields are inconsistent: some are plain strings ("1"),
// others are objects { raw: "1", rendered: "Yes" }. These helpers read both.
type GdField = string | number | { raw?: string | number; rendered?: string } | null | undefined

function rawOf(v: GdField): string {
  if (v == null) return ''
  if (typeof v === 'object') return String(v.raw ?? v.rendered ?? '')
  return String(v)
}

function isYes(v: GdField): boolean {
  const s = rawOf(v).trim().toLowerCase()
  return s === 'yes' || s === 'oui' || s === '1' || s === 'true'
}

function numOf(v: GdField): number {
  const n = parseInt(rawOf(v), 10)
  return Number.isNaN(n) ? 0 : n
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#8211;/g, '–')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

interface GdPlace {
  title?: { raw?: string; rendered?: string }
  link?: string
  status?: string
  latitude?: string
  longitude?: string
  post_category?: Array<{ name?: string; slug?: string }>
  // Equipment fields (subset we map).
  nombre_de_tiralos?: GdField
  nombre_dhippocampes?: GdField
  nombre_dhandiflots?: GdField
  places_de_parking_rserv?: GdField
  douche_accessible?: GdField
  vestiaire_accessible?: GdField
  wc_handi__moins_de_100_m?: GdField
  rampe_daccs__5?: GdField
  accs_de_plain_pied?: GdField
  roulements_amnags_sol_dur?: GdField
  tapis_plage?: GdField
  caillebotis?: GdField
  systme_audioplage?: GdField
  nombre_dhandiplagiste?: GdField
  utilisation_du_logo_national?: GdField
}

function mapAccessibilites(p: GdPlace): TypeAccessibilite[] {
  const acc = new Set<TypeAccessibilite>()

  if (numOf(p.nombre_de_tiralos) > 0) {
    acc.add('TIRALO')
    acc.add('FAUTEUIL_ROULANT')
  }
  if (numOf(p.nombre_dhippocampes) > 0) {
    acc.add('HIPPOCAMPE')
    acc.add('FAUTEUIL_ROULANT')
  }
  if (numOf(p.nombre_dhandiflots) > 0) acc.add('FAUTEUIL_ROULANT')
  if (isYes(p.places_de_parking_rserv)) acc.add('PARKINGS_PMR')
  if (isYes(p.douche_accessible)) acc.add('DOUCHES_ACCESSIBLES')
  if (isYes(p.wc_handi__moins_de_100_m)) acc.add('SANITAIRES_ADAPTES')
  if (isYes(p.rampe_daccs__5)) acc.add('RAMPE_ACCES')
  if (isYes(p.tapis_plage) || isYes(p.caillebotis) || isYes(p.accs_de_plain_pied) || isYes(p.roulements_amnags_sol_dur)) {
    acc.add('CHEMIN_ACCES')
  }
  if (isYes(p.systme_audioplage)) acc.add('SIGNALISATION_BRAILLE')
  if (numOf(p.nombre_dhandiplagiste) > 0) acc.add('PERSONNEL_FORME')

  // Supplement from the handicap categories when equipment is sparse.
  const cats = (p.post_category ?? []).map((c) => (c.slug ?? c.name ?? '').toLowerCase())
  if (cats.includes('auditif')) acc.add('BOUCLE_MAGNETIQUE')
  if (cats.includes('visuel')) acc.add('SIGNALISATION_BRAILLE')

  return [...acc]
}

function buildDescription(nom: string, commune: string, acc: TypeAccessibilite[]): string {
  const featsTxt =
    acc.length > 0
      ? acc.map((a) => a.toLowerCase().replace(/_/g, ' ')).join(', ')
      : 'équipements adaptés PMR'
  return (
    `Plage labellisée Handiplage à ${commune}. Le label Handiplage est délivré par ` +
    `l'association nationale Handiplage après un audit sur site : il garantit un accueil adapté ` +
    `des personnes en situation de handicap et la présence d'équipements dédiés. Équipements et ` +
    `services identifiés pour "${nom}" : ${featsTxt}. Informations issues de la fiche officielle ` +
    `publiée sur handiplage.fr.`
  )
}

async function fetchAll(): Promise<GdPlace[]> {
  const out: GdPlace[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${GEODIR_API}?per_page=${PAGE_SIZE}&page=${page}`
    let rows: GdPlace[] | null = null
    try {
      const res = await fetch(url, { headers: REQUEST_HEADERS, redirect: 'follow' })
      if (!res.ok) break
      rows = (await res.json()) as GdPlace[]
    } catch {
      break
    }
    if (!Array.isArray(rows) || rows.length === 0) break
    out.push(...rows)
    if (rows.length < PAGE_SIZE) break
  }
  return out
}

async function toCandidate(p: GdPlace): Promise<Candidate | null> {
  if (p.status && p.status !== 'publish') return null

  const nom = cleanBeachName(decodeEntities(p.title?.raw ?? p.title?.rendered ?? ''))
  const lat = parseFloat(String(p.latitude ?? ''))
  const lon = parseFloat(String(p.longitude ?? ''))
  if (!nom || Number.isNaN(lat) || Number.isNaN(lon) || (lat === 0 && lon === 0)) return null

  // `zip` is empty and `city` is the noisy full title for most records, so the
  // commune/postcode are always recovered from the coordinates.
  const geo = await reverseGeocode(lat, lon)
  if (!geo) return null
  const { commune, codePostal: cp } = geo

  const accessibilites = mapAccessibilites(p)
  if (accessibilites.length < 1) return null

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
    photo: `https://picsum.photos/seed/${slug}/1200/600`,
    verifiedBy: 'handiplage.fr',
    description: buildDescription(nom, commune, accessibilites),
  } as unknown as Candidate
}

export const handiplageLiveSource: Source = {
  name: 'handiplage.fr (live)',
  async fetch(): Promise<Candidate[]> {
    const places = await fetchAll()
    if (places.length === 0) {
      console.error('[handiplage.fr] API geodir/v2 vide ou inaccessible')
      return []
    }
    console.log(`[handiplage.fr] ${places.length} fiche(s) à traiter`)

    const candidates: Candidate[] = []
    // Sequential to stay polite to the key-less reverse-geocoding API (shared IP).
    for (const p of places) {
      try {
        const c = await toCandidate(p)
        if (c) candidates.push(c)
      } catch (err) {
        console.error(`[handiplage.fr] échec fiche : ${(err as Error).message}`)
      }
    }
    return candidates
  },
}

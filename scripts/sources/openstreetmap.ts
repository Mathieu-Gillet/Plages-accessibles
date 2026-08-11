// Adapter for OpenStreetMap via the Overpass API.
//
// Query: all nodes/ways tagged `natural=beach` + `wheelchair=yes|designated|limited`
// within the French ISO area. OSM is the most comprehensive open directory of beaches
// worldwide and the `wheelchair` tag is actively maintained by the French community.
//
// Why this matters: OSM often has beaches that are NOT in the Tourisme & Handicap label
// nor in Acceslibre (uncertified but factually accessible). It's a major yield booster.
//
// API: https://overpass-api.de/api/interpreter — no auth, generous rate limits
// Fallback mirrors are automatically tried on failure.

import type { Source } from './types'
import type { Candidate } from '../lib/validate-candidate'
import { makeSlug, regionFromCodePostal, departementFromCodePostal, reverseGeocode } from '../lib/geo'
import { TYPES_ACCESSIBILITE } from '../../src/lib/content-schema'

type TypeAccessibilite = (typeof TYPES_ACCESSIBILITE)[number]

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
]

// Fetch beaches with ANY accessibility-related tag, not just `wheelchair`.
// Goal: maximise geographic coverage. The validator only enforces ≥1 documented
// feature, so a beach with parking PMR or accessible toilets but no wheelchair
// tag is still worth surfacing to visitors planning a trip.
const OVERPASS_QUERY = `
[out:json][timeout:60];
area["ISO3166-1"="FR"]["admin_level"="2"]->.fr;
(
  nwr(area.fr)["natural"="beach"]["wheelchair"];
  nwr(area.fr)["natural"="beach"]["toilets:wheelchair"="yes"];
  nwr(area.fr)["natural"="beach"]["parking:disabled"="yes"];
  nwr(area.fr)["natural"="beach"]["capacity:disabled"];
  nwr(area.fr)["natural"="beach"]["tactile_paving"="yes"];
  nwr(area.fr)["leisure"="beach_resort"]["wheelchair"];
  nwr(area.fr)["leisure"="beach_resort"]["toilets:wheelchair"="yes"];
);
out center tags 1000;
`.trim()

export interface OverpassTags {
  name?: string
  'name:fr'?: string
  'addr:city'?: string
  'addr:postcode'?: string
  wheelchair?: string
  'wheelchair:description'?: string
  'wheelchair:description:fr'?: string
  description?: string
  'description:fr'?: string
  surface?: string
  'toilets:wheelchair'?: string
  'toilets:disposal'?: string
  toilets?: string
  'parking:disabled'?: string
  'capacity:disabled'?: string
  tactile_paving?: string
  shower?: string
  lifeguard?: string
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: OverpassTags
}

interface OverpassResponse {
  elements: OverpassElement[]
}

function getCoords(e: OverpassElement): [number, number] | null {
  if (typeof e.lat === 'number' && typeof e.lon === 'number') return [e.lat, e.lon]
  if (e.center) return [e.center.lat, e.center.lon]
  return null
}

function truthy(v: string | undefined): boolean {
  if (!v) return false
  const s = v.toLowerCase()
  return s === 'yes' || s === 'designated' || s === 'true' || s === '1'
}

export function mapAccessibilites(t: OverpassTags): TypeAccessibilite[] {
  const acc = new Set<TypeAccessibilite>()

  // Wheelchair is the primary signal — required to even be in the result set.
  //
  // `wheelchair=limited` is deliberately NOT mapped to anything: in OSM it means
  // "partially accessible", i.e. it documents a LIMITATION, not a facility.
  // Mapping it to CHEMIN_ACCES ("cheminement d'accès adapté") turned a caveat
  // into a claimed amenity and was enough, on its own, to manufacture a full
  // listing out of a single ambiguous tag. A `limited` site now only qualifies
  // if it also carries a concrete equipment tag below.
  if (t.wheelchair === 'yes' || t.wheelchair === 'designated') {
    acc.add('FAUTEUIL_ROULANT')
    acc.add('CHEMIN_ACCES')
  }

  if (truthy(t['toilets:wheelchair'])) acc.add('SANITAIRES_ADAPTES')
  if (truthy(t['parking:disabled']) || (t['capacity:disabled'] && t['capacity:disabled'] !== '0')) {
    acc.add('PARKINGS_PMR')
  }
  if (truthy(t.tactile_paving)) acc.add('SIGNALISATION_BRAILLE')
  if (truthy(t.shower)) acc.add('DOUCHES_ACCESSIBLES')
  if (t.surface === 'sand' || t.surface === 'fine_sand') acc.add('SABLE_COMPACT')

  return [...acc]
}

export function buildDescription(nom: string, commune: string, t: OverpassTags): string {
  const native =
    t['wheelchair:description:fr'] ??
    t['wheelchair:description'] ??
    t['description:fr'] ??
    t.description ??
    ''

  const feats: string[] = []
  if (t.wheelchair === 'designated') feats.push('accessibilité fauteuil roulant dédiée')
  else if (t.wheelchair === 'yes') feats.push('accessibilité fauteuil roulant')
  else if (t.wheelchair === 'limited') feats.push('accessibilité fauteuil roulant limitée')
  if (truthy(t['toilets:wheelchair'])) feats.push('sanitaires adaptés PMR')
  if (truthy(t['parking:disabled'])) feats.push('parking PMR')
  if (truthy(t.shower)) feats.push('douches')
  if (truthy(t.lifeguard)) feats.push('poste de secours')
  if (t.surface === 'sand' || t.surface === 'fine_sand') feats.push('sable fin')

  const featStr = feats.length > 0 ? feats.join(', ') : 'aménagements pour personnes à mobilité réduite'
  // Wording kept strictly to what the data actually supports. The previous
  // template claimed the data was "vérifiée par recoupement avec les
  // informations terrain" — nobody performs that check — and described every
  // site as "balnéaire", which is wrong for the inland lakes and plans d'eau
  // that make up a good part of this directory.
  const core =
    `${nom}, à ${commune} : site de baignade référencé sur OpenStreetMap avec des ` +
    `informations d'accessibilité renseignées par les contributeurs locaux — ${featStr}. ` +
    `Ces données sont contributives et n'ont pas été vérifiées sur le terrain par notre ` +
    `équipe : nous vous conseillons de confirmer les équipements disponibles auprès de la ` +
    `commune avant votre visite.`

  return native.trim().length >= 40 ? `${native.trim()} ${core}` : core
}

async function toCandidate(e: OverpassElement): Promise<Candidate | null> {
  const t = e.tags ?? {}
  const nom = (t['name:fr'] ?? t.name ?? '').trim()
  if (!nom) return null

  const coords = getCoords(e)
  if (!coords) return null
  const [lat, lon] = coords

  let commune = (t['addr:city'] ?? '').trim()
  let cp = (t['addr:postcode'] ?? '').replace(/\s/g, '').trim()

  // The majority of OSM beach nodes carry no addr:* tags. Rather than discard
  // these (the single biggest source of dropped candidates), recover the
  // commune/postcode from the coordinates via the free government geocoder.
  if (!commune || !/^\d{5}$/.test(cp)) {
    const geo = await reverseGeocode(lat, lon)
    if (geo) {
      if (!commune) commune = geo.commune
      if (!/^\d{5}$/.test(cp)) cp = geo.codePostal
    }
  }
  if (!commune || !/^\d{5}$/.test(cp)) return null

  const accessibilites = mapAccessibilites(t)
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
    // No rating: nobody has reviewed this beach. The previous hard-coded 4.0
    // published a ★4/5 badge for a site with zero avis. The UI hides the badge
    // when noteGlobale is 0, so this simply stops inventing a score.
    noteGlobale: 0,
    photo: `https://picsum.photos/seed/${slug}/1200/600`,
    verifiedBy: 'openstreetmap',
    description: buildDescription(nom, commune, t),
  } as unknown as Candidate
}

async function queryOverpass(): Promise<OverpassResponse> {
  let lastErr: Error | null = null
  for (const endpoint of OVERPASS_ENDPOINTS) {
    // Abort a hung endpoint so the job moves on to the next mirror instead of
    // blocking the whole run (Overpass can stall indefinitely under load).
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 90_000)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'plages-accessibles/1.0 (+https://plages-accessibles.fr)',
        },
        body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
        signal: controller.signal,
      })
      if (!res.ok) {
        lastErr = new Error(`Overpass ${endpoint} HTTP ${res.status}`)
        continue
      }
      return res.json() as Promise<OverpassResponse>
    } catch (err) {
      lastErr = err as Error
    } finally {
      clearTimeout(timeout)
    }
  }
  throw lastErr ?? new Error('All Overpass endpoints failed')
}

export const openStreetMapSource: Source = {
  name: 'openstreetmap (overpass-api.de)',
  async fetch(): Promise<Candidate[]> {
    const data = await queryOverpass()
    const candidates: Candidate[] = []
    // Sequential to stay polite to the reverse-geocoding API (no key, shared IP).
    for (const el of data.elements) {
      const c = await toCandidate(el)
      if (c) candidates.push(c)
    }
    return candidates
  },
}

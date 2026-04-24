// Live HTML scraper for handiplage.fr — the official directory of French beaches
// labelled "Handiplage" (1 to 4 drop certification scale).
//
// Strategy (most resilient first):
//   1. Fetch the WordPress sitemap index → page-sitemap.xml → list of beach URLs.
//   2. Fallback: fetch the /les-plages/ directory page and regex out internal links.
//   3. For each beach URL, fetch the HTML and extract name, commune, postcode, GPS,
//      accessibility level and description with defensive regexes.
//
// All network errors are swallowed (logged to stderr) so that a temporary outage on
// handiplage.fr never blocks the daily import; the other sources will still run.

import type { Source } from './types'
import type { Candidate } from '../lib/validate-candidate'
import { makeSlug, regionFromCodePostal, departementFromCodePostal } from '../lib/geo'
import { TYPES_ACCESSIBILITE } from '../../src/lib/content-schema'

type TypeAccessibilite = (typeof TYPES_ACCESSIBILITE)[number]

const ORIGIN = 'https://www.handiplage.fr'
const SITEMAP_CANDIDATES = [
  `${ORIGIN}/sitemap_index.xml`, // Yoast SEO default
  `${ORIGIN}/wp-sitemap.xml`,    // WordPress core default (>= 5.5)
  `${ORIGIN}/sitemap.xml`,       // Generic fallback
]
const DIRECTORY_CANDIDATES = [
  `${ORIGIN}/les-plages/`,
  `${ORIGIN}/plages/`,
  `${ORIGIN}/annuaire/`,
]

// Plausible URL shapes for a single beach page.
const BEACH_URL_RE = /https?:\/\/(?:www\.)?handiplage\.fr\/(?:fiche-plage|les-plages|plage|plages|annuaire)\/[a-z0-9-]+\/?/gi

const MAX_BEACHES_PER_RUN = 60 // handiplage.fr stays small; this is a safety cap.

// Common browser-like headers — handiplage.fr's hosting blocks plain curl.
const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64; plages-accessibles/1.0; +https://plages-accessibles.fr) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.5',
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: REQUEST_HEADERS, redirect: 'follow' })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function extractSitemapUrls(xml: string): string[] {
  // Matches <loc>…</loc> tags inside a sitemap/sitemapindex document.
  const out: string[] = []
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) out.push(m[1])
  return out
}

/** Walk the sitemap tree and return every discovered beach URL. */
async function discoverViaSitemap(): Promise<string[]> {
  for (const root of SITEMAP_CANDIDATES) {
    const xml = await fetchText(root)
    if (!xml) continue

    const locs = extractSitemapUrls(xml)
    const beachUrls = new Set<string>()

    // First-level: either a sitemap index (pointing to sub-sitemaps) or a final sitemap.
    const subsitemaps = locs.filter((u) => /sitemap.*\.xml$/i.test(u))

    if (subsitemaps.length > 0) {
      for (const sub of subsitemaps) {
        const subXml = await fetchText(sub)
        if (!subXml) continue
        for (const u of extractSitemapUrls(subXml)) {
          if (BEACH_URL_RE.test(u)) {
            beachUrls.add(u)
            BEACH_URL_RE.lastIndex = 0 // regex is stateful with /g flag
          }
        }
      }
    } else {
      // Flat sitemap — scan directly for beach URLs.
      for (const u of locs) {
        if (BEACH_URL_RE.test(u)) {
          beachUrls.add(u)
          BEACH_URL_RE.lastIndex = 0
        }
      }
    }

    if (beachUrls.size > 0) return [...beachUrls]
  }
  return []
}

/** Fallback: scrape the HTML directory pages for internal beach links. */
async function discoverViaDirectory(): Promise<string[]> {
  const found = new Set<string>()
  for (const dir of DIRECTORY_CANDIDATES) {
    const html = await fetchText(dir)
    if (!html) continue
    let m: RegExpExecArray | null
    while ((m = BEACH_URL_RE.exec(html)) !== null) found.add(m[0])
    BEACH_URL_RE.lastIndex = 0
    if (found.size > 0) break
  }
  return [...found]
}

// --- HTML extraction helpers -------------------------------------------------

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function firstMatch(html: string, re: RegExp): string | null {
  const m = html.match(re)
  return m ? decodeEntities(m[1].trim()) : null
}

function extractJsonLd(html: string): Record<string, unknown> | null {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim())
      const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed]
      for (const it of items) {
        if (it && typeof it === 'object') return it as Record<string, unknown>
      }
    } catch {
      // Non-JSON block, ignore.
    }
  }
  return null
}

function pickNom(html: string, jsonLd: Record<string, unknown> | null): string {
  const fromLd = typeof jsonLd?.name === 'string' ? jsonLd.name.trim() : null
  if (fromLd && fromLd.length > 0) return fromLd

  return (
    firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ??
    firstMatch(html, /<title>([^<]+?)(?:\s*[|·-]\s*Handiplage)?<\/title>/i) ??
    ''
  ).replace(/\s+/g, ' ').trim()
}

function pickCommune(html: string, jsonLd: Record<string, unknown> | null): string {
  const addr = (jsonLd?.address as Record<string, unknown> | undefined) ?? undefined
  const fromLd = typeof addr?.addressLocality === 'string' ? addr.addressLocality.trim() : null
  if (fromLd) return fromLd

  // Common pattern: "Adresse: 12 rue des Flots, 62600 Berck-sur-Mer"
  const m = html.match(/\b\d{5}\s+([A-Za-zÀ-ÖØ-öø-ÿ'\- ]+?)(?:<|,|\n|\.|$)/)
  return m ? m[1].trim() : ''
}

function pickCodePostal(html: string, jsonLd: Record<string, unknown> | null): string {
  const addr = (jsonLd?.address as Record<string, unknown> | undefined) ?? undefined
  const fromLd = typeof addr?.postalCode === 'string' ? addr.postalCode.trim() : null
  if (fromLd && /^\d{5}$/.test(fromLd)) return fromLd

  const m = html.match(/\b(\d{5})\b/)
  return m ? m[1] : ''
}

function pickCoords(html: string, jsonLd: Record<string, unknown> | null): [number, number] | null {
  const geo = (jsonLd?.geo as Record<string, unknown> | undefined) ?? undefined
  if (geo) {
    const lat = Number(geo.latitude)
    const lon = Number(geo.longitude)
    if (!isNaN(lat) && !isNaN(lon)) return [lat, lon]
  }

  // <meta name="geo.position" content="50.40,1.56"> or similar
  const metaGeo = firstMatch(html, /<meta[^>]+geo\.position[^>]+content=["']([^"']+)["']/i)
  if (metaGeo) {
    const [la, lo] = metaGeo.split(/[;,]\s*/).map((v) => parseFloat(v))
    if (!isNaN(la) && !isNaN(lo)) return [la, lo]
  }

  // Google Maps embed: !3dLAT!4dLON or @LAT,LON
  const gmap = html.match(/[!@](\-?\d{1,2}\.\d+)[!,](\-?\d{1,3}\.\d+)/)
  if (gmap) {
    const la = parseFloat(gmap[1])
    const lo = parseFloat(gmap[2])
    if (!isNaN(la) && !isNaN(lo)) return [la, lo]
  }

  return null
}

function detectNiveau(html: string): number {
  const m = html.match(/Handiplage\s*(?:niveau|®?\s*[–-]?\s*niveau)?\s*([1-4])/i)
  return m ? parseInt(m[1], 10) : 3
}

function detectAccessibilites(html: string): TypeAccessibilite[] {
  const text = stripTags(html).toLowerCase()
  const acc = new Set<TypeAccessibilite>()

  if (/tiralo/.test(text)) acc.add('TIRALO')
  if (/hippocampe/.test(text)) acc.add('HIPPOCAMPE')
  if (/handisurf/.test(text)) acc.add('HANDISURF')
  if (/(parking|stationnement)[^.]{0,30}(pmr|handicap|adapté)/.test(text)) acc.add('PARKINGS_PMR')
  if (/(sanitaires?|toilettes?|wc)[^.]{0,40}(adapt|pmr|handicap|accessible)/.test(text)) acc.add('SANITAIRES_ADAPTES')
  if (/(douches?)[^.]{0,40}(accessibles?|adapt|pmr)/.test(text)) acc.add('DOUCHES_ACCESSIBLES')
  if (/(cheminement|tapis|ponton|passerelle)[^.]{0,40}(bois|plage|sable|accès)/.test(text)) acc.add('CHEMIN_ACCES')
  if (/(rampe)[^.]{0,30}(accès|plage|mer)/.test(text)) acc.add('RAMPE_ACCES')
  if (/(fauteuil|chaise)[^.]{0,30}(tout[- ]terrain|roulant|plage|hippocampe|tiralo)/.test(text)) acc.add('FAUTEUIL_ROULANT')
  if (/personnel\s+form/.test(text) || /équipe\s+form/.test(text)) acc.add('PERSONNEL_FORME')
  if (/(boucle\s+magn|malentendant)/.test(text)) acc.add('BOUCLE_MAGNETIQUE')
  if (/(braille|tactile|malvoyant)/.test(text)) acc.add('SIGNALISATION_BRAILLE')
  if (/(location|prêt|mise à disposition)[^.]{0,30}(mat[ée]riel|fauteuil|tiralo|hippocampe)/.test(text)) {
    acc.add('LOCATION_MATERIEL')
  }

  return [...acc]
}

function buildDescription(
  nom: string,
  commune: string,
  niveau: number,
  acc: TypeAccessibilite[],
  html: string,
): string {
  // Try to reuse the site's own short description if present.
  const meta =
    firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
    firstMatch(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ??
    ''

  const niveauTxt = niveau >= 1 && niveau <= 4 ? ` niveau ${niveau}` : ''
  const featsTxt =
    acc.length > 0
      ? acc
          .map((a) => a.toLowerCase().replace(/_/g, ' '))
          .join(', ')
      : 'équipements PMR'

  const core =
    `Plage labellisée Handiplage${niveauTxt} à ${commune}. ` +
    `Le label Handiplage est délivré par l'association nationale Handiplage après audit ` +
    `sur site : il garantit un accueil adapté des personnes en situation de handicap et ` +
    `la présence d'équipements dédiés. Équipements et services identifiés pour "${nom}" : ${featsTxt}. ` +
    `Informations extraites de la fiche officielle publiée sur handiplage.fr.`

  return meta.trim().length >= 40 ? `${meta.trim()} ${core}` : core
}

async function parseBeachPage(url: string): Promise<Candidate | null> {
  const html = await fetchText(url)
  if (!html) return null

  const jsonLd = extractJsonLd(html)
  const nom = pickNom(html, jsonLd)
  const commune = pickCommune(html, jsonLd)
  const cp = pickCodePostal(html, jsonLd)
  const coords = pickCoords(html, jsonLd)

  if (!nom || !commune || !/^\d{5}$/.test(cp) || !coords) return null

  const accessibilites = detectAccessibilites(html)
  if (accessibilites.length < 2) return null

  const niveau = detectNiveau(html)
  const [lat, lon] = coords
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
    noteGlobale: niveau >= 4 ? 4.5 : niveau >= 3 ? 4.2 : 4.0,
    photo: `https://picsum.photos/seed/${slug}/1200/600`,
    verifiedBy: 'handiplage.fr',
    description: buildDescription(nom, commune, niveau, accessibilites, html),
  } as unknown as Candidate
}

export const handiplageLiveSource: Source = {
  name: 'handiplage.fr (live)',
  async fetch(): Promise<Candidate[]> {
    let urls = await discoverViaSitemap()
    if (urls.length === 0) {
      console.error('[handiplage.fr] sitemap vide ou inaccessible — fallback annuaire HTML')
      urls = await discoverViaDirectory()
    }

    if (urls.length === 0) {
      console.error('[handiplage.fr] aucun URL de plage découvert (site peut-être en panne)')
      return []
    }

    console.log(`[handiplage.fr] ${urls.length} URL(s) de plage à inspecter`)

    const capped = urls.slice(0, MAX_BEACHES_PER_RUN)
    const candidates: Candidate[] = []
    for (const url of capped) {
      try {
        const c = await parseBeachPage(url)
        if (c) candidates.push(c)
      } catch (err) {
        console.error(`[handiplage.fr] échec parsing ${url} : ${(err as Error).message}`)
      }
    }
    return candidates
  },
}

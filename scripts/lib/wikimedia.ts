// scripts/lib/wikimedia.ts
// Resolve a real beach photo via the MediaWiki API.
// Strategy (in order, first hit wins):
//   1. fr.wikipedia.org page named exactly like the beach (e.g. "Plage du Prado") → pageimage
//   2. commons.wikimedia.org file search "intitle:plage <commune>" → strict filename match
//   3. commons.wikimedia.org file search "intitle:beach <commune>" → English fallback
// Returns a direct upload.wikimedia.org URL or null. We deliberately DO NOT fall
// back to the commune article's lead image — those are usually town halls, ports
// or monuments, not beaches. Better to return null and let the caller use a
// neutral placeholder than to publish a misleading photo.
//
// Wikipedia API requires a descriptive User-Agent. We comply with their policy:
// https://meta.wikimedia.org/wiki/User-Agent_policy

const USER_AGENT = 'Plages-Accessibles-Bot/1.0 (https://plages-accessibles.fr; falathar329@gmail.com)'
const WIKI_FR = 'https://fr.wikipedia.org/w/api.php'
const COMMONS = 'https://commons.wikimedia.org/w/api.php'
const THUMB_WIDTH = 1200
// Photos antérieures à cette année seront ignorées.
const MIN_PHOTO_YEAR = 2010

// Off-topic filename tokens. When a Wikipedia/Commons filename contains one of
// these (town hall, church, bridge, station, statue, museum…) it is almost
// certainly NOT a beach photo — this is exactly the failure mode where a
// commune's Wikipedia lead image (its mairie/église) got picked for a beach
// whose name equals the commune (e.g. "Audg_-_Mairie_W.jpg" for Audenge).
// Tokens are anchored to filename separators (start, `_`, `-`, space, `(`) so
// "pont" matches "..._Pont_de_..." but not "Pontarlier", and "place" does not
// match "Palace". `\b` is unusable here because `_` counts as a word char.
const OFF_TOPIC_TOKENS =
  /(?:^|[-_ (])(mairie|hotel[-_ ]?de[-_ ]?ville|town[-_ ]?hall|eglise|église|church|cathedrale|cathédrale|chapelle|abbaye|capitainerie|gare|monument|memorial|mémorial|statue|place|rue|pont|chateau|château|castle|mus[eé]e|museum|panneau)(?:[-_ ).]|$)/i
// Beach/water tokens. A filename carrying one of these overrides an off-topic
// match ("Plage_du_Pont_d'Yeu" contains "pont" but is a legitimate beach photo).
const BEACH_TOKENS =
  /(plage|beach|\bmer\b|sable|dune|littoral|baie|rivage|\blac\b|plan[-_ ]?d.?eau|[eé]tang|c[oô]te|front[-_ ]?de[-_ ]?mer|seaside|shore|coast|marine)/i

// Media that is not a photograph of a place: scanned artwork, engravings,
// cartographic plates, diagrams, logos, posters.
//
// These must be rejected UNCONDITIONALLY — unlike OFF_TOPIC_TOKENS, a beach
// keyword must NOT redeem them, because the whole failure mode is a file that
// legitimately says "plage" while being something other than a photo. Real
// offenders found in production content:
//   Morisot_Personnages_sur_la_plage.png    → a 19th-century painting
//   83129-Six-Fours-les-Plages-Sols.png     → a soil map plate
//   17051-Le_Bois-Plage-en-Ré-Routes-Hydro.png → a roads/hydrography plate
//   Les_voies_de_Stella-Plage_-_Cucq.png    → a street map
// "plan" is deliberately absent from the list: "plan d'eau" is a legitimate
// French term for the inland bathing sites in this directory.
const NON_PHOTO_TOKENS =
  /(?:^|[-_ (.])(peinture|painting|tableau|huile|aquarelle|gravure|estampe|lithographie|dessin|drawing|croquis|illustration|affiche|poster|logo|blason|armoiries|coat[-_ ]?of[-_ ]?arms|sceau|carte|map|cadastre|sch[eé]ma|diagramme|diagram|graphique|voies|routes|hydro|sols|topographie|timbre|stamp|couverture)(?:[-_ ).]|$)/i

/** Decode the trailing filename from an upload.wikimedia.org / thumbnail URL. */
function filenameOf(url: string): string {
  try {
    const path = url.split('?')[0]
    const last = path.split('/').filter(Boolean).pop() ?? ''
    return decodeURIComponent(last)
  } catch {
    return url
  }
}

/**
 * True when a photo URL is clearly off-topic for a beach (mairie, église, pont…)
 * and carries no beach/water keyword to redeem it. Used to reject misleading
 * hero photos before they are published.
 */
export function isOffTopicPhoto(url: string): boolean {
  const fn = filenameOf(url)
  return OFF_TOPIC_TOKENS.test(fn) && !BEACH_TOKENS.test(fn)
}

/**
 * True when the file is not a usable photograph of the place. Three independent
 * reasons, any of which disqualifies it:
 *
 *  1. Not hosted on Commons. `upload.wikimedia.org/wikipedia/<lang>/` paths are
 *     NON-FREE local uploads kept under fair use (film posters, album covers).
 *     Republishing them on this site would be a licensing breach — this is how
 *     the film poster "La_Plage.png" ended up illustrating a Cavalaire beach.
 *  2. Not a photographic format. Commons serves scanned artwork, map plates and
 *     diagrams overwhelmingly as PNG/SVG/TIFF, while genuine photographs are
 *     JPEG (or, more rarely, WebP). Returning null here is by design: the caller
 *     falls back to a neutral placeholder, which the site prefers over a
 *     misleading illustration.
 *  3. Filename carries an artwork/cartography token (see NON_PHOTO_TOKENS).
 */
export function isNonPhotographic(url: string): boolean {
  if (!/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\//.test(url)) return true
  const fn = filenameOf(url)
  if (!/\.(jpe?g|webp)$/i.test(fn)) return true
  return NON_PHOTO_TOKENS.test(fn)
}

// Words that carry no discriminating power when matching a filename to a place.
// "plage" is the worst offender: the Commons query is `intitle:plage <commune>`,
// so EVERY result contains it — matching on it would make the check a no-op.
const GENERIC_PLACE_TOKENS = new Set([
  'plage', 'plages', 'beach', 'beaches', 'lac', 'lacs', 'étang', 'etang', 'mer', 'mers',
  'sable', 'sables', 'dune', 'dunes', 'baignade', 'plan', 'eau', 'eaux', 'base', 'loisirs',
  'port', 'ville', 'cote', 'littoral', 'parc', 'saint', 'sainte', 'saints', 'saintes',
  'grand', 'grande', 'petit', 'petite', 'vieux', 'vieille', 'nord', 'sud', 'est', 'ouest',
  'municipale', 'centrale', 'principale', 'naturelle', 'nouvelle', 'nouveau',
  'sous', 'sur', 'les', 'des', 'aux',
])

/** Lowercase, de-accent and split a string into alphanumeric tokens. */
function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

/**
 * True when the filename actually references the place we searched for.
 *
 * Commons `intitle:plage <commune>` only constrains "plage" to the title — the
 * commune is a loose full-text term, so a file whose title merely contains
 * "plage" can win while having nothing to do with the commune. That is how
 * "Morisot_Personnages_sur_la_plage" was returned for a search on Bourges.
 *
 * We therefore require the filename to mention a distinctive (≥4 chars) token of
 * the commune or of the beach name. When neither has such a token (very short
 * commune names like "Èze"), we accept rather than over-reject.
 */
export function filenameMatchesPlace(url: string, nom: string, commune: string): boolean {
  const fileTokens = new Set(tokenize(filenameOf(url)))
  const placeTokens = [...tokenize(commune), ...tokenize(nom)].filter(
    (t) => t.length >= 4 && !GENERIC_PLACE_TOKENS.has(t),
  )
  if (placeTokens.length === 0) return true
  return placeTokens.some((t) => fileTokens.has(t))
}

/** Lowercase + strip diacritics and leading "plage de/du/des/d'" article. */
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/^(plage|plan d.?eau|lac|baignade|base de loisirs)\s+(de\s+la\s+|de\s+l.?|du\s+|des\s+|de\s+|d.?)?/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * True when the beach "name" is really just the commune name (very common for
 * Handiplage records where nom === commune). In that case, querying the
 * Wikipedia article of that name returns the COMMUNE article, whose lead image
 * is a town hall / church — never a beach. We skip that step for these.
 */
// Generic beach names that are not a usable Wikipedia article title. Looking up
// "La Plage" on fr.wikipedia returns the article about the FILM, whose lead
// image is a non-free poster — not a beach in Cavalaire-sur-Mer.
const GENERIC_NAMES = new Set([
  '', 'plage', 'la plage', 'les plages', 'grande plage', 'la grande plage',
  'plage municipale', 'plage centrale', 'plage principale', 'plan d eau',
  'baignade', 'base de loisirs', 'lac',
])

function beachNameIsJustCommune(nom: string, commune: string): boolean {
  const n = normalizeName(nom)
  const c = normalizeName(commune)
  // normalizeName strips a leading "plage de/du/des" article, so compare the
  // raw lowercase form too — "La Plage" keeps its article and must still match.
  const rawN = nom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
  return n === c || GENERIC_NAMES.has(n) || GENERIC_NAMES.has(rawN)
}

interface PageImageResponse {
  query?: {
    pages?: Record<
      string,
      {
        pageid?: number
        missing?: string
        thumbnail?: { source: string; width: number; height: number }
      }
    >
  }
}

interface CommonsSearchResponse {
  query?: {
    search?: Array<{ title: string; pageid: number }>
  }
}

interface ImageInfoItem {
  thumburl?: string
  url?: string
  timestamp?: string
  extmetadata?: {
    DateTimeOriginal?: { value: string }
    DateTime?: { value: string }
  }
}

interface ImageInfoResponse {
  query?: {
    pages?: Record<string, { imageinfo?: ImageInfoItem[] }>
  }
}

/**
 * Extrait l'année depuis un timestamp ISO, EXIF ou date libre.
 *
 * Le plancher est volontairement très bas (1000) : borner à 1900 renvoyait
 * `null` pour les œuvres anciennes, que `isPhotoRecent` interprétait comme
 * « date inconnue » et laissait donc passer. Une peinture datée de 1869 était
 * ainsi acceptée comme photo de plage. Une année antérieure au seuil doit être
 * un rejet, pas une absence d'information.
 */
function extractYear(raw: string): number | null {
  const m = raw.match(/(\d{3,4})/)
  const y = m ? parseInt(m[1], 10) : null
  return y && y >= 1000 && y <= new Date().getFullYear() ? y : null
}

/** Renvoie true si la photo est récente (>= MIN_PHOTO_YEAR) ou si aucune date n'est disponible. */
function isPhotoRecent(ii: ImageInfoItem): boolean {
  const raw =
    ii.extmetadata?.DateTimeOriginal?.value ??
    ii.extmetadata?.DateTime?.value ??
    ii.timestamp
  if (!raw) return true
  const year = extractYear(raw)
  return year === null || year >= MIN_PHOTO_YEAR
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`)
  return (await res.json()) as T
}

/** Try to get the lead pageimage of an fr.wikipedia article. */
async function tryWikipediaPageImage(title: string): Promise<string | null> {
  const url = new URL(WIKI_FR)
  url.searchParams.set('action', 'query')
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')
  url.searchParams.set('titles', title)
  url.searchParams.set('prop', 'pageimages')
  url.searchParams.set('pithumbsize', String(THUMB_WIDTH))
  url.searchParams.set('redirects', '1')

  try {
    const data = await fetchJson<PageImageResponse>(url.toString())
    const pages = data.query?.pages ?? {}
    for (const page of Object.values(pages)) {
      if (page.missing !== undefined) continue
      if (page.thumbnail?.source) return page.thumbnail.source
    }
  } catch (err) {
    console.warn(`[wikimedia] pageimage "${title}" : ${(err as Error).message}`)
  }
  return null
}

/**
 * Search Commons for files whose TITLE contains the given term + commune.
 * Using `intitle:` is much more precise than full-text search — we get hits
 * like "File:Plage_de_Cabourg.jpg" rather than random photos that happen to
 * mention the commune in their description.
 */
async function tryCommonsIntitle(
  commune: string,
  nom: string,
  term: string,
  excludeUrls?: Set<string>,
): Promise<string | null> {
  const searchUrl = new URL(COMMONS)
  searchUrl.searchParams.set('action', 'query')
  searchUrl.searchParams.set('format', 'json')
  searchUrl.searchParams.set('origin', '*')
  searchUrl.searchParams.set('list', 'search')
  searchUrl.searchParams.set('srsearch', `intitle:${term} ${commune} filetype:bitmap`)
  searchUrl.searchParams.set('srnamespace', '6') // File namespace
  searchUrl.searchParams.set('srlimit', '10') // Plus de candidats pour compenser les rejets

  try {
    const data = await fetchJson<CommonsSearchResponse>(searchUrl.toString())
    const candidates = data.query?.search ?? []
    if (candidates.length === 0) return null

    // Try each candidate in order — first one with a usable URL wins.
    for (const cand of candidates) {
      const infoUrl = new URL(COMMONS)
      infoUrl.searchParams.set('action', 'query')
      infoUrl.searchParams.set('format', 'json')
      infoUrl.searchParams.set('origin', '*')
      infoUrl.searchParams.set('titles', cand.title)
      infoUrl.searchParams.set('prop', 'imageinfo')
      infoUrl.searchParams.set('iiprop', 'url|timestamp|extmetadata')
      infoUrl.searchParams.set('iiextmetadatafilter', 'DateTimeOriginal|DateTime')
      infoUrl.searchParams.set('iiurlwidth', String(THUMB_WIDTH))

      const info = await fetchJson<ImageInfoResponse>(infoUrl.toString())
      const pages = info.query?.pages ?? {}
      for (const page of Object.values(pages)) {
        const ii = page.imageinfo?.[0]
        if (!ii) continue
        if (!isPhotoRecent(ii)) {
          const raw = ii.extmetadata?.DateTimeOriginal?.value ?? ii.extmetadata?.DateTime?.value ?? ii.timestamp
          console.warn(`[wikimedia] photo trop ancienne ignorée : ${cand.title} (${raw})`)
          continue
        }
        const url = ii.thumburl ?? ii.url
        if (!url || excludeUrls?.has(url)) continue
        if (isNonPhotographic(url)) {
          console.warn(`[wikimedia] média non photographique ignoré : ${cand.title}`)
          continue
        }
        if (isOffTopicPhoto(url)) continue
        if (!filenameMatchesPlace(url, nom, commune)) {
          console.warn(`[wikimedia] résultat sans lien avec ${commune} ignoré : ${cand.title}`)
          continue
        }
        return url
      }
    }
  } catch (err) {
    console.warn(`[wikimedia] intitle:${term} ${commune} : ${(err as Error).message}`)
  }
  return null
}

/**
 * Best-effort photo resolver. Returns a direct upload.wikimedia.org URL or null.
 * Caller is responsible for falling back (e.g. picsum) if null is returned.
 * Pass excludeUrls to avoid returning a photo already used by another beach.
 */
export async function fetchBeachPhoto(opts: {
  nom: string
  commune: string
  excludeUrls?: Set<string>
}): Promise<string | null> {
  const { excludeUrls } = opts

  // 1. Wikipedia article EXACTLY matching the beach name (best precision).
  // Skipped when the beach name is just the commune name — that article's lead
  // image is the town hall/church, not a beach (the Audenge/Gravelines bug).
  if (!beachNameIsJustCommune(opts.nom, opts.commune)) {
    const fromBeachArticle = await tryWikipediaPageImage(opts.nom)
    if (
      fromBeachArticle &&
      !excludeUrls?.has(fromBeachArticle) &&
      !isNonPhotographic(fromBeachArticle) &&
      !isOffTopicPhoto(fromBeachArticle)
    ) {
      return fromBeachArticle
    }
  }

  // 2. Commons file with "plage" in its filename for this commune (high precision)
  const fromCommonsFr = await tryCommonsIntitle(opts.commune, opts.nom, 'plage', excludeUrls)
  if (fromCommonsFr) return fromCommonsFr

  // 3. Same in English
  const fromCommonsEn = await tryCommonsIntitle(opts.commune, opts.nom, 'beach', excludeUrls)
  if (fromCommonsEn) return fromCommonsEn

  // No reliable beach photo found — return null instead of misleading commune lead.
  return null
}

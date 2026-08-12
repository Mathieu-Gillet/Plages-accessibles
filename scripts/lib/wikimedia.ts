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

// Plancher du dernier recours (cf. fetchBeachPhoto). Une photo de 2008 montre
// encore la plage d'aujourd'hui ; une carte postale de 1925 numérisée par la
// BnF, non — et Commons en regorge, avec « plage » dans le titre.
const ANNEE_PLANCHER = 1995

// Off-topic filename tokens. When a Wikipedia/Commons filename contains one of
// these (town hall, church, bridge, station, statue, museum…) it is almost
// certainly NOT a beach photo — this is exactly the failure mode where a
// commune's Wikipedia lead image (its mairie/église) got picked for a beach
// whose name equals the commune (e.g. "Audg_-_Mairie_W.jpg" for Audenge).
// Tokens are anchored to filename separators (start, `_`, `-`, space, `(`) so
// "pont" matches "..._Pont_de_..." but not "Pontarlier", and "place" does not
// match "Palace". `\b` is unusable here because `_` counts as a word char.
const OFF_TOPIC_TOKENS =
  /(?:^|[-_ (])(mairie|hotel[-_ ]?de[-_ ]?ville|town[-_ ]?hall|eglise|église|church|cathedrale|cathédrale|chapelle|abbaye|capitainerie|gare|monument|memorial|mémorial|statue|place|rue|pont|chateau|château|castle|mus[eé]e|museum|panneau)(?:[-_ )]|$)/i
// Beach/water tokens. A filename carrying one of these overrides an off-topic
// match ("Plage_du_Pont_d'Yeu" contains "pont" but is a legitimate beach photo).
const BEACH_TOKENS =
  /(plage|beach|\bmer\b|sable|dune|littoral|baie|rivage|\blac\b|plan[-_ ]?d.?eau|[eé]tang|c[oô]te|front[-_ ]?de[-_ ]?mer|seaside|shore|coast|marine)/i

/** Decode the trailing filename from an upload.wikimedia.org / thumbnail URL. */
function filenameOf(url: string): string {
  try {
    const last = url.split('/').filter(Boolean).pop() ?? ''
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
 * True quand le nom de fichier annonce explicitement une plage, un lac ou un
 * rivage. Sert de garde-fou à la recherche géographique : à 5 km d'un plan
 * d'eau, Commons référence surtout des clochers et des maisons, qu'aucune liste
 * de mots interdits ne saurait toutes énumérer. Ici on inverse la logique — on
 * n'accepte que ce qui se déclare comme une photo d'eau.
 */
function looksLikeBeachPhoto(titleOrUrl: string): boolean {
  return BEACH_TOKENS.test(filenameOf(titleOrUrl))
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
function beachNameIsJustCommune(nom: string, commune: string): boolean {
  const n = normalizeName(nom)
  const c = normalizeName(commune)
  return n === c || n === '' || n === 'plage'
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

interface CommonsGeosearchResponse {
  query?: {
    geosearch?: Array<{ title: string; pageid: number; dist: number }>
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

/** Extrait l'année depuis un timestamp ISO, EXIF ou date libre. */
function extractYear(raw: string): number | null {
  const m = raw.match(/(\d{4})/)
  const y = m ? parseInt(m[1], 10) : null
  return y && y >= 1900 && y <= new Date().getFullYear() ? y : null
}

/** Renvoie true si la photo est assez récente, ou si aucune date n'est disponible. */
function isPhotoRecent(ii: ImageInfoItem, anneeMin = MIN_PHOTO_YEAR): boolean {
  const raw =
    ii.extmetadata?.DateTimeOriginal?.value ??
    ii.extmetadata?.DateTime?.value ??
    ii.timestamp
  if (!raw) return true
  const year = extractYear(raw)
  return year === null || year >= anneeMin
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
  term: string,
  excludeUrls?: Set<string>,
  anneeMin = MIN_PHOTO_YEAR,
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
      const resolue = await resoudreUrlImage(cand.title, excludeUrls, anneeMin)
      if (resolue) return resolue
    }
  } catch (err) {
    console.warn(`[wikimedia] intitle:${term} ${commune} : ${(err as Error).message}`)
  }
  return null
}

/**
 * Résout un titre `File:…` de Commons en URL de vignette utilisable.
 *
 * `anneeMin` abaisse le filtre de fraîcheur pour le dernier recours : une photo
 * de 2008 d'une plage montre toujours cette plage, alors qu'un aplat vide ne
 * montre rien. Le plancher reste haut par rapport aux fonds numérisés — sans
 * lui, une carte postale de 1925 se glisse dans le catalogue.
 */
async function resoudreUrlImage(
  title: string,
  excludeUrls?: Set<string>,
  anneeMin = MIN_PHOTO_YEAR,
): Promise<string | null> {
  const infoUrl = new URL(COMMONS)
  infoUrl.searchParams.set('action', 'query')
  infoUrl.searchParams.set('format', 'json')
  infoUrl.searchParams.set('origin', '*')
  infoUrl.searchParams.set('titles', title)
  infoUrl.searchParams.set('prop', 'imageinfo')
  infoUrl.searchParams.set('iiprop', 'url|timestamp|extmetadata')
  infoUrl.searchParams.set('iiextmetadatafilter', 'DateTimeOriginal|DateTime')
  infoUrl.searchParams.set('iiurlwidth', String(THUMB_WIDTH))

  const info = await fetchJson<ImageInfoResponse>(infoUrl.toString())
  for (const page of Object.values(info.query?.pages ?? {})) {
    const ii = page.imageinfo?.[0]
    if (!ii) continue
    if (!isPhotoRecent(ii, anneeMin)) continue
    const url = ii.thumburl ?? ii.url
    if (url && !excludeUrls?.has(url) && !isOffTopicPhoto(url)) return url
  }
  return null
}

/**
 * Recherche géographique : les fichiers Commons géolocalisés autour des
 * coordonnées de la plage, du plus proche au plus lointain.
 *
 * C'est le dernier recours, et le seul qui fonctionne pour les baignades
 * intérieures (lacs, bases de loisirs) : leur nom n'a pas d'article Wikipédia
 * et ne contient ni « plage » ni le nom de la commune. La contrepartie est que
 * la proximité seule ne garantit rien — d'où le filtre `looksLikeBeachPhoto`,
 * qui n'accepte qu'un fichier se déclarant comme plage, lac ou rivage.
 */
async function tryCommonsGeosearch(
  latitude: number,
  longitude: number,
  excludeUrls?: Set<string>,
  anneeMin = MIN_PHOTO_YEAR,
): Promise<string | null> {
  const url = new URL(COMMONS)
  url.searchParams.set('action', 'query')
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')
  url.searchParams.set('list', 'geosearch')
  url.searchParams.set('gscoord', `${latitude}|${longitude}`)
  url.searchParams.set('gsradius', '4000') // 4 km : au-delà, on quitte le plan d'eau
  url.searchParams.set('gsnamespace', '6') // espace Fichier
  url.searchParams.set('gslimit', '50')

  try {
    const data = await fetchJson<CommonsGeosearchResponse>(url.toString())
    const candidats = (data.query?.geosearch ?? []).filter((c) => looksLikeBeachPhoto(c.title))

    for (const candidat of candidats) {
      const resolue = await resoudreUrlImage(candidat.title, excludeUrls, anneeMin)
      if (resolue) return resolue
    }
  } catch (err) {
    console.warn(`[wikimedia] geosearch ${latitude},${longitude} : ${(err as Error).message}`)
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
  latitude?: number
  longitude?: number
  excludeUrls?: Set<string>
}): Promise<string | null> {
  const { excludeUrls } = opts

  // 1. Wikipedia article EXACTLY matching the beach name (best precision).
  // Skipped when the beach name is just the commune name — that article's lead
  // image is the town hall/church, not a beach (the Audenge/Gravelines bug).
  if (!beachNameIsJustCommune(opts.nom, opts.commune)) {
    const fromBeachArticle = await tryWikipediaPageImage(opts.nom)
    if (fromBeachArticle && !excludeUrls?.has(fromBeachArticle) && !isOffTopicPhoto(fromBeachArticle)) {
      return fromBeachArticle
    }
  }

  // 2. Commons file with "plage" in its filename for this commune (high precision)
  const fromCommonsFr = await tryCommonsIntitle(opts.commune, 'plage', excludeUrls)
  if (fromCommonsFr) return fromCommonsFr

  // 3. Same in English
  const fromCommonsEn = await tryCommonsIntitle(opts.commune, 'beach', excludeUrls)
  if (fromCommonsEn) return fromCommonsEn

  // 4. Autour des coordonnées — rattrape les baignades intérieures, dont le nom
  //    ne ressemble ni à un article Wikipédia ni au nom de la commune.
  const aDesCoordonnees = opts.latitude !== undefined && opts.longitude !== undefined
  if (aDesCoordonnees) {
    const fromGeo = await tryCommonsGeosearch(opts.latitude!, opts.longitude!, excludeUrls)
    if (fromGeo) return fromGeo
  }

  // 5. Dernier recours : les mêmes recherches, filtre de fraîcheur levé. Une
  //    photo de 2008 de la plage de Siouville reste une photo de cette plage ;
  //    l'alternative n'est pas une photo plus récente, c'est aucune photo.
  const anciennes = await tryCommonsIntitle(opts.commune, 'plage', excludeUrls, ANNEE_PLANCHER)
  if (anciennes) return anciennes
  if (aDesCoordonnees) {
    const geoAncienne = await tryCommonsGeosearch(opts.latitude!, opts.longitude!, excludeUrls, ANNEE_PLANCHER)
    if (geoAncienne) return geoAncienne
  }

  // No reliable beach photo found — return null instead of misleading commune lead.
  return null
}

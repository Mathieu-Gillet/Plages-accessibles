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

/** Extrait l'année depuis un timestamp ISO, EXIF ou date libre. */
function extractYear(raw: string): number | null {
  const m = raw.match(/(\d{4})/)
  const y = m ? parseInt(m[1], 10) : null
  return y && y >= 1900 && y <= new Date().getFullYear() ? y : null
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
async function tryCommonsIntitle(commune: string, term: string, excludeUrls?: Set<string>): Promise<string | null> {
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
        if (url && !excludeUrls?.has(url)) return url
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

  // 1. Wikipedia article EXACTLY matching the beach name (best precision)
  const fromBeachArticle = await tryWikipediaPageImage(opts.nom)
  if (fromBeachArticle && !excludeUrls?.has(fromBeachArticle)) return fromBeachArticle

  // 2. Commons file with "plage" in its filename for this commune (high precision)
  const fromCommonsFr = await tryCommonsIntitle(opts.commune, 'plage', excludeUrls)
  if (fromCommonsFr) return fromCommonsFr

  // 3. Same in English
  const fromCommonsEn = await tryCommonsIntitle(opts.commune, 'beach', excludeUrls)
  if (fromCommonsEn) return fromCommonsEn

  // No reliable beach photo found — return null instead of misleading commune lead.
  return null
}

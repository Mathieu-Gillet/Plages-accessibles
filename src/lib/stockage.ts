// src/lib/stockage.ts
// Dépôt d'images dans Supabase Storage (bucket `avis-photos`).
//
// Deux usages, une seule porte : la photo jointe à un avis (/api/vote) et la
// photo d'une plage proposée (/api/contribuer). Dans les deux cas c'est le
// serveur qui téléverse, avec la service role key — ni le navigateur ni
// l'application mobile ne parlent jamais directement à Supabase.
import 'server-only'

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/+$/, '')
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export const BUCKET_IMAGES = 'avis-photos'

/** Extension de fichier par type MIME accepté. */
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export class StockageError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

/** True quand le stockage est utilisable. Sans lui, l'appelant ignore la photo. */
export function stockageConfigure(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_KEY)
}

export function extensionPour(typeMime: string): string | null {
  return EXTENSIONS[typeMime] ?? null
}

/**
 * Téléverse une image et renvoie son URL publique.
 *
 * `chemin` doit être imprévisible (il contient un UUID ou un slug + horodatage) :
 * le bucket est public en lecture, ce qui n'expose que les objets dont on
 * connaît déjà l'adresse exacte, mais n'en rend aucun énumérable.
 */
export async function televerserImage(opts: {
  chemin: string
  contenu: ArrayBuffer
  typeMime: string
}): Promise<string> {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new StockageError(503, 'Stockage non configuré')
  }

  let res: Response
  try {
    res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET_IMAGES}/${opts.chemin}`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': opts.typeMime,
        'x-upsert': 'true',
      },
      body: opts.contenu,
      cache: 'no-store',
    })
  } catch (err) {
    console.error('[stockage] téléversement injoignable :', err)
    throw new StockageError(502, 'Stockage injoignable')
  }

  if (!res.ok) {
    throw new StockageError(res.status, `Téléversement refusé (HTTP ${res.status})`)
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_IMAGES}/${opts.chemin}`
}

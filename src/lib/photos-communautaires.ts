// src/lib/photos-communautaires.ts
// Galerie de photos proposées par les visiteurs : lecture, dépôt, « j'aime ».
//
// Même parti pris que src/lib/votes.ts : appels REST bruts à PostgREST avec la
// service role key, jamais exposée au client. Les lectures dégradent en liste
// vide (une galerie absente ne casse pas une fiche), les écritures remontent
// leur erreur (le visiteur doit savoir si sa photo est partie).
import 'server-only'

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/+$/, '')
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const REVALIDATE_SECONDES = 300
export const TAG_PHOTOS = 'photos-communautaires'

/** Plafond par appareil et par plage — illustrer n'est pas inonder. */
export const MAX_PHOTOS_PAR_PROPOSANT = 3

export interface PhotoCommunautaire {
  id: string
  url: string
  auteur: string | null
  likes: number
  date: string
}

export class PhotosError extends Error {
  constructor(
    public step: string,
    public status: number,
  ) {
    super(`Photos error at "${step}": HTTP ${status}`)
  }
}

export function photosConfigurees(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_KEY)
}

function entetes(): Record<string, string> {
  return {
    apikey: SERVICE_KEY as string,
    Authorization: `Bearer ${SERVICE_KEY}`,
  }
}

/**
 * Photos publiées d'une plage, la plus aimée d'abord.
 *
 * L'ordre est la fonctionnalité : l'application prend la première comme image
 * principale, ce qui laisse la communauté corriger une photo d'import ratée
 * sans intervention éditoriale.
 */
export async function getPhotosPlage(slug: string): Promise<PhotoCommunautaire[]> {
  if (!SUPABASE_URL || !SERVICE_KEY) return []
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/photos_publiees` +
        `?select=id,url,auteur,likes,created_at` +
        `&plage_slug=eq.${encodeURIComponent(slug)}` +
        `&order=likes.desc,created_at.desc`,
      {
        headers: entetes(),
        next: { revalidate: REVALIDATE_SECONDES, tags: [TAG_PHOTOS] },
      },
    )
    if (!res.ok) {
      console.error(`[photos] lecture ${slug}: HTTP ${res.status}`)
      return []
    }
    const rows = (await res.json()) as Array<{
      id: string
      url: string
      auteur: string | null
      likes: number
      created_at: string
    }>
    return rows.map((r) => ({
      id: r.id,
      url: r.url,
      auteur: r.auteur,
      likes: r.likes,
      date: r.created_at,
    }))
  } catch (err) {
    console.error('[photos] lecture:', err)
    return []
  }
}

async function ecrire(
  step: string,
  chemin: string,
  init: { method: string; headers?: Record<string, string>; body?: string },
): Promise<Response> {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new PhotosError('non configuré', 503)
  try {
    return await fetch(`${SUPABASE_URL}/rest/v1/${chemin}`, {
      method: init.method,
      headers: { ...entetes(), ...init.headers },
      body: init.body,
      cache: 'no-store',
    })
  } catch (err) {
    console.error(`[photos] ${step}:`, err)
    throw new PhotosError(step, 0)
  }
}

/** Nombre de photos déjà proposées depuis cet appareil pour cette plage. */
export async function compterPhotosProposant(
  slug: string,
  proposantHash: string,
): Promise<number> {
  const res = await ecrire(
    'compter photos',
    `photos_plage?select=id&plage_slug=eq.${encodeURIComponent(slug)}` +
      `&proposant_hash=eq.${encodeURIComponent(proposantHash)}`,
    { method: 'HEAD', headers: { Prefer: 'count=exact' } },
  )
  if (!res.ok) throw new PhotosError('compter photos', res.status)
  return Number(res.headers.get('content-range')?.split('/')[1]) || 0
}

export async function enregistrerPhoto(photo: {
  slug: string
  url: string
  auteur?: string
  proposantHash: string
  ipHash: string
}): Promise<void> {
  const res = await ecrire('enregistrer photo', 'photos_plage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({
      plage_slug: photo.slug,
      url: photo.url,
      auteur: photo.auteur ?? null,
      proposant_hash: photo.proposantHash,
      ip_hash: photo.ipHash,
    }),
  })
  if (!res.ok) throw new PhotosError('enregistrer photo', res.status)
}

/**
 * Ajoute ou retire un « j'aime ». Idempotent des deux côtés : la clé primaire
 * (photo, votant) absorbe un double clic, et retirer un like inexistant n'est
 * pas une erreur.
 */
export async function basculerLike(
  photoId: string,
  votantHash: string,
  aimer: boolean,
): Promise<void> {
  if (aimer) {
    const res = await ecrire('ajouter like', 'photos_likes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // `merge-duplicates` : réappuyer sur le cœur ne doit pas renvoyer 409.
        Prefer: 'return=minimal,resolution=merge-duplicates',
      },
      body: JSON.stringify({ photo_id: photoId, votant_hash: votantHash }),
    })
    if (!res.ok) throw new PhotosError('ajouter like', res.status)
    return
  }

  const res = await ecrire(
    'retirer like',
    `photos_likes?photo_id=eq.${encodeURIComponent(photoId)}` +
      `&votant_hash=eq.${encodeURIComponent(votantHash)}`,
    { method: 'DELETE', headers: { Prefer: 'return=minimal' } },
  )
  if (!res.ok) throw new PhotosError('retirer like', res.status)
}

/** Décompte à la source, pour renvoyer au client l'état réel après son clic. */
export async function compterLikes(photoId: string): Promise<number> {
  const res = await ecrire(
    'compter likes',
    `photos_likes?select=photo_id&photo_id=eq.${encodeURIComponent(photoId)}`,
    { method: 'HEAD', headers: { Prefer: 'count=exact' } },
  )
  if (!res.ok) throw new PhotosError('compter likes', res.status)
  return Number(res.headers.get('content-range')?.split('/')[1]) || 0
}

/** True si la photo existe et est publiée — garde-fou avant d'accepter un like. */
export async function photoPubliee(photoId: string): Promise<boolean> {
  if (!SUPABASE_URL || !SERVICE_KEY) return false
  const res = await ecrire(
    'verifier photo',
    `photos_plage?select=id&id=eq.${encodeURIComponent(photoId)}&statut=eq.publie`,
    { method: 'GET' },
  )
  if (!res.ok) return false
  return ((await res.json()) as unknown[]).length > 0
}

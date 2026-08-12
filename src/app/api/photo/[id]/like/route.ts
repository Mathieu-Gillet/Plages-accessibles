// src/app/api/photo/[id]/like/route.ts
// « J'aime » sur une photo de la galerie communautaire.
//
// C'est le mécanisme qui fait remonter la meilleure image d'une plage sans
// arbitrage éditorial : `photos_publiees` trie par nombre de likes, et
// l'application prend la première comme illustration principale.
//
// Déduplication par cookie anonyme, comme les votes — un appareil, une voix.
import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { clientIp, isRateLimited } from '@/lib/anti-spam'
import { hashEmpreinte } from '@/lib/votes-core'
import { lireVotant, poserCookieVotant } from '@/lib/votant'
import { selDeVote, votesConfigures } from '@/lib/votes'
import {
  PhotosError,
  TAG_PHOTOS,
  basculerLike,
  compterLikes,
  photoPubliee,
} from '@/lib/photos-communautaires'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CorpsSchema = z.object({ aimer: z.boolean() })

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!UUID.test(id)) {
    return Response.json({ error: 'Identifiant invalide' }, { status: 400 })
  }

  if (!votesConfigures()) {
    return Response.json({ error: 'Momentanément indisponible' }, { status: 503 })
  }

  const ip = clientIp(req)
  // Généreux : liker plusieurs photos d'affilée est un usage normal.
  if (isRateLimited(ip, 60)) {
    return Response.json({ error: 'Trop de requêtes, réessayez plus tard' }, { status: 429 })
  }

  let corps: unknown
  try {
    corps = await req.json()
  } catch {
    return Response.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }
  const parsed = CorpsSchema.safeParse(corps)
  if (!parsed.success) {
    return Response.json({ error: 'Données invalides' }, { status: 400 })
  }

  // Une photo en attente de modération ne doit pas pouvoir être likée : ce
  // serait un moyen de deviner son existence avant publication.
  if (!(await photoPubliee(id))) {
    return Response.json({ error: 'Photo introuvable' }, { status: 404 })
  }

  const votant = await lireVotant()
  const votantHash = hashEmpreinte(selDeVote(), votant.id)

  try {
    await basculerLike(id, votantHash, parsed.data.aimer)
    const likes = await compterLikes(id)
    revalidateTag(TAG_PHOTOS)

    const res = NextResponse.json({ ok: true, likes })
    poserCookieVotant(res, votant)
    return res
  } catch (err) {
    if (err instanceof PhotosError) {
      console.error(`[api/photo/like] ${err.message}`)
      return Response.json({ error: 'Erreur d’enregistrement' }, { status: 502 })
    }
    console.error('[api/photo/like] Unexpected error:', err)
    return Response.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

// src/app/api/plage/[slug]/photos/route.ts
// Dépôt d'une photo par un visiteur, en complément de l'illustration existante.
//
// L'import automatique va chercher ses images sur Wikimedia Commons, qui pour
// beaucoup de communes n'a que la mairie, l'église ou un plan de ville. Cette
// route est la porte de sortie : quelqu'un sur place photographie la plage, et
// la communauté départage ensuite au « j'aime ».
//
// Multipart uniquement — c'est une image qu'on envoie, pas du JSON.
import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { clientIp, isRateLimited } from '@/lib/anti-spam'
import { getPlageBySlug } from '@/lib/content'
import { TAILLE_MAX_PHOTO_AVIS, TYPES_IMAGE_AVIS } from '@/types'
import { hashEmpreinte } from '@/lib/votes-core'
import { lireVotant, poserCookieVotant } from '@/lib/votant'
import { selDeVote, votesConfigures } from '@/lib/votes'
import { extensionPour, stockageConfigure, televerserImage } from '@/lib/stockage'
import {
  MAX_PHOTOS_PAR_PROPOSANT,
  PhotosError,
  TAG_PHOTOS,
  compterPhotosProposant,
  enregistrerPhoto,
} from '@/lib/photos-communautaires'

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Notification de modération, best-effort : sans Resend, la photo attend quand même. */
async function notifierModeration(opts: {
  nom: string
  slug: string
  url: string
  auteur?: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  const to = process.env.ADMIN_EMAIL
  if (!apiKey || !from || !to) return

  const html = `
<!DOCTYPE html>
<html lang="fr">
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
  <h2 style="color:#0369a1">Photo à modérer — ${escHtml(opts.nom)}</h2>
  <p><img src="${escHtml(opts.url)}" alt="" style="max-width:100%;border-radius:8px"></p>
  <p style="color:#475569">
    Proposée par ${escHtml(opts.auteur ?? 'un visiteur anonyme')} ·
    Plage : <code>${escHtml(opts.slug)}</code>
  </p>
  <p style="color:#475569">
    Pour publier : passer <code>statut</code> à <code>publie</code> sur la ligne
    correspondante de <code>photos_plage</code> (Supabase → Table editor).
  </p>
</body>
</html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `[Modération] Photo — ${opts.nom}`,
        html,
      }),
    })
    if (!res.ok) {
      console.error('[api/photos] Resend:', res.status, await res.text())
    }
  } catch (err) {
    console.error('[api/photos] Resend:', err)
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  const plage = getPlageBySlug(slug)
  if (!plage) {
    return Response.json({ error: 'Plage introuvable' }, { status: 404 })
  }

  if (!votesConfigures() || !stockageConfigure()) {
    return Response.json(
      { error: 'Les photos sont momentanément indisponibles' },
      { status: 503 },
    )
  }

  const ip = clientIp(req)
  // Plus strict que le vote : une photo coûte du stockage et une relecture.
  if (isRateLimited(ip, 5)) {
    return Response.json({ error: 'Trop de requêtes, réessayez plus tard' }, { status: 429 })
  }

  let photo: File | null = null
  let auteur: string | undefined
  try {
    const form = await req.formData()
    const fichier = form.get('photo')
    photo = fichier instanceof File && fichier.size > 0 ? fichier : null
    const nom = form.get('auteur')
    auteur = typeof nom === 'string' && nom.trim() ? nom.trim().slice(0, 100) : undefined
  } catch {
    return Response.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  if (!photo) {
    return Response.json({ error: 'Aucune photo reçue' }, { status: 400 })
  }
  if (!TYPES_IMAGE_AVIS.includes(photo.type as (typeof TYPES_IMAGE_AVIS)[number])) {
    return Response.json(
      { error: 'Format de photo non supporté (JPEG, PNG ou WebP)' },
      { status: 415 },
    )
  }
  if (photo.size > TAILLE_MAX_PHOTO_AVIS) {
    return Response.json({ error: 'Photo trop lourde (5 Mo maximum)' }, { status: 413 })
  }

  const votant = await lireVotant()
  const sel = selDeVote()
  const proposantHash = hashEmpreinte(sel, votant.id)
  const ipHash = hashEmpreinte(sel, ip)

  try {
    if ((await compterPhotosProposant(slug, proposantHash)) >= MAX_PHOTOS_PAR_PROPOSANT) {
      return Response.json(
        { error: `Vous avez déjà proposé ${MAX_PHOTOS_PAR_PROPOSANT} photos pour cette plage` },
        { status: 429 },
      )
    }

    const extension = extensionPour(photo.type)
    if (!extension) {
      return Response.json({ error: 'Format de photo non supporté' }, { status: 415 })
    }

    // Le chemin porte l'empreinte du proposant et l'horodatage : imprévisible,
    // et suffisant pour retrouver l'objet à partir de la ligne à modérer.
    const url = await televerserImage({
      chemin: `galerie/${slug}/${proposantHash.slice(0, 12)}-${Date.now()}.${extension}`,
      contenu: await photo.arrayBuffer(),
      typeMime: photo.type,
    })

    await enregistrerPhoto({ slug, url, auteur, proposantHash, ipHash })
    revalidateTag(TAG_PHOTOS)

    await notifierModeration({ nom: plage.nom, slug, url, auteur })

    const res = NextResponse.json(
      { ok: true, enModeration: true },
      { status: 201 },
    )
    poserCookieVotant(res, votant)
    return res
  } catch (err) {
    if (err instanceof PhotosError) {
      console.error(`[api/photos] ${err.message}`)
      return Response.json({ error: 'Erreur d’enregistrement de la photo' }, { status: 502 })
    }
    console.error('[api/photos] Unexpected error:', err)
    return Response.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

// src/app/api/vote/route.ts
// Dépôt d'un vote communautaire : note d'accessibilité + confirmation des
// équipements annoncés + commentaire optionnel (modéré avant publication).
//
// Remplace l'ancien /api/avis, qui ouvrait une Pull Request GitHub par avis :
// un système de vote avec seuil et déduplication ne peut pas reposer sur une
// PR à merger à la main.
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { clientIp, isHoneypotTriggered, isRateLimited } from '@/lib/anti-spam'
import { getPlageBySlug } from '@/lib/content'
import { TYPES_ACCESSIBILITE } from '@/lib/content-schema'
import {
  SEUIL_VOTES,
  STATUTS_EQUIPEMENT,
  TAILLE_MAX_PHOTO_AVIS,
  TYPES_IMAGE_AVIS,
} from '@/types'
import { hashEmpreinte, normaliserEquipements } from '@/lib/votes-core'
import { lireVotant, poserCookieVotant } from '@/lib/votant'
import {
  DejaVoteError,
  MAX_VOTES_PAR_IP,
  SupabaseError,
  TAG_VOTES,
  attacherPhotoAuVote,
  compterVotesIp,
  compterVotesPlage,
  enregistrerVote,
  selDeVote,
  televerserPhotoAvis,
  votesConfigures,
} from '@/lib/votes'

const VotePayloadSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug invalide'),
  note: z.number().int().min(1).max(5),
  auteur: z.string().max(100).optional(),
  commentaire: z.string().max(2000).optional(),
  /** { TIRALO: 'vu', PARKINGS_PMR: 'absent', … } — bornée côté serveur. */
  equipements: z
    .record(z.enum(TYPES_ACCESSIBILITE), z.enum(STATUTS_EQUIPEMENT))
    .default({}),
})

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Notification admin best-effort : un commentaire attend une modération
 * (`statut = 'en_attente'`) avant d'être visible. Une config Resend absente ne
 * bloque jamais le vote — la note, elle, est déjà comptabilisée.
 */
async function notifierModeration(opts: {
  nom: string
  slug: string
  note: number
  auteur?: string
  commentaire: string
  photoUrl?: string | null
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  const to = process.env.ADMIN_EMAIL
  if (!apiKey || !from || !to) return

  const etoiles = '★'.repeat(opts.note) + '☆'.repeat(5 - opts.note)
  const html = `
<!DOCTYPE html>
<html lang="fr">
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
  <h2 style="color:#0369a1">Commentaire à modérer — ${escHtml(opts.nom)}</h2>
  <p style="color:#475569">
    La note (${etoiles} ${opts.note}/5) est déjà comptabilisée.
    Seul le texte ci-dessous attend une validation.
  </p>
  ${
    opts.commentaire
      ? `<blockquote style="border-left:3px solid #0369a1;margin:0;padding:8px 12px;background:#f8fafc">
    ${escHtml(opts.commentaire)}
  </blockquote>`
      : '<p style="color:#475569"><em>Aucun texte — cet avis ne contient qu\'une photo.</em></p>'
  }
  ${
    opts.photoUrl
      ? `<p style="color:#475569">Photo jointe (à relire avant publication) :</p>
  <p><img src="${escHtml(opts.photoUrl)}" alt="" style="max-width:100%;border-radius:8px"></p>`
      : ''
  }
  <p style="color:#475569">
    Auteur : ${escHtml(opts.auteur ?? 'Anonyme')} · Plage : <code>${escHtml(opts.slug)}</code>
  </p>
  <p style="color:#475569">
    Pour publier : passer <code>statut</code> à <code>publie</code> sur la ligne
    correspondante de la table <code>votes</code> (Supabase → Table editor).
  </p>
</body>
</html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `[Modération] ${opts.nom} — ${opts.note}/5`,
        html,
      }),
    })
    if (!res.ok) {
      console.error('[api/vote] Resend notification error:', res.status, await res.text())
    }
  } catch (err) {
    console.error('[api/vote] Resend notification error:', err)
  }
}

/**
 * Une requête de vote arrive sous deux formes :
 *   · `application/json` — le formulaire du site, inchangé ;
 *   · `multipart/form-data` — l'application mobile, quand une photo accompagne
 *     l'avis. Le corps JSON voyage alors dans le champ `payload`, la photo dans
 *     le champ `photo`.
 *
 * Le multipart évite le base64, qui gonflerait l'image de 33 % et ferait
 * frôler la limite de taille de corps de la plateforme sur une photo de 3 Mo.
 */
async function lireRequete(
  req: Request,
): Promise<{ body: unknown; photo: File | null } | null> {
  const typeContenu = req.headers.get('content-type') ?? ''

  if (!typeContenu.includes('multipart/form-data')) {
    try {
      return { body: await req.json(), photo: null }
    } catch {
      return null
    }
  }

  try {
    const form = await req.formData()
    const brut = form.get('payload')
    if (typeof brut !== 'string') return null
    const photo = form.get('photo')
    return {
      body: JSON.parse(brut),
      photo: photo instanceof File && photo.size > 0 ? photo : null,
    }
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const requete = await lireRequete(req)
  if (!requete) {
    return Response.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }
  const { body, photo } = requete

  if (photo) {
    if (!TYPES_IMAGE_AVIS.includes(photo.type as (typeof TYPES_IMAGE_AVIS)[number])) {
      return Response.json(
        { error: 'Format de photo non supporté (JPEG, PNG ou WebP)' },
        { status: 415 },
      )
    }
    if (photo.size > TAILLE_MAX_PHOTO_AVIS) {
      return Response.json({ error: 'Photo trop lourde (5 Mo maximum)' }, { status: 413 })
    }
  }

  // Les bots remplissent le champ caché : on simule un succès pour ne pas
  // qu'ils s'adaptent.
  if (isHoneypotTriggered(body)) {
    return Response.json({ ok: true }, { status: 201 })
  }

  const ip = clientIp(req)
  // Plus permissif que /api/contribuer (10/h) : voter est le geste que le site
  // cherche à encourager, et l'unicité réelle est garantie en base.
  if (isRateLimited(ip, 10)) {
    return Response.json({ error: 'Trop de requêtes, réessayez plus tard' }, { status: 429 })
  }

  const parsed = VotePayloadSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const { slug, note, auteur, commentaire, equipements } = parsed.data

  if (!votesConfigures()) {
    console.error('[api/vote] Supabase non configuré (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VOTE_SALT)')
    return Response.json(
      { error: 'Les votes sont momentanément indisponibles' },
      { status: 503 },
    )
  }

  // La fiche est la source de vérité : elle valide l'existence du slug et borne
  // les équipements qu'un client peut confirmer ou infirmer.
  const plage = getPlageBySlug(slug)
  if (!plage) {
    return Response.json({ error: 'Plage introuvable' }, { status: 404 })
  }

  const { vus, absents } = normaliserEquipements(equipements, plage.accessibilites)

  // Identité du votant : cookie anonyme posé au premier vote.
  const votant = await lireVotant()
  const sel = selDeVote()
  const votantHash = hashEmpreinte(sel, votant.id)
  const ipHash = hashEmpreinte(sel, ip)

  let photoUrl: string | null = null

  try {
    // Plafond souple par IP : tolère une famille, bloque une ferme à votes.
    if ((await compterVotesIp(slug, ipHash)) >= MAX_VOTES_PAR_IP) {
      return Response.json(
        { error: 'Trop de votes déposés depuis ce réseau pour cette plage' },
        { status: 429 },
      )
    }

    const voteId = await enregistrerVote({
      slug,
      note,
      equipementsVus: vus,
      equipementsAbsents: absents,
      auteur: auteur?.trim() || undefined,
      commentaire: commentaire?.trim() || undefined,
      votantHash,
      ipHash,
    })

    // Best-effort, et volontairement : la note est déjà comptabilisée. Perdre
    // la photo à cause d'un incident de stockage ne doit pas faire perdre le
    // vote, ni afficher une erreur à quelqu'un dont la contribution est passée.
    if (photo) {
      try {
        const url = await televerserPhotoAvis({
          voteId,
          slug,
          contenu: await photo.arrayBuffer(),
          typeMime: photo.type,
        })
        await attacherPhotoAuVote(voteId, url)
        photoUrl = url
      } catch (err) {
        console.error('[api/vote] photo non enregistrée :', err)
      }
    }
  } catch (err) {
    if (err instanceof DejaVoteError) {
      return Response.json(
        { error: 'Vous avez déjà voté pour cette plage' },
        { status: 409 },
      )
    }
    if (err instanceof SupabaseError) {
      console.error(`[api/vote] ${err.message}`)
      return Response.json({ error: 'Erreur d’enregistrement du vote' }, { status: 502 })
    }
    console.error('[api/vote] Unexpected error:', err)
    return Response.json({ error: 'Erreur interne' }, { status: 500 })
  }

  // Purge les agrégats en cache pour que le vote soit visible immédiatement,
  // sans attendre la revalidation périodique.
  revalidateTag(TAG_VOTES)
  revalidatePath(`/plage/${slug}`)
  revalidatePath('/')

  if (commentaire?.trim() || photoUrl) {
    await notifierModeration({
      nom: plage.nom,
      slug,
      note,
      auteur: auteur?.trim() || undefined,
      commentaire: commentaire?.trim() ?? '',
      photoUrl,
    })
  }

  // Comptage lu à la source : l'agrégat mis en cache vient d'être invalidé et
  // ne refléterait pas encore le vote qui vient d'être inséré.
  const nombreVotes = await compterVotesPlage(slug).catch(() => 0)
  const res = NextResponse.json(
    {
      ok: true,
      nombreVotes,
      seuil: SEUIL_VOTES,
      seuilAtteint: nombreVotes >= SEUIL_VOTES,
      commentaireEnModeration: Boolean(commentaire?.trim()),
      photoEnModeration: photoUrl !== null,
    },
    { status: 201 },
  )

  poserCookieVotant(res, votant)

  return res
}

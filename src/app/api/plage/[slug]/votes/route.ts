// src/app/api/plage/[slug]/votes/route.ts
// Tout le communautaire d'une fiche : note, confirmations d'équipements par les
// visiteurs, commentaires modérés. Appelé par l'application mobile à l'ouverture
// d'une fiche — le reste (nom, équipements annoncés, GPS, photo) vient de
// l'asset embarqué dans l'APK et ne transite jamais par le réseau.
//
// Lecture seule. Un slug inconnu renvoie un agrégat vide plutôt qu'un 404 :
// l'app peut embarquer un asset plus récent que la base de votes, et une fiche
// jamais notée est un cas normal, pas une erreur.
import { SEUIL_VOTES } from '@/types'
import { getVotesPlage } from '@/lib/votes'
import { getPhotosPlage } from '@/lib/photos-communautaires'

const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return Response.json({ error: 'Slug invalide' }, { status: 400 })
  }

  // Une seule requête pour tout le communautaire d'une fiche : l'app mobile
  // ouvre un écran, pas trois connexions.
  const [{ stats, equipements, commentaires }, photos] = await Promise.all([
    getVotesPlage(slug),
    getPhotosPlage(slug),
  ])

  return Response.json(
    {
      seuil: SEUIL_VOTES,
      stats,
      // Triées par nombre de « j'aime » : la première sert d'illustration
      // principale à la plage côté application.
      photos: photos.map((p) => ({
        id: p.id,
        url: p.url,
        auteur: p.auteur,
        likes: p.likes,
        date: p.date,
      })),
      equipements: [...equipements.values()].map((e) => ({
        type: e.type,
        confirmations: e.confirmations,
        infirmations: e.infirmations,
      })),
      // `date` est un objet Date côté serveur : on le sérialise explicitement
      // en ISO 8601 pour que le client n'ait pas à deviner le format.
      commentaires: commentaires.map((c) => ({
        id: c.id,
        note: c.note,
        auteur: c.auteur ?? null,
        commentaire: c.commentaire,
        photoUrl: c.photoUrl ?? null,
        date: c.date.toISOString(),
      })),
    },
    { headers: { 'Cache-Control': CACHE_CONTROL } },
  )
}

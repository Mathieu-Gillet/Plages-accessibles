// src/app/api/stats/route.ts
// Agrégats communautaires de toutes les plages, en une requête.
//
// Existe pour l'application mobile : elle embarque les 268 fiches dans son APK
// (consultation hors réseau) et ne rappelle le serveur que pour ce qui bouge —
// les notes. Un seul appel au lancement suffit à décorer la liste, la carte et
// l'accueil, plutôt que 268 requêtes par slug.
//
// Lecture seule et sans donnée personnelle : le seuil de publication est déjà
// appliqué par `getStatsVotes()`, donc une moyenne sous SEUIL_VOTES sort d'ici
// à `null`, exactement comme sur le site.
import { SEUIL_VOTES } from '@/types'
import { getStatsVotes } from '@/lib/votes'

/** Aligné sur le cache des agrégats côté Supabase (`REVALIDATE_SECONDES`). */
const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600'

export async function GET() {
  const stats = await getStatsVotes()

  // Objet plat plutôt qu'un tableau : le client mobile en fait une Map par slug.
  const parSlug: Record<string, { nombreVotes: number; notePubliee: number | null }> = {}
  for (const [slug, s] of stats) {
    parSlug[slug] = { nombreVotes: s.nombreVotes, notePubliee: s.notePubliee }
  }

  return Response.json(
    { seuil: SEUIL_VOTES, stats: parSlug },
    { headers: { 'Cache-Control': CACHE_CONTROL } },
  )
}

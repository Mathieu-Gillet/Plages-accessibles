// src/lib/votes.ts
// Accès serveur aux votes communautaires (Supabase / PostgREST).
//
// Choix d'architecture : appels REST bruts avec la *service role key*, jamais
// exposée au navigateur. Conséquences volontaires :
//   · aucune dépendance npm supplémentaire (même style que src/lib/github.ts) ;
//   · aucune modification de la CSP (`connect-src`) puisque le navigateur ne
//     contacte jamais Supabase directement ;
//   · le site reste fonctionnel sans Supabase configuré : les lectures
//     dégradent en « aucun vote » et l'API de vote répond 503.
import 'server-only'
import type {
  Avis,
  ConfirmationEquipement,
  StatsVote,
  TypeAccessibilite,
} from '@/types'
import { TYPES_ACCESSIBILITE } from './content-schema'
import { STATS_VIDES, appliquerSeuil } from './votes-core'

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/+$/, '')
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const VOTE_SALT = process.env.VOTE_SALT

/** Durée de cache des agrégats. Un nouveau vote purge la balise immédiatement. */
const REVALIDATE_SECONDES = 300
export const TAG_VOTES = 'votes'

/** Plafond souple par IP et par plage — les réseaux partagés (familles, hôtels)
 *  doivent pouvoir voter plusieurs fois, les fermes à votes non. */
export const MAX_VOTES_PAR_IP = 3

export class VotesIndisponiblesError extends Error {
  constructor() {
    super('Supabase non configuré (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VOTE_SALT)')
  }
}

export class DejaVoteError extends Error {
  constructor() {
    super('Ce visiteur a déjà voté pour cette plage')
  }
}

export class SupabaseError extends Error {
  constructor(
    public step: string,
    public status: number,
  ) {
    super(`Supabase error at "${step}": HTTP ${status}`)
  }
}

/** True quand les trois variables requises sont présentes. */
export function votesConfigures(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_KEY && VOTE_SALT)
}

/** Sel de hachage. À n'appeler qu'après `votesConfigures()`. */
export function selDeVote(): string {
  if (!VOTE_SALT) throw new VotesIndisponiblesError()
  return VOTE_SALT
}

function entetes(): Record<string, string> {
  return {
    apikey: SERVICE_KEY as string,
    Authorization: `Bearer ${SERVICE_KEY}`,
  }
}

/**
 * Lecture d'une vue agrégée. Une base injoignable ne doit jamais casser le
 * rendu d'une page : on journalise et on dégrade en « aucun vote ». C'est le
 * comportement souhaité — le site garde sa valeur (fiches, équipements, carte)
 * même sans les notes.
 */
async function lire<T>(step: string, query: string): Promise<T[]> {
  if (!SUPABASE_URL || !SERVICE_KEY) return []
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
      headers: entetes(),
      next: { revalidate: REVALIDATE_SECONDES, tags: [TAG_VOTES] },
    })
    if (!res.ok) {
      console.error(`[votes] ${step}: HTTP ${res.status}`)
      return []
    }
    return (await res.json()) as T[]
  } catch (err) {
    console.error(`[votes] ${step}:`, err)
    return []
  }
}

// ─── Lectures ───────────────────────────────────────────────────────────────
// Chacune récupère la vue entière en une requête plutôt qu'une requête par
// plage : les tables sont petites (≈ 1 ligne par plage votée) et le Data Cache
// de Next déduplique l'appel entre les 268 pages statiques d'un même build.

export async function getStatsVotes(): Promise<Map<string, StatsVote>> {
  const rows = await lire<{
    plage_slug: string
    nombre_votes: number
    note_moyenne: number | null
  }>('plage_stats', 'plage_stats?select=plage_slug,nombre_votes,note_moyenne')

  return new Map(
    rows.map((r) => [r.plage_slug, appliquerSeuil(r.nombre_votes, r.note_moyenne)]),
  )
}

export async function getStatsPlage(slug: string): Promise<StatsVote> {
  return (await getStatsVotes()).get(slug) ?? STATS_VIDES
}

export async function getConfirmationsEquipements(): Promise<
  Map<string, ConfirmationEquipement[]>
> {
  const rows = await lire<{
    plage_slug: string
    equipement: string
    confirmations: number
    infirmations: number
  }>(
    'plage_equipements',
    'plage_equipements?select=plage_slug,equipement,confirmations,infirmations',
  )

  const parPlage = new Map<string, ConfirmationEquipement[]>()
  for (const r of rows) {
    // Un équipement retiré du référentiel depuis le vote est ignoré.
    if (!TYPES_ACCESSIBILITE.includes(r.equipement as TypeAccessibilite)) continue
    const liste = parPlage.get(r.plage_slug) ?? []
    liste.push({
      type: r.equipement as TypeAccessibilite,
      confirmations: r.confirmations,
      infirmations: r.infirmations,
    })
    parPlage.set(r.plage_slug, liste)
  }
  return parPlage
}

/** Commentaires modérés (`statut = 'publie'`), les plus récents d'abord. */
export async function getCommentairesPublies(): Promise<Map<string, Avis[]>> {
  const rows = await lire<{
    id: string
    plage_slug: string
    note: number
    auteur: string | null
    commentaire: string | null
    created_at: string
  }>(
    'commentaires',
    'votes?select=id,plage_slug,note,auteur,commentaire,created_at' +
      '&statut=eq.publie&commentaire=not.is.null&order=created_at.desc',
  )

  const parPlage = new Map<string, Avis[]>()
  for (const r of rows) {
    if (!r.commentaire) continue
    const liste = parPlage.get(r.plage_slug) ?? []
    liste.push({
      id: r.id,
      note: r.note,
      auteur: r.auteur,
      commentaire: r.commentaire,
      date: new Date(r.created_at),
    })
    parPlage.set(r.plage_slug, liste)
  }
  return parPlage
}

export interface VotesPlage {
  stats: StatsVote
  /** Décompte par équipement déclaré ; absent de la map = aucun retour visiteur. */
  equipements: Map<TypeAccessibilite, ConfirmationEquipement>
  commentaires: Avis[]
}

/** Tout ce qu'il faut pour rendre une fiche plage, en 3 requêtes mutualisées. */
export async function getVotesPlage(slug: string): Promise<VotesPlage> {
  const [stats, equipements, commentaires] = await Promise.all([
    getStatsPlage(slug),
    getConfirmationsEquipements(),
    getCommentairesPublies(),
  ])

  return {
    stats,
    equipements: new Map(
      (equipements.get(slug) ?? []).map((e) => [e.type, e]),
    ),
    commentaires: commentaires.get(slug) ?? [],
  }
}

// ─── Écriture ───────────────────────────────────────────────────────────────
// Contrairement aux lectures, un échec doit remonter : le visiteur doit savoir
// que son vote n'a pas été pris en compte.

export interface NouveauVote {
  slug: string
  note: number
  equipementsVus: TypeAccessibilite[]
  equipementsAbsents: TypeAccessibilite[]
  auteur?: string
  commentaire?: string
  votantHash: string
  ipHash: string
}

/**
 * Requête d'écriture / de comptage, jamais mise en cache. Une base injoignable
 * est traduite en SupabaseError(status 0) pour que l'appelant réponde 502
 * plutôt que de laisser filer une erreur réseau brute en 500.
 */
async function ecrire(
  step: string,
  chemin: string,
  init: { method: string; headers?: Record<string, string>; body?: string },
): Promise<Response> {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new VotesIndisponiblesError()
  try {
    return await fetch(`${SUPABASE_URL}/rest/v1/${chemin}`, {
      method: init.method,
      headers: { ...entetes(), ...init.headers },
      body: init.body,
      cache: 'no-store',
    })
  } catch (err) {
    console.error(`[votes] ${step}:`, err)
    throw new SupabaseError(step, 0)
  }
}

/**
 * Comptage exact et non mis en cache. Sert les contrôles anti-abus et le retour
 * immédiat au votant, qui doivent voir l'état réel de la base — pas l'agrégat
 * en cache, potentiellement antérieur au vote qui vient d'être inséré.
 */
async function compter(step: string, filtres: string): Promise<number> {
  const res = await ecrire(step, `votes?select=id&${filtres}`, {
    method: 'HEAD',
    headers: { Prefer: 'count=exact' },
  })
  if (!res.ok) throw new SupabaseError(step, res.status)
  // PostgREST renvoie le total dans Content-Range, forme « */12 ».
  return Number(res.headers.get('content-range')?.split('/')[1]) || 0
}

/** Nombre de votes déjà déposés depuis cette IP sur cette plage. */
export function compterVotesIp(slug: string, ipHash: string): Promise<number> {
  return compter(
    'compter votes IP',
    `plage_slug=eq.${encodeURIComponent(slug)}&ip_hash=eq.${encodeURIComponent(ipHash)}`,
  )
}

/** Nombre total de votes sur une plage, lu à la source. */
export function compterVotesPlage(slug: string): Promise<number> {
  return compter('compter votes plage', `plage_slug=eq.${encodeURIComponent(slug)}`)
}

/** Insère le vote. Lève DejaVoteError si l'index d'unicité (plage, votant) saute. */
export async function enregistrerVote(vote: NouveauVote): Promise<void> {
  const res = await ecrire('enregistrer vote', 'votes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      plage_slug: vote.slug,
      note: vote.note,
      equipements_vus: vote.equipementsVus,
      equipements_absents: vote.equipementsAbsents,
      auteur: vote.auteur ?? null,
      commentaire: vote.commentaire ?? null,
      votant_hash: vote.votantHash,
      ip_hash: vote.ipHash,
    }),
  })
  if (res.status === 409) throw new DejaVoteError() // violation de votes_plage_votant_uniq
  if (!res.ok) throw new SupabaseError('enregistrer vote', res.status)
}

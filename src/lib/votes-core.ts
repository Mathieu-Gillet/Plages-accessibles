// src/lib/votes-core.ts
// Logique pure du système de vote communautaire : application du seuil de
// publication, empreintes anonymes, normalisation de la saisie d'équipements.
// Séparée de votes.ts (server-only) pour rester testable hors serveur Next.
//
// Les constantes partagées avec les composants client (SEUIL_VOTES,
// STATUTS_EQUIPEMENT) vivent dans @/types : ce module dépend de node:crypto et
// n'est donc pas destiné au bundle navigateur.
import { createHash } from 'node:crypto'
import { TYPES_ACCESSIBILITE } from './content-schema'
import { SEUIL_VOTES, type StatsVote, type TypeAccessibilite } from '@/types'

export const STATS_VIDES: StatsVote = { nombreVotes: 0, notePubliee: null }

/**
 * Applique le seuil à un agrégat brut. Le nombre de votes reste exposé même
 * sous le seuil, pour afficher la progression (« 3 votes sur 5 requis »).
 */
export function appliquerSeuil(nombreVotes: number, moyenne: number | null): StatsVote {
  const atteint = nombreVotes >= SEUIL_VOTES && moyenne !== null
  return {
    nombreVotes,
    notePubliee: atteint ? moyenne : null,
  }
}

/**
 * Empreinte anonyme et stable d'un votant (cookie) ou d'une IP.
 * Le sel rend l'empreinte non réversible par force brute sur l'espace des IPv4,
 * ce qui permet de dédupliquer les votes sans jamais stocker de donnée
 * personnelle en clair.
 */
export function hashEmpreinte(sel: string, valeur: string): string {
  return createHash('sha256').update(`${sel}:${valeur}`).digest('hex')
}

/**
 * Convertit la saisie du formulaire en deux listes exploitables.
 *
 * `declares` est la liste d'équipements de la fiche, lue côté serveur : elle
 * borne ce qu'un client peut confirmer ou infirmer. Sans cette borne, un bot
 * pourrait injecter des confirmations sur des équipements jamais annoncés.
 * Les types hors référentiel et le statut « inconnu » sont ignorés.
 */
export function normaliserEquipements(
  saisie: Record<string, unknown>,
  declares: readonly TypeAccessibilite[],
): { vus: TypeAccessibilite[]; absents: TypeAccessibilite[] } {
  const autorises = new Set<string>(
    declares.filter((t) => TYPES_ACCESSIBILITE.includes(t)),
  )
  const vus: TypeAccessibilite[] = []
  const absents: TypeAccessibilite[] = []

  for (const [type, statut] of Object.entries(saisie)) {
    if (!autorises.has(type)) continue
    if (statut === 'vu') vus.push(type as TypeAccessibilite)
    else if (statut === 'absent') absents.push(type as TypeAccessibilite)
  }

  return { vus: vus.sort(), absents: absents.sort() }
}

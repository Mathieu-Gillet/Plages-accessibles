// src/components/features/NoteCommunautaire.tsx
// Affichage de la note communautaire, dans ses deux états :
//   · seuil atteint  → la moyenne est publiée ;
//   · seuil non atteint → on montre la progression, jamais la moyenne.
// Aucun composant du site n'a le droit d'afficher une note autrement que par
// ces deux composants, ce qui garantit que le seuil est respecté partout.
import { Star } from 'lucide-react'
import { formatNote } from '@/lib/utils'
import { SEUIL_VOTES, type StatsVote } from '@/types'
import { InfobulleNote } from './InfobulleNote'

function libelleVotes(n: number): string {
  return `${n} vote${n > 1 ? 's' : ''}`
}

/** Bloc principal, en-tête de fiche plage. */
export function BlocNote({ stats }: { stats: StatsVote }) {
  if (stats.notePubliee !== null) {
    return (
      <div
        className="flex flex-col items-center bg-ocean text-white px-5 py-3 rounded-xl relative"
        aria-label={`Note des visiteurs : ${formatNote(stats.notePubliee)} sur 5, moyenne de ${libelleVotes(stats.nombreVotes)}`}
      >
        <span className="text-3xl font-extrabold">{formatNote(stats.notePubliee)}</span>
        <span className="text-xs opacity-90 mt-1 flex items-center gap-1">
          sur 5 · {libelleVotes(stats.nombreVotes)}
          <InfobulleNote />
        </span>
      </div>
    )
  }

  const restants = SEUIL_VOTES - stats.nombreVotes
  return (
    <div
      className="flex flex-col items-center bg-sable border border-sable-fonce text-ardoise px-5 py-3 rounded-xl"
      aria-label={`Note en attente : ${libelleVotes(stats.nombreVotes)} sur ${SEUIL_VOTES} requis`}
    >
      <span className="text-sm font-bold">Note en attente</span>
      <span className="text-xs text-ardoise-clair mt-1">
        {stats.nombreVotes} / {SEUIL_VOTES} votes
      </span>
      <span className="text-xs text-ardoise-clair">
        {restants === 1 ? 'encore 1 avis' : `encore ${restants} avis`}
      </span>
    </div>
  )
}

/**
 * Pastille compacte, sur les cartes de résultats et la carte d'accueil.
 * À 0 vote, rien n'est affiché : 268 pastilles « à noter » n'apporteraient
 * aucune information et alourdiraient la grille.
 */
export function BadgeNote({ stats }: { stats: StatsVote }) {
  if (stats.notePubliee !== null) {
    return (
      <div
        className="bg-ocean text-white text-sm font-bold px-2 py-1 rounded-lg flex items-center gap-1.5"
        aria-label={`Note des visiteurs : ${formatNote(stats.notePubliee)} sur 5, moyenne de ${libelleVotes(stats.nombreVotes)}`}
      >
        <Star size={13} fill="currentColor" aria-hidden="true" />
        {formatNote(stats.notePubliee)}
        <InfobulleNote />
      </div>
    )
  }

  if (stats.nombreVotes === 0) return null

  return (
    <div
      className="bg-ardoise text-white text-xs font-bold px-2 py-1 rounded-lg"
      aria-label={`Note en attente : ${libelleVotes(stats.nombreVotes)} sur ${SEUIL_VOTES} requis`}
    >
      {stats.nombreVotes} / {SEUIL_VOTES} votes
    </div>
  )
}

/** Phrase d'appel à la participation, sous le formulaire ou en tête de section. */
export function ProgressionVotes({ stats }: { stats: StatsVote }) {
  if (stats.notePubliee !== null) {
    return (
      <p className="text-sm text-ardoise-clair">
        Note moyenne publiée à partir de {libelleVotes(stats.nombreVotes)}.
        Chaque nouveau vote l&apos;affine.
      </p>
    )
  }

  const restants = SEUIL_VOTES - stats.nombreVotes
  return (
    <p className="text-sm text-ardoise-clair">
      {stats.nombreVotes === 0
        ? `Aucun vote pour l'instant. ${SEUIL_VOTES} votes suffisent pour publier une note moyenne sur cette plage.`
        : `${libelleVotes(stats.nombreVotes)} enregistré${stats.nombreVotes > 1 ? 's' : ''} : encore ${restants} pour que la note moyenne devienne visible de tous, y compris sur la carte.`}
    </p>
  )
}

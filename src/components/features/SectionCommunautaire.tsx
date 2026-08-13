// src/components/features/SectionCommunautaire.tsx
// Bloc « retours des visiteurs » d'une fiche plage : commentaires modérés puis
// formulaire de vote. Remplace AvisSection.
import type { Avis, StatsVote, TypeAccessibilite } from '@/types'
import { ProgressionVotes } from './NoteCommunautaire'
import { VoteForm } from './VoteForm'

interface Props {
  slug: string
  equipements: TypeAccessibilite[]
  commentaires: Avis[]
  stats: StatsVote
}

export function SectionCommunautaire({ slug, equipements, commentaires, stats }: Props) {
  return (
    <section aria-labelledby="titre-communaute" className="mt-12">
      <h2 id="titre-communaute" className="text-2xl font-bold text-ardoise mb-2">
        💬 Retours des visiteurs
      </h2>
      <div className="mb-6">
        <ProgressionVotes stats={stats} />
      </div>

      {commentaires.length > 0 && (
        <ul className="space-y-4 mb-8" role="list">
          {commentaires.map((a) => (
            <li key={a.id} className="bg-white rounded-xl p-4 border border-sable-fonce">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-ardoise">{a.auteur ?? 'Anonyme'}</span>
                <span
                  className="text-amber-700 font-bold text-sm"
                  aria-label={`Note : ${a.note} sur 5`}
                >
                  <span aria-hidden="true">
                    {'★'.repeat(a.note)}
                    {'☆'.repeat(5 - a.note)}
                  </span>
                </span>
              </div>
              <p className="text-ardoise-clair text-sm">{a.commentaire}</p>
              <p className="text-xs text-ardoise-clair mt-2">
                {a.date.toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="bg-sable rounded-2xl p-6 border border-sable-fonce">
        <h3 className="font-bold text-ardoise text-lg mb-2">Notez cette plage</h3>
        <p className="text-ardoise-clair text-sm mb-5">
          Vous y êtes allé ? Notez l&apos;accessibilité et dites-nous quels
          équipements annoncés étaient réellement présents. C&apos;est ce qui
          rend cet annuaire fiable.
        </p>
        <VoteForm slug={slug} equipements={equipements} />
      </div>
    </section>
  )
}

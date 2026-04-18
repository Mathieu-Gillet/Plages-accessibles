// src/components/features/AvisSection.tsx
import type { Avis } from '@/types'

const REPO_ISSUES_URL = 'https://github.com/Mathieu-Gillet/Plages/issues/new?labels=avis&template=avis.md&title=Retour+sur+une+plage'

interface AvisSectionProps {
  avis: Avis[]
}

export function AvisSection({ avis }: AvisSectionProps) {
  return (
    <section aria-labelledby="titre-avis" className="mt-12">
      <h2 id="titre-avis" className="text-2xl font-bold text-ardoise mb-6">
        💬 Avis ({avis.length})
      </h2>

      {/* Liste des avis */}
      {avis.length > 0 ? (
        <ul className="space-y-4 mb-8" role="list">
          {avis.map((a) => (
            <li key={a.id} className="bg-white rounded-xl p-4 border border-sable-fonce">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-ardoise">{a.auteur ?? 'Anonyme'}</span>
                <span
                  className="text-yellow-500 font-bold text-sm"
                  aria-label={`Note : ${a.note} sur 5`}
                >
                  {'★'.repeat(a.note)}{'☆'.repeat(5 - a.note)}
                </span>
              </div>
              {a.commentaire && (
                <p className="text-ardoise-clair text-sm">{a.commentaire}</p>
              )}
              <p className="text-xs text-ardoise-clair mt-2">
                {new Date(a.date).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ardoise-clair mb-8">Aucun avis pour l&apos;instant.</p>
      )}

      {/* Invitation à contribuer (remplace le formulaire) */}
      <div className="bg-sable rounded-2xl p-6 border border-sable-fonce">
        <h3 className="font-bold text-ardoise text-lg mb-2">Partagez votre expérience</h3>
        <p className="text-ardoise-clair text-sm mb-4">
          Vous avez visité cette plage ? Votre retour nous aide à fiabiliser les
          informations d&apos;accessibilité pour les autres visiteurs.
        </p>
        <a
          href={REPO_ISSUES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-ocean text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-ocean-clair transition-colors"
          aria-label="Envoyer un retour sur cette plage (nouvel onglet)"
        >
          Envoyer un retour ↗
        </a>
      </div>
    </section>
  )
}

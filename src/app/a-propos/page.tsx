// src/app/a-propos/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'À propos',
  description: 'En savoir plus sur le projet Plages Accessibles et comment contribuer.',
}

export default function PageAPropos() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-14">
      <h1 className="text-4xl font-extrabold text-ardoise mb-6">À propos du projet</h1>

      <section className="prose prose-lg text-ardoise-clair space-y-6">
        <p className="text-lg leading-relaxed">
          <strong className="text-ardoise">Plages Accessibles</strong> est un annuaire collaboratif
          et gratuit qui recense les plages françaises équipées pour accueillir les personnes
          en situation de handicap moteur, visuel ou auditif.
        </p>

        <h2 className="text-2xl font-bold text-ardoise mt-8">Pourquoi ce projet ?</h2>
        <p className="leading-relaxed">
          En France, plus de 12 millions de personnes vivent avec un handicap. Trouver une plage
          réellement accessible — avec fauteuil amphibie, sanitaires adaptés, chemin d&apos;accès
          praticable — reste un vrai parcours du combattant. Ce site centralise l&apos;information
          pour que la mer soit accessible à tous.
        </p>

        <h2 className="text-2xl font-bold text-ardoise mt-8">Les équipements référencés</h2>
        <ul className="space-y-2">
          {[
            ['♿', 'Fauteuil roulant', "Accès en dur jusqu'à la plage"],
            ['🪑', 'Tiralo', 'Fauteuil amphibie permettant d\'entrer dans l\'eau'],
            ['🐬', 'Hippocampe', 'Fauteuil nautique pour nager en mer'],
            ['🏄', 'Handisurf', 'Surf et activités nautiques adaptées'],
            ['🅿️', 'Parking PMR', 'Places réservées à proximité immédiate'],
            ['🚻', 'Sanitaires adaptés', 'WC et vestiaires accessibles'],
            ['🛤️', "Chemin d'accès", 'Tapis, caillebotis ou revêtement dur'],
          ].map(([icone, nom, desc]) => (
            <li key={nom} className="flex gap-3">
              <span className="text-xl" aria-hidden="true">{icone}</span>
              <span><strong>{nom}</strong> — {desc}</span>
            </li>
          ))}
        </ul>

        <h2 className="text-2xl font-bold text-ardoise mt-8">Comment contribuer ?</h2>
        <p className="leading-relaxed">
          Ce projet est collaboratif et open source. Vous pouvez contribuer en :
        </p>
        <ul className="space-y-2 list-disc list-inside">
          <li>Signalant une plage accessible non référencée</li>
          <li>Mettant à jour les informations d&apos;une plage existante</li>
          <li>Laissant un avis sur une plage que vous avez visitée</li>
          <li>Participant au développement sur GitHub</li>
        </ul>

        <div className="flex gap-4 pt-6">
          <Link
            href="/contribuer"
            className="bg-ocean text-white px-6 py-3 rounded-xl font-bold hover:bg-ocean-clair transition-colors"
          >
            Contribuer
          </Link>
          <Link
            href="/recherche"
            className="border-2 border-ocean text-ocean px-6 py-3 rounded-xl font-bold hover:bg-ocean-pale transition-colors"
          >
            Rechercher une plage
          </Link>
        </div>
      </section>
    </div>
  )
}

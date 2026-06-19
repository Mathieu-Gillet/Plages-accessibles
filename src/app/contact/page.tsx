// src/app/contact/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Nous contacter',
  description: 'Contactez l’équipe de Plages Accessibles : signaler une erreur, proposer une plage ou poser une question.',
}

export default function PageContact() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-14">
      <h1 className="text-3xl font-extrabold text-ardoise mb-4">Nous contacter</h1>
      <p className="text-ardoise-clair leading-relaxed mb-10">
        Plages Accessibles est un projet collaboratif : la meilleure façon de nous joindre
        dépend de votre besoin.
      </p>

      <div className="space-y-6">
        <section className="bg-white rounded-2xl border border-sable-fonce p-6">
          <h2 className="text-lg font-bold text-ardoise mb-2">🏖️ Proposer une nouvelle plage</h2>
          <p className="text-ardoise-clair text-sm mb-4">
            Utilisez le formulaire dédié : votre proposition sera vérifiée puis publiée.
          </p>
          <Link
            href="/contribuer"
            className="inline-block bg-ocean text-white font-bold py-2 px-5 rounded-xl hover:bg-ocean-fonce transition-colors text-sm"
          >
            Suggérer une plage
          </Link>
        </section>

        <section className="bg-white rounded-2xl border border-sable-fonce p-6">
          <h2 className="text-lg font-bold text-ardoise mb-2">✏️ Signaler une erreur ou poser une question</h2>
          <p className="text-ardoise-clair text-sm mb-4">
            Équipement disparu, coordonnées inexactes, problème d&apos;accessibilité du site…
            Ouvrez un ticket sur GitHub (un compte gratuit suffit), il sera traité publiquement.
          </p>
          <a
            href="https://github.com/Mathieu-Gillet/Plages-accessibles/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block border-2 border-ocean text-ocean font-bold py-2 px-5 rounded-xl hover:bg-ocean-pale transition-colors text-sm"
          >
            Ouvrir un ticket GitHub ↗
          </a>
        </section>

        <section className="bg-white rounded-2xl border border-sable-fonce p-6">
          <h2 className="text-lg font-bold text-ardoise mb-2">⭐ Donner votre avis sur une plage</h2>
          <p className="text-ardoise-clair text-sm">
            Chaque page de plage dispose d&apos;un formulaire d&apos;avis en bas de page —
            votre retour aide à fiabiliser les informations pour les autres visiteurs.{' '}
            <Link href="/recherche" className="text-ocean hover:underline">
              Trouver une plage
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}

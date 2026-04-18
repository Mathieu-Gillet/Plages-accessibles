// src/app/contribuer/page.tsx
import Link from 'next/link'
import { LABELS_ACCESSIBILITE } from '@/types'

const REPO_NEW_PLAGE_URL =
  'https://github.com/Mathieu-Gillet/Plages/issues/new?labels=nouvelle-plage&template=nouvelle-plage.md&title=Nouvelle+plage+:+'

export const metadata = {
  title: 'Suggérer une plage accessible',
  description:
    'Proposez une nouvelle plage accessible aux personnes en situation de handicap. Toutes les contributions sont publiques et révisées.',
}

export default function PageContribuer() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-ardoise mb-2">
        Suggérer une plage
      </h1>
      <p className="text-ardoise-clair mb-8">
        Vous connaissez une plage accessible non référencée ? Aidez-nous à
        l&apos;ajouter au catalogue.
      </p>

      <section className="bg-white rounded-2xl border border-sable-fonce p-6 mb-6">
        <h2 className="font-bold text-ardoise text-lg mb-3">Comment ça marche</h2>
        <p className="text-ardoise-clair text-sm mb-4">
          Les contributions passent par le dépôt GitHub du projet. Cela garantit
          que chaque ajout est <strong>traçable, public et révisable</strong> par la
          communauté — ce qui est essentiel pour la fiabilité des informations
          d&apos;accessibilité.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-ardoise-clair mb-6">
          <li>
            Cliquez sur le bouton ci-dessous pour ouvrir un formulaire
            pré-rempli sur GitHub (création d&apos;un compte gratuit nécessaire).
          </li>
          <li>Renseignez les informations de la plage et les équipements.</li>
          <li>Validez : un contributeur du projet vérifiera et publiera.</li>
        </ol>
        <a
          href={REPO_NEW_PLAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-ocean text-white font-bold py-3 px-6 rounded-xl hover:bg-ocean-clair transition-colors"
          aria-label="Suggérer une plage sur GitHub (nouvel onglet)"
        >
          Suggérer une plage sur GitHub ↗
        </a>
      </section>

      <section className="bg-sable rounded-2xl border border-sable-fonce p-6">
        <h2 className="font-bold text-ardoise text-lg mb-3">
          Informations à préparer
        </h2>
        <ul className="text-sm text-ardoise-clair space-y-1 list-disc list-inside mb-4">
          <li>Nom officiel de la plage</li>
          <li>Commune, département, région, code postal</li>
          <li>Coordonnées GPS (latitude / longitude)</li>
          <li>Description courte (équipements, ambiance)</li>
          <li>Liste des équipements d&apos;accessibilité présents</li>
          <li>Source ou date de votre dernière visite (pour la traçabilité)</li>
        </ul>

        <details className="mt-4">
          <summary className="cursor-pointer font-semibold text-ardoise text-sm">
            Voir la liste des équipements possibles
          </summary>
          <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-ardoise-clair">
            {Object.values(LABELS_ACCESSIBILITE).map((label) => (
              <li key={label}>· {label}</li>
            ))}
          </ul>
        </details>
      </section>

      <p className="mt-8 text-center text-sm text-ardoise-clair">
        <Link href="/" className="text-ocean hover:underline">
          ← Retour à l&apos;accueil
        </Link>
      </p>
    </div>
  )
}

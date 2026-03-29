// src/app/accessibilite/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Déclaration d'accessibilité",
}

export default function PageAccessibilite() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-14">
      <h1 className="text-3xl font-extrabold text-ardoise mb-8">
        Déclaration d&apos;accessibilité
      </h1>

      <div className="space-y-8 text-ardoise-clair leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-ardoise mb-3">État de conformité</h2>
          <p>
            Le site <strong>Plages Accessibles</strong> est en cours de mise en conformité avec
            le référentiel général d&apos;amélioration de l&apos;accessibilité (RGAA), version 4.1.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ardoise mb-3">Technologies utilisées</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>HTML5 sémantique</li>
            <li>CSS3 avec Tailwind</li>
            <li>JavaScript / React</li>
            <li>Attributs ARIA pour les composants interactifs</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ardoise mb-3">Mesures prises</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Skip link visible au focus clavier en haut de chaque page</li>
            <li>Focus visible sur tous les éléments interactifs (outline 3px)</li>
            <li>ARIA labels sur les cartes, boutons et formulaires</li>
            <li>Structure de headings hiérarchique (h1 → h2 → h3)</li>
            <li>Textes alternatifs sur toutes les images informatives</li>
            <li>Police minimum 16px, redimensionnable jusqu&apos;à 200%</li>
            <li>Contraste minimum 4.5:1 sur les textes</li>
            <li>Attribut <code>lang="fr"</code> sur le document</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ardoise mb-3">Limitations connues</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>
              La carte interactive (Leaflet / OpenStreetMap) n&apos;est pas entièrement accessible
              au clavier. Une liste textuelle de toutes les plages est disponible via la
              page Recherche.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ardoise mb-3">Signaler un problème</h2>
          <p>
            Si vous rencontrez un problème d&apos;accessibilité sur ce site, contactez-nous :
          </p>
          <p className="mt-2">
            <a
              href="mailto:accessibilite@plages-accessibles.fr"
              className="text-ocean font-semibold hover:underline"
            >
              accessibilite@plages-accessibles.fr
            </a>
          </p>
        </section>
      </div>
    </div>
  )
}

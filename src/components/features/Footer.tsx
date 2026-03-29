// src/components/features/Footer.tsx
import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-ardoise text-white py-10 px-4 mt-12">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h2 className="font-bold text-lg mb-3">🌊 Plages Accessibles</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            Un annuaire collaboratif des plages françaises accessibles aux
            personnes en situation de handicap.
          </p>
        </div>

        <nav aria-label="Liens utiles">
          <h3 className="font-bold mb-3">Liens utiles</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><Link href="/recherche" className="hover:text-white transition-colors">Rechercher une plage</Link></li>
            <li><Link href="/contribuer" className="hover:text-white transition-colors">Ajouter une plage</Link></li>
            <li><Link href="/a-propos" className="hover:text-white transition-colors">À propos du projet</Link></li>
            <li>
              <a href="https://www.handiplage.fr" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                Label Handiplage ↗
              </a>
            </li>
          </ul>
        </nav>

        <div>
          <h3 className="font-bold mb-3">Accessibilité</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><Link href="/accessibilite" className="hover:text-white transition-colors">Déclaration d&apos;accessibilité</Link></li>
            <li><Link href="/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link></li>
            <li><Link href="/contact" className="hover:text-white transition-colors">Nous contacter</Link></li>
          </ul>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-gray-700 text-center text-xs text-gray-500">
        <p>
          Fait avec ❤️ pour rendre la mer accessible à tous ·{' '}
          <a
            href="https://github.com/votre-orga/plages-accessibles"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white"
          >
            Contribuer sur GitHub ↗
          </a>
        </p>
      </div>
    </footer>
  )
}

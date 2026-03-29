// src/app/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <p className="text-7xl mb-6" aria-hidden="true">🌊</p>
      <h1 className="text-4xl font-extrabold text-ardoise mb-3">Page introuvable</h1>
      <p className="text-ardoise-clair text-lg mb-8 max-w-md">
        Cette page semble avoir été emportée par la marée. Revenez à l&apos;accueil pour trouver votre plage.
      </p>
      <div className="flex gap-4">
        <Link
          href="/"
          className="bg-ocean text-white px-6 py-3 rounded-xl font-bold hover:bg-ocean-clair transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
        <Link
          href="/recherche"
          className="border-2 border-ocean text-ocean px-6 py-3 rounded-xl font-bold hover:bg-ocean-pale transition-colors"
        >
          Rechercher une plage
        </Link>
      </div>
    </div>
  )
}

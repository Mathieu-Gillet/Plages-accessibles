// src/app/page.tsx
import { Suspense } from 'react'
import { getAllPlagesResume, getStats } from '@/lib/content'
import { CarteAccueil } from '@/components/features/CarteAccueil'
import { RechercheRapide } from '@/components/features/RechercheRapide'
import { StatsBandeau } from '@/components/features/StatsBandeau'
import { PlageCardResume } from '@/components/features/PlageCard'

export default function PageAccueil() {
  const plages = getAllPlagesResume() // already sorted by note desc in the loader
  const stats = getStats()

  return (
    <>
      {/* Hero */}
      <section className="vague-bg py-16 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold text-ardoise mb-4 leading-tight">
            La mer accessible{' '}
            <span className="text-ocean">à tous</span> 🌊
          </h1>
          <p className="text-lg text-ardoise-clair mb-8 max-w-xl mx-auto">
            Trouvez les plages françaises équipées pour les personnes en
            situation de handicap, avec tous les équipements disponibles sur place.
          </p>
          <RechercheRapide />
        </div>
      </section>

      {/* Stats */}
      <StatsBandeau totalPlages={stats.totalPlages} totalRegions={stats.totalRegions} />

      {/* Carte interactive */}
      <section className="py-12 px-4 bg-white" aria-labelledby="titre-carte">
        <div className="max-w-6xl mx-auto">
          <h2 id="titre-carte" className="text-2xl font-bold text-ardoise mb-6">
            Carte des plages accessibles
          </h2>
          <Suspense fallback={<div className="h-96 bg-ocean-pale rounded-xl animate-pulse" role="status" aria-label="Chargement de la carte" />}>
            <CarteAccueil plages={plages} />
          </Suspense>
        </div>
      </section>

      {/* Top plages */}
      <section className="py-12 px-4 bg-sable" aria-labelledby="titre-top">
        <div className="max-w-6xl mx-auto">
          <h2 id="titre-top" className="text-2xl font-bold text-ardoise mb-6">
            Les mieux notées 🏆
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {plages.slice(0, 6).map((plage) => (
              <PlageCardResume key={plage.id} plage={plage} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

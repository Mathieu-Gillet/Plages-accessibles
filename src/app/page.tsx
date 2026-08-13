// src/app/page.tsx
import { Suspense } from 'react'
import { getAllPlagesResume, getStats } from '@/lib/content'
import { getStatsVotes } from '@/lib/votes'
import {
  MAX_PLAGES_PAR_REGION,
  attacherStats,
  classerPlages,
  selectionnerPlagesCarte,
} from '@/lib/carte-accueil'
import { CarteAccueil } from '@/components/features/CarteAccueil'
import { RechercheRapide } from '@/components/features/RechercheRapide'
import { StatsBandeau } from '@/components/features/StatsBandeau'
import { PlageCardResume } from '@/components/features/PlageCard'

// Les notes viennent des votes, qui changent en continu : la page est
// régénérée périodiquement (et immédiatement après un vote, via revalidateTag).
export const revalidate = 300

export default async function PageAccueil() {
  const plages = getAllPlagesResume()
  const stats = getStats()
  const statsVotes = await getStatsVotes()

  const plagesCarte = selectionnerPlagesCarte(plages, statsVotes)
  const misesEnAvant = classerPlages(attacherStats(plages, statsVotes)).slice(0, 6)

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
          <Suspense
            fallback={
              <div
                className="h-96 bg-ocean-pale rounded-xl animate-pulse"
                role="status"
                aria-label="Chargement de la carte"
              />
            }
          >
            <CarteAccueil
              plages={plagesCarte}
              maxParRegion={MAX_PLAGES_PAR_REGION}
              totalCatalogue={stats.totalPlages}
            />
          </Suspense>
        </div>
      </section>

      {/* Mises en avant */}
      <section className="py-12 px-4 bg-sable" aria-labelledby="titre-top">
        <div className="max-w-6xl mx-auto">
          <h2 id="titre-top" className="text-2xl font-bold text-ardoise mb-2">
            À découvrir 🏖️
          </h2>
          <p className="text-ardoise-clair mb-6">
            Les plages notées par les visiteurs d&apos;abord, puis les mieux
            équipées d&apos;après les données officielles.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {misesEnAvant.map((plage) => (
              <PlageCardResume key={plage.id} plage={plage} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

// src/app/recherche/page.tsx
import { Suspense } from 'react'
import {
  searchPlages,
  getRegions,
  getDepartements,
} from '@/lib/content'
import { FiltresRecherche } from '@/components/features/FiltresRecherche'
import { ListePlages } from '@/components/features/ListePlages'

interface SearchParams {
  region?: string
  departement?: string
  q?: string
  page?: string
  [key: string]: string | undefined
}

export function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  const titre = searchParams.region
    ? `Plages accessibles en ${searchParams.region}`
    : searchParams.departement
    ? `Plages accessibles dans le ${searchParams.departement}`
    : 'Rechercher une plage accessible'

  return { title: titre }
}

const PAGE_SIZE = 12

export default function PageRecherche({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1)

  const { plages, total } = searchPlages({
    region: searchParams.region,
    departement: searchParams.departement,
    q: searchParams.q,
    page,
    pageSize: PAGE_SIZE,
  })
  const regions = getRegions()
  const departements = getDepartements(searchParams.region)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-extrabold text-ardoise mb-8">
        Rechercher une plage accessible
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filtres */}
        <aside className="lg:col-span-1" aria-label="Filtres de recherche">
          <FiltresRecherche
            regions={regions}
            departements={departements}
            searchParams={searchParams}
          />
        </aside>

        {/* Résultats */}
        <div className="lg:col-span-3">
          <p className="text-ardoise-clair mb-4" role="status" aria-live="polite">
            {total === 0
              ? 'Aucune plage trouvée'
              : `${total} plage${total > 1 ? 's' : ''} trouvée${total > 1 ? 's' : ''}`}
          </p>

          <Suspense fallback={<div className="animate-pulse h-64 bg-ocean-pale rounded-xl" />}>
            <ListePlages plages={plages} page={page} totalPages={totalPages} searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

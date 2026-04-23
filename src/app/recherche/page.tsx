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
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const titre = sp.region
    ? `Plages accessibles en ${sp.region}`
    : sp.departement
    ? `Plages accessibles dans le ${sp.departement}`
    : 'Rechercher une plage accessible'

  return { title: titre }
}

const PAGE_SIZE = 12

export default async function PageRecherche({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const page = Math.max(1, Math.min(500, parseInt(sp.page ?? '1', 10) || 1))

  const { plages, total } = searchPlages({
    region: sp.region,
    departement: sp.departement,
    q: sp.q,
    page,
    pageSize: PAGE_SIZE,
  })
  const regions = getRegions()
  const departements = getDepartements(sp.region)
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
            searchParams={sp}
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
            <ListePlages plages={plages} page={page} totalPages={totalPages} searchParams={sp} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

// src/app/recherche/page.tsx
import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { FiltresRecherche } from '@/components/features/FiltresRecherche'
import { ListePlages } from '@/components/features/ListePlages'
import type { PlageResume } from '@/types'

interface SearchParams {
  region?: string
  departement?: string
  q?: string
  page?: string
}

async function rechercherPlages(params: SearchParams): Promise<{ plages: PlageResume[]; total: number }> {
  const { region, departement, q, page = '1' } = params
  const limit = 12
  const skip = (parseInt(page) - 1) * limit

  const where = {
    actif: true,
    ...(region ? { region } : {}),
    ...(departement ? { departement } : {}),
    ...(q
      ? {
          OR: [
            { nom: { contains: q, mode: 'insensitive' as const } },
            { commune: { contains: q, mode: 'insensitive' as const } },
            { departement: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  try {
    const [plages, total] = await Promise.all([
      prisma.plage.findMany({
        where,
        select: {
          id: true, nom: true, slug: true, commune: true,
          departement: true, region: true,
          latitude: true, longitude: true,
          noteGlobale: true, nombreAvis: true, photo: true,
          accessibilites: { select: { type: true } },
        },
        orderBy: { noteGlobale: 'desc' },
        take: limit,
        skip,
      }),
      prisma.plage.count({ where }),
    ])

    return {
      plages: plages.map((p) => ({ ...p, accessibilites: p.accessibilites.map((a) => a.type as any) })),
      total,
    }
  } catch {
    return { plages: [], total: 0 }
  }
}

async function getRegions() {
  try {
    const result = await prisma.plage.groupBy({
      by: ['region'],
      where: { actif: true },
      orderBy: { region: 'asc' },
    })
    return result.map((r) => r.region)
  } catch {
    return []
  }
}

async function getDepartements(region?: string) {
  try {
    const result = await prisma.plage.groupBy({
      by: ['departement'],
      where: { actif: true, ...(region ? { region } : {}) },
      orderBy: { departement: 'asc' },
    })
    return result.map((r) => r.departement)
  } catch {
    return []
  }
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  const titre = searchParams.region
    ? `Plages accessibles en ${searchParams.region}`
    : searchParams.departement
    ? `Plages accessibles dans le ${searchParams.departement}`
    : 'Rechercher une plage accessible'

  return { title: titre }
}

export default async function PageRecherche({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const [{ plages, total }, regions, departements] = await Promise.all([
    rechercherPlages(searchParams),
    getRegions(),
    getDepartements(searchParams.region),
  ])

  const page = parseInt(searchParams.page ?? '1')
  const totalPages = Math.ceil(total / 12)

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

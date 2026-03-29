// src/components/features/ListePlages.tsx
import Link from 'next/link'
import { PlageCardResume } from './PlageCard'
import type { PlageResume } from '@/types'

interface ListePlagesProps {
  plages: PlageResume[]
  page: number
  totalPages: number
  searchParams: Record<string, string | undefined>
}

export function ListePlages({ plages, page, totalPages, searchParams }: ListePlagesProps) {
  if (plages.length === 0) {
    return (
      <div className="text-center py-16 text-ardoise-clair">
        <p className="text-5xl mb-4" aria-hidden="true">🌊</p>
        <p className="text-lg font-semibold">Aucune plage trouvée</p>
        <p className="text-sm mt-2">Essayez d&apos;élargir vos critères de recherche.</p>
      </div>
    )
  }

  function buildUrl(p: number) {
    const params = new URLSearchParams()
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v && k !== 'page') params.set(k, v)
    })
    if (p > 1) params.set('page', String(p))
    const str = params.toString()
    return `/recherche${str ? `?${str}` : ''}`
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {plages.map((plage) => (
          <PlageCardResume key={plage.id} plage={plage} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-10 flex justify-center gap-2" aria-label="Pagination">
          {page > 1 && (
            <Link
              href={buildUrl(page - 1)}
              className="px-4 py-2 rounded-lg bg-white border border-sable-fonce text-ardoise hover:bg-sable-fonce font-semibold text-sm"
              aria-label="Page précédente"
            >
              ← Précédent
            </Link>
          )}

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => Math.abs(p - page) <= 2)
            .map((p) => (
              <Link
                key={p}
                href={buildUrl(p)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                  p === page
                    ? 'bg-ocean text-white'
                    : 'bg-white border border-sable-fonce text-ardoise hover:bg-sable-fonce'
                }`}
                aria-label={`Page ${p}`}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </Link>
            ))}

          {page < totalPages && (
            <Link
              href={buildUrl(page + 1)}
              className="px-4 py-2 rounded-lg bg-white border border-sable-fonce text-ardoise hover:bg-sable-fonce font-semibold text-sm"
              aria-label="Page suivante"
            >
              Suivant →
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}

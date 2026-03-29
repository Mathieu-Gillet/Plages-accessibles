// src/components/features/OffreCulturelleCard.tsx
import { Globe, MapPin } from 'lucide-react'
import { distanceLabel } from '@/lib/utils'
import type { OffreCulturelle } from '@/types'

const ICONES_TYPE: Record<string, string> = {
  musée: '🏛️',
  festival: '🎭',
  monument: '🏰',
  activité: '🎯',
  parc: '🌳',
  restaurant: '🍽️',
  marché: '🛒',
}

export function OffreCulturelleCard({ offre: o }: { offre: OffreCulturelle }) {
  const icone = ICONES_TYPE[o.type.toLowerCase()] ?? '📍'

  return (
    <div className="bg-sable rounded-xl p-4 border border-sable-fonce">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="text-2xl" aria-hidden="true">{icone}</span>
          <div>
            <p className="font-bold text-ardoise">{o.nom}</p>
            <p className="text-sm text-ardoise-clair capitalize">{o.type}</p>
            {o.description && (
              <p className="text-xs text-ardoise-clair mt-1 leading-relaxed">{o.description}</p>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xs font-semibold text-ocean bg-ocean-pale px-2 py-1 rounded-full">
            {distanceLabel(o.distanceKm)}
          </span>
          {o.accessiblePMR && (
            <p className="text-xs text-vert-accessible font-semibold mt-1">♿ Accessible</p>
          )}
        </div>
      </div>

      <p className="text-xs text-ardoise-clair flex items-center gap-1 mt-2">
        <MapPin size={11} aria-hidden="true" />
        {o.adresse}
      </p>

      {o.siteWeb && (
        <a
          href={o.siteWeb}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 text-xs text-ocean hover:underline flex items-center gap-1"
          aria-label={`Site web de ${o.nom} (nouvel onglet)`}
        >
          <Globe size={11} aria-hidden="true" />
          Plus d&apos;infos
        </a>
      )}
    </div>
  )
}

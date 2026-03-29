// src/components/features/HebergementCard.tsx
import { Phone, Globe, MapPin } from 'lucide-react'
import { distanceLabel } from '@/lib/utils'
import type { Hebergement } from '@/types'

export function HebergementCard({ hebergement: h }: { hebergement: Hebergement }) {
  return (
    <div className="bg-sable rounded-xl p-4 border border-sable-fonce">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-ardoise">{h.nom}</p>
          <p className="text-sm text-ardoise-clair capitalize">{h.type}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xs font-semibold text-ocean bg-ocean-pale px-2 py-1 rounded-full">
            {distanceLabel(h.distanceKm)}
          </span>
          {h.accessiblePMR && (
            <p className="text-xs text-vert-accessible font-semibold mt-1">♿ PMR</p>
          )}
        </div>
      </div>

      <p className="text-xs text-ardoise-clair flex items-center gap-1 mt-2">
        <MapPin size={11} aria-hidden="true" />
        {h.adresse}
      </p>

      <div className="flex gap-3 mt-3">
        {h.telephone && (
          <a
            href={`tel:${h.telephone}`}
            className="text-xs text-ocean hover:underline flex items-center gap-1"
            aria-label={`Appeler ${h.nom}`}
          >
            <Phone size={11} aria-hidden="true" />
            {h.telephone}
          </a>
        )}
        {h.siteWeb && (
          <a
            href={h.siteWeb}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-ocean hover:underline flex items-center gap-1"
            aria-label={`Site web de ${h.nom} (nouvel onglet)`}
          >
            <Globe size={11} aria-hidden="true" />
            Site web
          </a>
        )}
      </div>
    </div>
  )
}

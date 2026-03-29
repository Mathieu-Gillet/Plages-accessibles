// src/components/features/PlageCard.tsx
import Link from 'next/link'
import { MapPin, Star } from 'lucide-react'
import { BadgeAccessibilite } from './BadgeAccessibilite'
import { formatNote } from '@/lib/utils'
import type { PlageResume, TypeAccessibilite } from '@/types'

interface PlageCardProps {
  plage: PlageResume
}

export function PlageCardResume({ plage }: PlageCardProps) {
  const accessPrincipaux = plage.accessibilites.slice(0, 3)
  const reste = plage.accessibilites.length - 3

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-sable-fonce hover:shadow-md transition-shadow overflow-hidden">
      {/* Photo */}
      <div className="h-44 bg-ocean-pale relative overflow-hidden">
        {plage.photo ? (
          <img
            src={plage.photo}
            alt={`Plage ${plage.nom}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl" aria-hidden="true">
            🏖️
          </div>
        )}
        {plage.noteGlobale > 0 && (
          <div
            className="absolute top-3 right-3 bg-ocean text-white text-sm font-bold px-2 py-1 rounded-lg flex items-center gap-1"
            aria-label={`Note : ${formatNote(plage.noteGlobale)}`}
          >
            <Star size={13} fill="currentColor" aria-hidden="true" />
            {formatNote(plage.noteGlobale)}
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="p-4">
        <h3 className="font-extrabold text-ardoise text-lg leading-tight mb-1">
          <Link
            href={`/plage/${plage.slug}`}
            className="hover:text-ocean transition-colors focus-visible:underline"
          >
            {plage.nom}
          </Link>
        </h3>
        <p className="text-ardoise-clair text-sm flex items-center gap-1 mb-3">
          <MapPin size={13} aria-hidden="true" />
          {plage.commune} · {plage.departement}
        </p>

        {/* Badges accessibilité */}
        <div className="flex flex-wrap gap-1.5" aria-label="Équipements disponibles">
          {accessPrincipaux.map((type) => (
            <BadgeAccessibilite key={type} type={type as TypeAccessibilite} taille="sm" />
          ))}
          {reste > 0 && (
            <span className="text-xs text-ardoise-clair font-semibold px-2 py-1 bg-sable-fonce rounded-full">
              +{reste} autres
            </span>
          )}
        </div>

        <Link
          href={`/plage/${plage.slug}`}
          className="mt-4 block text-center bg-ocean text-white py-2 rounded-lg font-semibold text-sm hover:bg-ocean-clair transition-colors"
          aria-label={`Voir les détails de la plage ${plage.nom}`}
        >
          Voir la plage
        </Link>
      </div>
    </article>
  )
}

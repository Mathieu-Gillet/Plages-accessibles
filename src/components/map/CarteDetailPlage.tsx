'use client'
// src/components/map/CarteDetailPlage.tsx
import dynamic from 'next/dynamic'
import type { Hebergement, OffreCulturelle, PlageAvecVotes } from '@/types'

const CarteLeaflet = dynamic(() => import('./CarteLeaflet'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-ocean-pale rounded-xl animate-pulse" role="status" aria-label="Chargement" />
  ),
})

interface CarteDetailPlageProps {
  latitude: number
  longitude: number
  nom: string
  hebergements: Hebergement[]
  offres: OffreCulturelle[]
}

export function CarteDetailPlage({
  latitude, longitude, nom, hebergements, offres
}: CarteDetailPlageProps) {
  // Marqueur de localisation uniquement : la note est déjà affichée en en-tête
  // de fiche, la répéter dans la bulle n'apporterait rien.
  const plageMarqueur: PlageAvecVotes[] = [{
    id: 'plage',
    nom,
    slug: '',
    commune: '',
    departement: '',
    region: '',
    latitude,
    longitude,
    photo: null,
    accessibilites: [],
    stats: { nombreVotes: 0, notePubliee: null },
  }]

  const poi = [
    ...hebergements.map(h => ({ latitude: h.latitude, longitude: h.longitude, nom: h.nom, type: 'hebergement' as const })),
    ...offres.map(o => ({ latitude: o.latitude, longitude: o.longitude, nom: o.nom, type: 'culture' as const })),
  ]

  return (
    <div className="w-full h-72 rounded-xl overflow-hidden shadow">
      <CarteLeaflet
        plages={plageMarqueur}
        hauteur="288px"
        centreInitial={[latitude, longitude]}
        zoomInitial={13}
        marqueursPoi={poi}
        afficherNote={false}
        lienGoogleMaps
      />
    </div>
  )
}

'use client'
// src/components/features/CarteAccueil.tsx
import dynamic from 'next/dynamic'
import type { PlageResume } from '@/types'

// Leaflet n'est pas compatible SSR — chargement dynamique côté client uniquement
const CarteLeaflet = dynamic(() => import('../map/CarteLeaflet'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full h-96 bg-ocean-pale rounded-xl flex items-center justify-center"
      role="status"
      aria-label="Chargement de la carte"
    >
      <p className="text-ocean font-semibold animate-pulse">Chargement de la carte…</p>
    </div>
  ),
})

interface CarteAccueilProps {
  plages: PlageResume[]
}

export function CarteAccueil({ plages }: CarteAccueilProps) {
  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden shadow-md">
      <CarteLeaflet plages={plages} hauteur="500px" centreInitial={[46.8, 2.3]} zoomInitial={6} />
    </div>
  )
}

'use client'
import dynamic from 'next/dynamic'
import { useState, useMemo } from 'react'
import type { PlageResume } from '@/types'

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

type FiltreNote = 'toutes' | '4-5' | '3-4' | '2-3' | '0-2'

const FILTRES: { value: FiltreNote; label: string }[] = [
  { value: 'toutes', label: 'Toutes' },
  { value: '4-5',   label: '★ 4 – 5' },
  { value: '3-4',   label: '★ 3 – 4' },
  { value: '2-3',   label: '★ 2 – 3' },
  { value: '0-2',   label: '★ < 2' },
]

function filtrerParNote(plages: PlageResume[], filtre: FiltreNote): PlageResume[] {
  switch (filtre) {
    case '4-5': return plages.filter(p => p.noteGlobale >= 4)
    case '3-4': return plages.filter(p => p.noteGlobale >= 3 && p.noteGlobale < 4)
    case '2-3': return plages.filter(p => p.noteGlobale >= 2 && p.noteGlobale < 3)
    case '0-2': return plages.filter(p => p.noteGlobale > 0 && p.noteGlobale < 2)
    default:    return plages
  }
}

interface CarteAccueilProps {
  plages: PlageResume[]
}

export function CarteAccueil({ plages }: CarteAccueilProps) {
  const [filtre, setFiltre] = useState<FiltreNote>('toutes')

  const plagesFiltrees = useMemo(() => filtrerParNote(plages, filtre), [plages, filtre])

  return (
    <div className="w-full space-y-3">
      <div className="w-full h-[500px] rounded-xl overflow-hidden shadow-md">
        <CarteLeaflet
          plages={plagesFiltrees}
          hauteur="500px"
          centreInitial={[46.8, 2.3]}
          zoomInitial={6}
        />
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les plages par note">
        {FILTRES.map(({ value, label }) => {
          const actif = filtre === value
          return (
            <button
              key={value}
              onClick={() => setFiltre(value)}
              className="px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors"
              style={actif
                ? { backgroundColor: '#2d6a4f', color: 'white', borderColor: '#2d6a4f' }
                : { backgroundColor: 'white', color: '#2d6a4f', borderColor: '#2d6a4f' }
              }
              aria-pressed={actif}
            >
              {label}
            </button>
          )
        })}
        <span className="self-center text-xs text-gray-400 ml-1">
          {plagesFiltrees.length} plage{plagesFiltrees.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}

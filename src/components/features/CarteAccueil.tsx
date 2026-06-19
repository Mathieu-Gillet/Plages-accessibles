'use client'
import dynamic from 'next/dynamic'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { MapPin, List } from 'lucide-react'
import { formatNote } from '@/lib/utils'
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
  const [vue, setVue] = useState<'carte' | 'liste'>('carte')

  const plagesFiltrees = useMemo(() => filtrerParNote(plages, filtre), [plages, filtre])

  return (
    <div className="w-full space-y-3">
      {/* Toggle carte / liste — la vue liste est l'alternative accessible au
          clavier et aux lecteurs d'écran de la carte Leaflet (RGAA 1.1). */}
      <div
        className="inline-flex rounded-lg border border-ocean overflow-hidden"
        role="group"
        aria-label="Choisir l'affichage des plages"
      >
        <button
          type="button"
          onClick={() => setVue('carte')}
          aria-pressed={vue === 'carte'}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold ${
            vue === 'carte' ? 'bg-ocean text-white' : 'bg-white text-ocean'
          }`}
        >
          <MapPin size={16} aria-hidden="true" /> Carte
        </button>
        <button
          type="button"
          onClick={() => setVue('liste')}
          aria-pressed={vue === 'liste'}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-l border-ocean ${
            vue === 'liste' ? 'bg-ocean text-white' : 'bg-white text-ocean'
          }`}
        >
          <List size={16} aria-hidden="true" /> Liste
        </button>
      </div>

      {vue === 'carte' ? (
        <div className="w-full h-[500px] rounded-xl overflow-hidden shadow-md">
          <CarteLeaflet
            plages={plagesFiltrees}
            hauteur="500px"
            centreInitial={[46.8, 2.3]}
            zoomInitial={6}
          />
        </div>
      ) : (
        <div className="w-full rounded-xl border border-ocean-pale overflow-hidden">
          {plagesFiltrees.length === 0 ? (
            <p className="p-4 text-ardoise-clair">Aucune plage ne correspond à ce filtre.</p>
          ) : (
            <ul className="divide-y divide-ocean-pale max-h-[500px] overflow-y-auto" aria-label="Liste des plages accessibles">
              {plagesFiltrees.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/plage/${p.slug}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-ocean-pale focus-visible:bg-ocean-pale"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold text-ardoise truncate">{p.nom}</span>
                      <span className="block text-sm text-ardoise-clair truncate">
                        {p.commune} · {p.departement}
                      </span>
                    </span>
                    {p.noteGlobale > 0 && (
                      <span className="shrink-0 text-sm font-semibold text-ocean" aria-label={`Note ${formatNote(p.noteGlobale)} sur 5`}>
                        ★ {formatNote(p.noteGlobale)}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

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
        <span className="self-center text-xs text-ardoise-clair ml-1">
          {plagesFiltrees.length} plage{plagesFiltrees.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}

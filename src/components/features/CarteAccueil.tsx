'use client'
import dynamic from 'next/dynamic'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { MapPin, List } from 'lucide-react'
import { formatNote } from '@/lib/utils'
import { SEUIL_VOTES, type PlageAvecVotes } from '@/types'

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

// Les anciens filtres par tranche de note (★ 4–5, ★ 3–4…) n'ont plus de sens :
// une plage n'a de note qu'à partir de SEUIL_VOTES votes, donc l'écrasante
// majorité tomberait dans une seule tranche. On filtre désormais sur ce qui
// distingue réellement les plages : avoir ou non une note communautaire.
type Filtre = 'toutes' | 'notees' | 'en-attente'

const FILTRES: { value: Filtre; label: string }[] = [
  { value: 'toutes', label: 'Toutes' },
  { value: 'notees', label: '★ Notées par les visiteurs' },
  { value: 'en-attente', label: 'En attente de votes' },
]

function filtrer(plages: PlageAvecVotes[], filtre: Filtre): PlageAvecVotes[] {
  switch (filtre) {
    case 'notees':
      return plages.filter((p) => p.stats.notePubliee !== null)
    case 'en-attente':
      return plages.filter((p) => p.stats.notePubliee === null)
    default:
      return plages
  }
}

interface CarteAccueilProps {
  plages: PlageAvecVotes[]
  /** Nombre maximum de plages retenues par région, affiché au visiteur. */
  maxParRegion: number
  /** Taille du catalogue complet, pour renvoyer vers la recherche. */
  totalCatalogue: number
}

export function CarteAccueil({ plages, maxParRegion, totalCatalogue }: CarteAccueilProps) {
  const [filtre, setFiltre] = useState<Filtre>('toutes')
  const [vue, setVue] = useState<'carte' | 'liste'>('carte')

  const plagesFiltrees = useMemo(() => filtrer(plages, filtre), [plages, filtre])

  return (
    <div className="w-full space-y-3">
      {/* La carte est une sélection, pas le catalogue : le dire explicitement
          évite de laisser croire que le site ne recense que ces plages. */}
      <p className="text-sm text-ardoise-clair">
        Une sélection de {maxParRegion} plages par région, les mieux notées par
        les visiteurs en tête.{' '}
        <Link href="/recherche" className="text-ocean font-semibold hover:underline">
          Voir les {totalCatalogue} plages recensées →
        </Link>
      </p>

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
            <ul
              className="divide-y divide-ocean-pale max-h-[500px] overflow-y-auto"
              aria-label="Liste des plages accessibles"
            >
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
                    {p.stats.notePubliee !== null ? (
                      <span
                        className="shrink-0 text-sm font-semibold text-ocean"
                        aria-label={`Note ${formatNote(p.stats.notePubliee)} sur 5, moyenne de ${p.stats.nombreVotes} votes`}
                      >
                        <span aria-hidden="true">★ {formatNote(p.stats.notePubliee)}</span>
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-ardoise-clair">
                        {p.stats.nombreVotes}/{SEUIL_VOTES} votes
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les plages">
        {FILTRES.map(({ value, label }) => {
          const actif = filtre === value
          return (
            <button
              key={value}
              onClick={() => setFiltre(value)}
              className="px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors"
              style={
                actif
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
          {plagesFiltrees.length} plage{plagesFiltrees.length !== 1 ? 's' : ''} affichée
          {plagesFiltrees.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}

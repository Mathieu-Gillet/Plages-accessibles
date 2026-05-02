'use client'
// src/components/features/FiltresRecherche.tsx
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search } from 'lucide-react'

interface FiltresRechercheProps {
  regions: string[]
  departements: string[]
  searchParams: {
    region?: string
    departement?: string
    q?: string
  }
}

export function FiltresRecherche({
  regions,
  departements,
  searchParams,
}: FiltresRechercheProps) {
  const router = useRouter()
  const [region, setRegion] = useState(searchParams.region ?? '')
  const [departement, setDepartement] = useState(searchParams.departement ?? '')
  const [q, setQ] = useState(searchParams.q ?? '')

  function appliquer() {
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (region) params.set('region', region)
    if (departement) params.set('departement', departement)
    router.push(`/recherche?${params.toString()}`)
  }

  function reinitialiser() {
    setRegion('')
    setDepartement('')
    setQ('')
    router.push('/recherche')
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        appliquer()
      }}
      className="bg-white rounded-2xl border border-sable-fonce p-5 space-y-5"
      role="search"
      aria-label="Filtres de recherche de plages"
    >
      <h2 className="font-bold text-ardoise text-lg">Filtrer par</h2>

      {/* Recherche texte */}
      <div>
        <label htmlFor="filtre-q" className="block text-sm font-semibold text-ardoise mb-1">
          Nom, commune ou département
        </label>
        <div className="relative">
          <Search
            size={16}
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ardoise-clair pointer-events-none"
          />
          <input
            id="filtre-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ex. Biarritz, Landes…"
            className="w-full border border-sable-fonce rounded-lg pl-9 pr-3 py-2 text-sm text-ardoise focus:outline-none focus:border-ocean"
            autoComplete="off"
          />
        </div>
      </div>

      {/* Région */}
      <div>
        <label htmlFor="filtre-region" className="block text-sm font-semibold text-ardoise mb-1">
          Région
        </label>
        <select
          id="filtre-region"
          value={region}
          onChange={(e) => {
            setRegion(e.target.value)
            setDepartement('') // reset département si région change
          }}
          className="w-full border border-sable-fonce rounded-lg px-3 py-2 text-sm text-ardoise focus:outline-none focus:border-ocean"
        >
          <option value="">Toutes les régions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Département */}
      <div>
        <label htmlFor="filtre-departement" className="block text-sm font-semibold text-ardoise mb-1">
          Département
        </label>
        <select
          id="filtre-departement"
          value={departement}
          onChange={(e) => setDepartement(e.target.value)}
          className="w-full border border-sable-fonce rounded-lg px-3 py-2 text-sm text-ardoise focus:outline-none focus:border-ocean"
          disabled={departements.length === 0}
          aria-disabled={departements.length === 0}
        >
          <option value="">Tous les départements</option>
          {departements.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        {departements.length === 0 && (
          <p className="text-xs text-ardoise-clair mt-1">
            Sélectionnez d&apos;abord une région
          </p>
        )}
      </div>

      {/* Boutons */}
      <div className="flex flex-col gap-2 pt-2">
        <button
          type="submit"
          className="w-full bg-ocean text-white font-bold py-2 rounded-lg hover:bg-ocean-clair transition-colors"
        >
          Appliquer les filtres
        </button>
        <button
          type="button"
          onClick={reinitialiser}
          className="w-full text-ardoise-clair font-semibold py-2 rounded-lg hover:bg-sable-fonce transition-colors text-sm"
        >
          Réinitialiser
        </button>
      </div>
    </form>
  )
}

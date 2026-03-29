'use client'
// src/components/features/RechercheRapide.tsx
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search } from 'lucide-react'

export function RechercheRapide() {
  const router = useRouter()
  const [valeur, setValeur] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (valeur.trim()) {
      router.push(`/recherche?q=${encodeURIComponent(valeur.trim())}`)
    } else {
      router.push('/recherche')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="Recherche rapide de plages"
      className="flex gap-2 max-w-lg mx-auto"
    >
      <label htmlFor="recherche-rapide" className="sr-only">
        Rechercher par commune, département ou région
      </label>
      <input
        id="recherche-rapide"
        type="search"
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
        placeholder="Commune, département, région…"
        className="flex-1 px-4 py-3 rounded-xl border-2 border-ocean-clair text-ardoise text-base focus:outline-none focus:border-ocean shadow-sm"
        autoComplete="off"
      />
      <button
        type="submit"
        className="bg-ocean text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-ocean-clair transition-colors"
        aria-label="Lancer la recherche"
      >
        <Search size={18} aria-hidden="true" />
        <span className="hidden sm:inline">Rechercher</span>
      </button>
    </form>
  )
}

'use client'
// src/app/contribuer/page.tsx
import { useState } from 'react'
import { LABELS_ACCESSIBILITE, type TypeAccessibilite } from '@/types'

export default function PageContribuer() {
  const [etape, setEtape] = useState<'form' | 'ok'>('form')
  const [chargement, setChargement] = useState(false)
  const [form, setForm] = useState({
    nom: '',
    commune: '',
    departement: '',
    region: '',
    description: '',
    accessibilites: [] as TypeAccessibilite[],
    contact: '',
  })

  function toggleAccess(type: TypeAccessibilite) {
    setForm((f) => ({
      ...f,
      accessibilites: f.accessibilites.includes(type)
        ? f.accessibilites.filter((a) => a !== type)
        : [...f.accessibilites, type],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setChargement(true)
    // TODO: envoyer vers /api/suggestions
    await new Promise((r) => setTimeout(r, 800)) // simulation
    setChargement(false)
    setEtape('ok')
  }

  if (etape === 'ok') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-6xl mb-4" aria-hidden="true">🎉</p>
        <h1 className="text-3xl font-extrabold text-ardoise mb-4">Merci pour votre contribution !</h1>
        <p className="text-ardoise-clair text-lg mb-8">
          Votre suggestion a été transmise. Nous allons vérifier les informations
          et ajouter la plage dans les prochains jours.
        </p>
        <a href="/" className="bg-ocean text-white px-6 py-3 rounded-xl font-bold hover:bg-ocean-clair transition-colors">
          Retour à l&apos;accueil
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-ardoise mb-2">Suggérer une plage</h1>
      <p className="text-ardoise-clair mb-8">
        Vous connaissez une plage accessible non référencée ? Aidez-nous à l&apos;ajouter !
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-6 bg-white rounded-2xl border border-sable-fonce p-6">
        {/* Nom */}
        <div>
          <label htmlFor="nom" className="block text-sm font-bold text-ardoise mb-1">
            Nom de la plage <span aria-hidden="true">*</span>
          </label>
          <input
            id="nom"
            required
            type="text"
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            className="w-full border border-sable-fonce rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ocean"
            placeholder="Ex : Plage du Prado"
          />
        </div>

        {/* Commune / Département */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="commune" className="block text-sm font-bold text-ardoise mb-1">
              Commune <span aria-hidden="true">*</span>
            </label>
            <input
              id="commune"
              required
              type="text"
              value={form.commune}
              onChange={(e) => setForm({ ...form, commune: e.target.value })}
              className="w-full border border-sable-fonce rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ocean"
            />
          </div>
          <div>
            <label htmlFor="departement" className="block text-sm font-bold text-ardoise mb-1">
              Département <span aria-hidden="true">*</span>
            </label>
            <input
              id="departement"
              required
              type="text"
              value={form.departement}
              onChange={(e) => setForm({ ...form, departement: e.target.value })}
              className="w-full border border-sable-fonce rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ocean"
              placeholder="Ex : Bouches-du-Rhône"
            />
          </div>
        </div>

        {/* Région */}
        <div>
          <label htmlFor="region" className="block text-sm font-bold text-ardoise mb-1">
            Région <span aria-hidden="true">*</span>
          </label>
          <input
            id="region"
            required
            type="text"
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
            className="w-full border border-sable-fonce rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ocean"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-bold text-ardoise mb-1">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-sable-fonce rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ocean resize-none"
            placeholder="Décrivez les équipements, l'ambiance, les points forts…"
          />
        </div>

        {/* Accessibilités */}
        <fieldset>
          <legend className="text-sm font-bold text-ardoise mb-3">
            Équipements d&apos;accessibilité disponibles
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(LABELS_ACCESSIBILITE) as [TypeAccessibilite, string][]).map(([type, label]) => (
              <label
                key={type}
                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                  form.accessibilites.includes(type)
                    ? 'border-ocean bg-ocean-pale text-ocean font-semibold'
                    : 'border-sable-fonce text-ardoise-clair hover:bg-sable'
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.accessibilites.includes(type)}
                  onChange={() => toggleAccess(type)}
                  className="sr-only"
                />
                <span aria-hidden="true">{form.accessibilites.includes(type) ? '✅' : '⬜'}</span>
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Contact */}
        <div>
          <label htmlFor="contact" className="block text-sm font-bold text-ardoise mb-1">
            Votre email (pour suivi, facultatif)
          </label>
          <input
            id="contact"
            type="email"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
            className="w-full border border-sable-fonce rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ocean"
          />
        </div>

        <button
          type="submit"
          disabled={chargement || !form.nom || !form.commune || !form.departement}
          className="w-full bg-ocean text-white font-bold py-3 rounded-xl hover:bg-ocean-clair transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {chargement ? 'Envoi en cours…' : 'Envoyer ma suggestion'}
        </button>
      </form>
    </div>
  )
}

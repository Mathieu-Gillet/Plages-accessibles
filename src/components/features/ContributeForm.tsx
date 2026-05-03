'use client'

import { useState } from 'react'
import { LABELS_ACCESSIBILITE, REGIONS_FRANCE, type TypeAccessibilite } from '@/types'
import { TYPES_ACCESSIBILITE } from '@/lib/content-schema'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface FormData {
  nom: string
  description: string
  commune: string
  codePostal: string
  departement: string
  region: string
  latitude: string
  longitude: string
  accessibilites: TypeAccessibilite[]
  photo: string
  noteContributeur: string
}

const INITIAL: FormData = {
  nom: '',
  description: '',
  commune: '',
  codePostal: '',
  departement: '',
  region: '',
  latitude: '',
  longitude: '',
  accessibilites: [],
  photo: '',
  noteContributeur: '',
}

interface FieldErrors {
  [key: string]: string
}

function validate(data: FormData): FieldErrors {
  const errors: FieldErrors = {}
  if (!data.nom.trim()) errors.nom = 'Le nom est requis.'
  if (data.description.trim().length < 150)
    errors.description = `Description trop courte (${data.description.trim().length}/150 caractères minimum).`
  if (!data.commune.trim()) errors.commune = 'La commune est requise.'
  if (!/^\d{5}$/.test(data.codePostal)) errors.codePostal = 'Code postal invalide (5 chiffres).'
  if (!data.departement.trim()) errors.departement = 'Le département est requis.'
  if (!data.region) errors.region = 'La région est requise.'
  const lat = parseFloat(data.latitude)
  if (isNaN(lat) || lat < -90 || lat > 90) errors.latitude = 'Latitude invalide (entre -90 et 90).'
  const lon = parseFloat(data.longitude)
  if (isNaN(lon) || lon < -180 || lon > 180) errors.longitude = 'Longitude invalide (entre -180 et 180).'
  if (data.photo && (!data.photo.startsWith('https://') || !isValidUrl(data.photo)))
    errors.photo = 'URL invalide (doit commencer par https://).'
  return errors
}

function isValidUrl(s: string): boolean {
  try { new URL(s); return true } catch { return false }
}

export function ContributeForm() {
  const [form, setForm] = useState<FormData>(INITIAL)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [status, setStatus] = useState<Status>('idle')
  const [serverError, setServerError] = useState('')
  const [prUrl, setPrUrl] = useState('')

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => { const e = { ...prev }; delete e[field]; return e })
  }

  function toggleAccessibilite(type: TypeAccessibilite) {
    setForm((prev) => ({
      ...prev,
      accessibilites: prev.accessibilites.includes(type)
        ? prev.accessibilites.filter((a) => a !== type)
        : [...prev.accessibilites, type],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fieldErrors = validate(form)
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }

    setStatus('loading')
    setServerError('')

    try {
      const res = await fetch('/api/contribuer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: form.nom.trim(),
          description: form.description.trim(),
          commune: form.commune.trim(),
          codePostal: form.codePostal.trim(),
          departement: form.departement.trim(),
          region: form.region,
          latitude: parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
          accessibilites: form.accessibilites,
          photo: form.photo.trim() || undefined,
          noteContributeur: form.noteContributeur.trim() || undefined,
        }),
      })

      const data = await res.json().catch(() => ({})) as { ok?: boolean; prUrl?: string; error?: string }

      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')

      setPrUrl(data.prUrl ?? '')
      setStatus('success')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Une erreur est survenue')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div role="alert" className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <p className="text-green-800 font-bold text-xl mb-2">Merci pour votre contribution !</p>
        <p className="text-green-700 text-sm mb-4">
          Une proposition a été créée sur GitHub. Elle sera vérifiée et publiée si les informations sont correctes.
        </p>
        {prUrl && (
          <a
            href={prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-ocean text-white font-bold py-2 px-5 rounded-xl hover:bg-ocean-clair transition-colors text-sm"
          >
            Voir la proposition sur GitHub ↗
          </a>
        )}
      </div>
    )
  }

  const inputClass = (field: string) =>
    `w-full border rounded-lg px-3 py-2 text-sm text-ardoise placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ocean ${
      errors[field] ? 'border-red-400' : 'border-sable-fonce'
    }`

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Section : Informations générales */}
      <section className="bg-white rounded-2xl border border-sable-fonce p-6">
        <h2 className="font-bold text-ardoise text-lg mb-4">Informations générales</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="cf-nom" className="block text-sm font-semibold text-ardoise mb-1">
              Nom de la plage <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="cf-nom"
              type="text"
              value={form.nom}
              onChange={(e) => set('nom', e.target.value)}
              maxLength={200}
              placeholder="Ex : Grande Plage de Biarritz"
              className={inputClass('nom')}
            />
            {errors.nom && <p className="text-red-600 text-xs mt-1">{errors.nom}</p>}
          </div>

          <div>
            <label htmlFor="cf-commune" className="block text-sm font-semibold text-ardoise mb-1">
              Commune <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="cf-commune"
              type="text"
              value={form.commune}
              onChange={(e) => set('commune', e.target.value)}
              maxLength={200}
              placeholder="Ex : Biarritz"
              className={inputClass('commune')}
            />
            {errors.commune && <p className="text-red-600 text-xs mt-1">{errors.commune}</p>}
          </div>

          <div>
            <label htmlFor="cf-codePostal" className="block text-sm font-semibold text-ardoise mb-1">
              Code postal <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="cf-codePostal"
              type="text"
              value={form.codePostal}
              onChange={(e) => set('codePostal', e.target.value)}
              maxLength={5}
              placeholder="Ex : 64200"
              inputMode="numeric"
              className={inputClass('codePostal')}
            />
            {errors.codePostal && <p className="text-red-600 text-xs mt-1">{errors.codePostal}</p>}
          </div>

          <div>
            <label htmlFor="cf-departement" className="block text-sm font-semibold text-ardoise mb-1">
              Département <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="cf-departement"
              type="text"
              value={form.departement}
              onChange={(e) => set('departement', e.target.value)}
              maxLength={200}
              placeholder="Ex : Pyrénées-Atlantiques"
              className={inputClass('departement')}
            />
            {errors.departement && <p className="text-red-600 text-xs mt-1">{errors.departement}</p>}
          </div>

          <div>
            <label htmlFor="cf-region" className="block text-sm font-semibold text-ardoise mb-1">
              Région <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select
              id="cf-region"
              value={form.region}
              onChange={(e) => set('region', e.target.value)}
              className={inputClass('region')}
            >
              <option value="">— Sélectionner —</option>
              {REGIONS_FRANCE.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {errors.region && <p className="text-red-600 text-xs mt-1">{errors.region}</p>}
          </div>
        </div>
      </section>

      {/* Section : Localisation */}
      <section className="bg-white rounded-2xl border border-sable-fonce p-6">
        <h2 className="font-bold text-ardoise text-lg mb-1">Coordonnées GPS</h2>
        <p className="text-ardoise-clair text-xs mb-4">
          Trouvez les coordonnées sur{' '}
          <a
            href="https://www.openstreetmap.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ocean hover:underline"
          >
            OpenStreetMap
          </a>{' '}
          (clic droit → &quot;Afficher l&apos;adresse&quot;).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="cf-latitude" className="block text-sm font-semibold text-ardoise mb-1">
              Latitude <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="cf-latitude"
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => set('latitude', e.target.value)}
              placeholder="Ex : 43.4848"
              className={inputClass('latitude')}
            />
            {errors.latitude && <p className="text-red-600 text-xs mt-1">{errors.latitude}</p>}
          </div>
          <div>
            <label htmlFor="cf-longitude" className="block text-sm font-semibold text-ardoise mb-1">
              Longitude <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="cf-longitude"
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) => set('longitude', e.target.value)}
              placeholder="Ex : -1.5614"
              className={inputClass('longitude')}
            />
            {errors.longitude && <p className="text-red-600 text-xs mt-1">{errors.longitude}</p>}
          </div>
        </div>
      </section>

      {/* Section : Description */}
      <section className="bg-white rounded-2xl border border-sable-fonce p-6">
        <h2 className="font-bold text-ardoise text-lg mb-1">Description</h2>
        <p className="text-ardoise-clair text-xs mb-3">
          Décrivez les équipements, l&apos;ambiance, les conditions d&apos;accès… (minimum 150 caractères)
        </p>
        <label htmlFor="cf-description" className="sr-only">
          Description de la plage (minimum 150 caractères)
        </label>
        <textarea
          id="cf-description"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          maxLength={3000}
          rows={5}
          placeholder="Ex : Plage labellisée Handiplage avec chemin d'accès aménagé, fauteuils amphibies disponibles en saison, parkings PMR à 50 m…"
          className={`${inputClass('description')} resize-y`}
        />
        <div className="flex justify-between items-center mt-1">
          {errors.description
            ? <p className="text-red-600 text-xs">{errors.description}</p>
            : <span />}
          <p className={`text-xs ml-auto ${form.description.length < 150 ? 'text-ardoise-clair' : 'text-green-600'}`}>
            {form.description.length}/3000
            {form.description.length < 150 && ` (${150 - form.description.length} restants)`}
          </p>
        </div>
      </section>

      {/* Section : Équipements */}
      <section className="bg-white rounded-2xl border border-sable-fonce p-6">
        <h2 className="font-bold text-ardoise text-lg mb-3">Équipements d&apos;accessibilité</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(TYPES_ACCESSIBILITE as readonly TypeAccessibilite[]).map((type) => (
            <label
              key={type}
              className="flex items-center gap-2 cursor-pointer text-sm text-ardoise hover:text-ocean"
            >
              <input
                type="checkbox"
                checked={form.accessibilites.includes(type)}
                onChange={() => toggleAccessibilite(type)}
                className="w-4 h-4 accent-ocean"
              />
              {LABELS_ACCESSIBILITE[type]}
            </label>
          ))}
        </div>
      </section>

      {/* Section : Photo + Source */}
      <section className="bg-white rounded-2xl border border-sable-fonce p-6">
        <h2 className="font-bold text-ardoise text-lg mb-4">Photo & source</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="cf-photo" className="block text-sm font-semibold text-ardoise mb-1">
              URL d&apos;une photo <span className="text-ardoise-clair font-normal">(optionnel)</span>
            </label>
            <input
              id="cf-photo"
              type="url"
              value={form.photo}
              onChange={(e) => set('photo', e.target.value)}
              placeholder="https://upload.wikimedia.org/…"
              className={inputClass('photo')}
            />
            {errors.photo && <p className="text-red-600 text-xs mt-1">{errors.photo}</p>}
            <p className="text-xs text-ardoise-clair mt-1">URL publique en HTTPS (Wikimedia Commons recommandé).</p>
          </div>

          <div>
            <label htmlFor="cf-note" className="block text-sm font-semibold text-ardoise mb-1">
              Source / date de visite <span className="text-ardoise-clair font-normal">(optionnel)</span>
            </label>
            <textarea
              id="cf-note"
              value={form.noteContributeur}
              onChange={(e) => set('noteContributeur', e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Ex : Visité en juillet 2025, source : handiplage.fr"
              className={`${inputClass('noteContributeur')} resize-none`}
            />
          </div>
        </div>
      </section>

      {serverError && (
        <p role="alert" className="text-red-600 text-sm">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-ocean text-white font-bold py-3 px-6 rounded-xl hover:bg-ocean-clair transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base"
      >
        {status === 'loading' ? 'Envoi en cours…' : 'Soumettre la plage'}
      </button>

      <p className="text-xs text-ardoise-clair text-center">
        En soumettant ce formulaire, vous acceptez que votre contribution soit publiée publiquement sur GitHub.
      </p>
    </form>
  )
}

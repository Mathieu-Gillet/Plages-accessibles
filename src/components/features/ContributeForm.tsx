'use client'

import { useState } from 'react'
import { LABELS_ACCESSIBILITE, REGIONS_FRANCE, type TypeAccessibilite } from '@/types'
import { TYPES_ACCESSIBILITE } from '@/lib/content-schema'

type Status = 'idle' | 'loading' | 'success' | 'error'

const DEPARTEMENTS = [
  { code: '01', nom: 'Ain' },
  { code: '02', nom: 'Aisne' },
  { code: '03', nom: 'Allier' },
  { code: '04', nom: 'Alpes-de-Haute-Provence' },
  { code: '05', nom: 'Hautes-Alpes' },
  { code: '06', nom: 'Alpes-Maritimes' },
  { code: '07', nom: 'Ardèche' },
  { code: '08', nom: 'Ardennes' },
  { code: '09', nom: 'Ariège' },
  { code: '10', nom: 'Aube' },
  { code: '11', nom: 'Aude' },
  { code: '12', nom: 'Aveyron' },
  { code: '13', nom: 'Bouches-du-Rhône' },
  { code: '14', nom: 'Calvados' },
  { code: '15', nom: 'Cantal' },
  { code: '16', nom: 'Charente' },
  { code: '17', nom: 'Charente-Maritime' },
  { code: '18', nom: 'Cher' },
  { code: '19', nom: 'Corrèze' },
  { code: '2A', nom: 'Corse-du-Sud' },
  { code: '2B', nom: 'Haute-Corse' },
  { code: '21', nom: "Côte-d'Or" },
  { code: '22', nom: "Côtes-d'Armor" },
  { code: '23', nom: 'Creuse' },
  { code: '24', nom: 'Dordogne' },
  { code: '25', nom: 'Doubs' },
  { code: '26', nom: 'Drôme' },
  { code: '27', nom: 'Eure' },
  { code: '28', nom: 'Eure-et-Loir' },
  { code: '29', nom: 'Finistère' },
  { code: '30', nom: 'Gard' },
  { code: '31', nom: 'Haute-Garonne' },
  { code: '32', nom: 'Gers' },
  { code: '33', nom: 'Gironde' },
  { code: '34', nom: 'Hérault' },
  { code: '35', nom: 'Ille-et-Vilaine' },
  { code: '36', nom: 'Indre' },
  { code: '37', nom: 'Indre-et-Loire' },
  { code: '38', nom: 'Isère' },
  { code: '39', nom: 'Jura' },
  { code: '40', nom: 'Landes' },
  { code: '41', nom: 'Loir-et-Cher' },
  { code: '42', nom: 'Loire' },
  { code: '43', nom: 'Haute-Loire' },
  { code: '44', nom: 'Loire-Atlantique' },
  { code: '45', nom: 'Loiret' },
  { code: '46', nom: 'Lot' },
  { code: '47', nom: 'Lot-et-Garonne' },
  { code: '48', nom: 'Lozère' },
  { code: '49', nom: 'Maine-et-Loire' },
  { code: '50', nom: 'Manche' },
  { code: '51', nom: 'Marne' },
  { code: '52', nom: 'Haute-Marne' },
  { code: '53', nom: 'Mayenne' },
  { code: '54', nom: 'Meurthe-et-Moselle' },
  { code: '55', nom: 'Meuse' },
  { code: '56', nom: 'Morbihan' },
  { code: '57', nom: 'Moselle' },
  { code: '58', nom: 'Nièvre' },
  { code: '59', nom: 'Nord' },
  { code: '60', nom: 'Oise' },
  { code: '61', nom: 'Orne' },
  { code: '62', nom: 'Pas-de-Calais' },
  { code: '63', nom: 'Puy-de-Dôme' },
  { code: '64', nom: 'Pyrénées-Atlantiques' },
  { code: '65', nom: 'Hautes-Pyrénées' },
  { code: '66', nom: 'Pyrénées-Orientales' },
  { code: '67', nom: 'Bas-Rhin' },
  { code: '68', nom: 'Haut-Rhin' },
  { code: '69', nom: 'Rhône' },
  { code: '70', nom: 'Haute-Saône' },
  { code: '71', nom: 'Saône-et-Loire' },
  { code: '72', nom: 'Sarthe' },
  { code: '73', nom: 'Savoie' },
  { code: '74', nom: 'Haute-Savoie' },
  { code: '75', nom: 'Paris' },
  { code: '76', nom: 'Seine-Maritime' },
  { code: '77', nom: 'Seine-et-Marne' },
  { code: '78', nom: 'Yvelines' },
  { code: '79', nom: 'Deux-Sèvres' },
  { code: '80', nom: 'Somme' },
  { code: '81', nom: 'Tarn' },
  { code: '82', nom: 'Tarn-et-Garonne' },
  { code: '83', nom: 'Var' },
  { code: '84', nom: 'Vaucluse' },
  { code: '85', nom: 'Vendée' },
  { code: '86', nom: 'Vienne' },
  { code: '87', nom: 'Haute-Vienne' },
  { code: '88', nom: 'Vosges' },
  { code: '89', nom: 'Yonne' },
  { code: '90', nom: 'Territoire de Belfort' },
  { code: '91', nom: 'Essonne' },
  { code: '92', nom: 'Hauts-de-Seine' },
  { code: '93', nom: 'Seine-Saint-Denis' },
  { code: '94', nom: 'Val-de-Marne' },
  { code: '95', nom: "Val-d'Oise" },
  { code: '971', nom: 'Guadeloupe' },
  { code: '972', nom: 'Martinique' },
  { code: '973', nom: 'Guyane' },
  { code: '974', nom: 'La Réunion' },
  { code: '976', nom: 'Mayotte' },
] as const

const DEPT_TO_REGION: Record<string, string> = {
  'Ain': 'Auvergne-Rhône-Alpes',
  'Aisne': 'Hauts-de-France',
  'Allier': 'Auvergne-Rhône-Alpes',
  'Alpes-de-Haute-Provence': "Provence-Alpes-Côte d'Azur",
  'Hautes-Alpes': "Provence-Alpes-Côte d'Azur",
  'Alpes-Maritimes': "Provence-Alpes-Côte d'Azur",
  'Ardèche': 'Auvergne-Rhône-Alpes',
  'Ardennes': 'Grand Est',
  'Ariège': 'Occitanie',
  'Aube': 'Grand Est',
  'Aude': 'Occitanie',
  'Aveyron': 'Occitanie',
  'Bouches-du-Rhône': "Provence-Alpes-Côte d'Azur",
  'Calvados': 'Normandie',
  'Cantal': 'Auvergne-Rhône-Alpes',
  'Charente': 'Nouvelle-Aquitaine',
  'Charente-Maritime': 'Nouvelle-Aquitaine',
  'Cher': 'Centre-Val de Loire',
  'Corrèze': 'Nouvelle-Aquitaine',
  'Corse-du-Sud': 'Corse',
  'Haute-Corse': 'Corse',
  "Côte-d'Or": 'Bourgogne-Franche-Comté',
  "Côtes-d'Armor": 'Bretagne',
  'Creuse': 'Nouvelle-Aquitaine',
  'Dordogne': 'Nouvelle-Aquitaine',
  'Doubs': 'Bourgogne-Franche-Comté',
  'Drôme': 'Auvergne-Rhône-Alpes',
  'Eure': 'Normandie',
  'Eure-et-Loir': 'Centre-Val de Loire',
  'Finistère': 'Bretagne',
  'Gard': 'Occitanie',
  'Haute-Garonne': 'Occitanie',
  'Gers': 'Occitanie',
  'Gironde': 'Nouvelle-Aquitaine',
  'Hérault': 'Occitanie',
  'Ille-et-Vilaine': 'Bretagne',
  'Indre': 'Centre-Val de Loire',
  'Indre-et-Loire': 'Centre-Val de Loire',
  'Isère': 'Auvergne-Rhône-Alpes',
  'Jura': 'Bourgogne-Franche-Comté',
  'Landes': 'Nouvelle-Aquitaine',
  'Loir-et-Cher': 'Centre-Val de Loire',
  'Loire': 'Auvergne-Rhône-Alpes',
  'Haute-Loire': 'Auvergne-Rhône-Alpes',
  'Loire-Atlantique': 'Pays de la Loire',
  'Loiret': 'Centre-Val de Loire',
  'Lot': 'Occitanie',
  'Lot-et-Garonne': 'Nouvelle-Aquitaine',
  'Lozère': 'Occitanie',
  'Maine-et-Loire': 'Pays de la Loire',
  'Manche': 'Normandie',
  'Marne': 'Grand Est',
  'Haute-Marne': 'Grand Est',
  'Mayenne': 'Pays de la Loire',
  'Meurthe-et-Moselle': 'Grand Est',
  'Meuse': 'Grand Est',
  'Morbihan': 'Bretagne',
  'Moselle': 'Grand Est',
  'Nièvre': 'Bourgogne-Franche-Comté',
  'Nord': 'Hauts-de-France',
  'Oise': 'Hauts-de-France',
  'Orne': 'Normandie',
  'Pas-de-Calais': 'Hauts-de-France',
  'Puy-de-Dôme': 'Auvergne-Rhône-Alpes',
  'Pyrénées-Atlantiques': 'Nouvelle-Aquitaine',
  'Hautes-Pyrénées': 'Occitanie',
  'Pyrénées-Orientales': 'Occitanie',
  'Bas-Rhin': 'Grand Est',
  'Haut-Rhin': 'Grand Est',
  'Rhône': 'Auvergne-Rhône-Alpes',
  'Haute-Saône': 'Bourgogne-Franche-Comté',
  'Saône-et-Loire': 'Bourgogne-Franche-Comté',
  'Sarthe': 'Pays de la Loire',
  'Savoie': 'Auvergne-Rhône-Alpes',
  'Haute-Savoie': 'Auvergne-Rhône-Alpes',
  'Paris': 'Île-de-France',
  'Seine-Maritime': 'Normandie',
  'Seine-et-Marne': 'Île-de-France',
  'Yvelines': 'Île-de-France',
  'Deux-Sèvres': 'Nouvelle-Aquitaine',
  'Somme': 'Hauts-de-France',
  'Tarn': 'Occitanie',
  'Tarn-et-Garonne': 'Occitanie',
  'Var': "Provence-Alpes-Côte d'Azur",
  'Vaucluse': "Provence-Alpes-Côte d'Azur",
  'Vendée': 'Pays de la Loire',
  'Vienne': 'Nouvelle-Aquitaine',
  'Haute-Vienne': 'Nouvelle-Aquitaine',
  'Vosges': 'Grand Est',
  'Yonne': 'Bourgogne-Franche-Comté',
  'Territoire de Belfort': 'Bourgogne-Franche-Comté',
  'Essonne': 'Île-de-France',
  'Hauts-de-Seine': 'Île-de-France',
  'Seine-Saint-Denis': 'Île-de-France',
  'Val-de-Marne': 'Île-de-France',
  "Val-d'Oise": 'Île-de-France',
  'Guadeloupe': 'Guadeloupe',
  'Martinique': 'Martinique',
  'Guyane': 'Guyane',
  'La Réunion': 'La Réunion',
  'Mayotte': 'Mayotte',
}

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
  premierAvisNote: number
  premierAvisAuteur: string
  premierAvisCommentaire: string
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
  premierAvisNote: 0,
  premierAvisAuteur: '',
  premierAvisCommentaire: '',
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
  if (!data.departement) errors.departement = 'Le département est requis.'
  if (!data.region) errors.region = 'La région est requise.'
  if (data.latitude) {
    const lat = parseFloat(data.latitude)
    if (isNaN(lat) || lat < -90 || lat > 90) errors.latitude = 'Latitude invalide (entre -90 et 90).'
  }
  if (data.longitude) {
    const lon = parseFloat(data.longitude)
    if (isNaN(lon) || lon < -180 || lon > 180) errors.longitude = 'Longitude invalide (entre -180 et 180).'
  }
  if (data.photo && (!data.photo.startsWith('https://') || !isValidUrl(data.photo)))
    errors.photo = 'URL invalide (doit commencer par https://).'
  return errors
}

function isValidUrl(s: string): boolean {
  try { new URL(s); return true } catch { return false }
}

export function ContributeForm() {
  const [form, setForm] = useState<FormData>(INITIAL)
  const [avisHovered, setAvisHovered] = useState(0)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [status, setStatus] = useState<Status>('idle')
  const [serverError, setServerError] = useState('')
  const [prUrl, setPrUrl] = useState('')

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => { const e = { ...prev }; delete e[field]; return e })
  }

  function handleDepartementChange(nom: string) {
    const region = DEPT_TO_REGION[nom] ?? ''
    setForm((prev) => ({ ...prev, departement: nom, region }))
    if (errors.departement) setErrors((prev) => { const e = { ...prev }; delete e.departement; return e })
    if (region && errors.region) setErrors((prev) => { const e = { ...prev }; delete e.region; return e })
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
          departement: form.departement,
          region: form.region,
          latitude: form.latitude ? parseFloat(form.latitude) : undefined,
          longitude: form.longitude ? parseFloat(form.longitude) : undefined,
          accessibilites: form.accessibilites,
          photo: form.photo.trim() || undefined,
          noteContributeur: form.noteContributeur.trim() || undefined,
          premierAvisNote: form.premierAvisNote || undefined,
          premierAvisAuteur: form.premierAvisAuteur.trim() || undefined,
          premierAvisCommentaire: form.premierAvisCommentaire.trim() || undefined,
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

  const avisDisplay = avisHovered > 0 ? avisHovered : form.premierAvisNote

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
            <select
              id="cf-departement"
              value={form.departement}
              onChange={(e) => handleDepartementChange(e.target.value)}
              className={inputClass('departement')}
            >
              <option value="">— Sélectionner —</option>
              {DEPARTEMENTS.map((d) => (
                <option key={d.code} value={d.nom}>{d.code} — {d.nom}</option>
              ))}
            </select>
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
            {form.region && !errors.region && (
              <p className="text-xs text-green-600 mt-1">Auto-rempli depuis le département.</p>
            )}
          </div>
        </div>
      </section>

      {/* Section : Localisation */}
      <section className="bg-white rounded-2xl border border-sable-fonce p-6">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="font-bold text-ardoise text-lg">Coordonnées GPS</h2>
          <span className="text-xs bg-sable text-ardoise-clair px-2 py-0.5 rounded-full">optionnel</span>
        </div>
        <p className="text-ardoise-clair text-xs mb-4">
          Si vous les connaissez, trouvez-les sur{' '}
          <a
            href="https://www.openstreetmap.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ocean hover:underline"
          >
            OpenStreetMap
          </a>{' '}
          (clic droit → &quot;Afficher l&apos;adresse&quot;). Sinon, elles seront complétées lors de la vérification.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="cf-latitude" className="block text-sm font-semibold text-ardoise mb-1">
              Latitude
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
              Longitude
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

      {/* Section : Premier avis — mise en avant */}
      <section className="bg-ocean-pale rounded-2xl border-2 border-ocean p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl" aria-hidden="true">⭐</span>
          <h2 className="font-bold text-ardoise text-lg">Votre premier avis</h2>
          <span className="text-xs bg-ocean text-white px-2 py-0.5 rounded-full font-semibold">mis en avant à l&apos;import</span>
        </div>
        <p className="text-ardoise-clair text-sm mb-5">
          Vous avez visité cette plage ? Partagez votre expérience — votre avis sera publié en premier
          dès que la plage sera validée et importée sur le site.
        </p>

        <div className="space-y-4">
          {/* Note */}
          <fieldset>
            <legend className="text-sm font-semibold text-ardoise mb-2">
              Note <span className="text-ardoise-clair font-normal">(optionnel)</span>
            </legend>
            <div className="flex gap-1" role="group" aria-label="Choisir une note de 1 à 5">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, premierAvisNote: prev.premierAvisNote === i ? 0 : i }))}
                  onMouseEnter={() => setAvisHovered(i)}
                  onMouseLeave={() => setAvisHovered(0)}
                  aria-label={`${i} étoile${i > 1 ? 's' : ''} sur 5`}
                  aria-pressed={form.premierAvisNote === i}
                  className="text-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean rounded transition-transform hover:scale-110"
                >
                  <span aria-hidden="true">{i <= avisDisplay ? '★' : '☆'}</span>
                </button>
              ))}
              {form.premierAvisNote > 0 && (
                <span className="text-sm text-ardoise-clair self-center ml-2">{form.premierAvisNote}/5</span>
              )}
            </div>
          </fieldset>

          <div>
            <label htmlFor="cf-avis-auteur" className="block text-sm font-semibold text-ardoise mb-1">
              Votre prénom <span className="text-ardoise-clair font-normal">(optionnel)</span>
            </label>
            <input
              id="cf-avis-auteur"
              type="text"
              value={form.premierAvisAuteur}
              onChange={(e) => set('premierAvisAuteur', e.target.value)}
              maxLength={100}
              placeholder="Ex : Marie"
              className="w-full border border-ocean/40 rounded-lg px-3 py-2 text-sm text-ardoise placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ocean bg-white"
            />
          </div>

          <div>
            <label htmlFor="cf-avis-commentaire" className="block text-sm font-semibold text-ardoise mb-1">
              Commentaire <span className="text-ardoise-clair font-normal">(optionnel)</span>
            </label>
            <textarea
              id="cf-avis-commentaire"
              value={form.premierAvisCommentaire}
              onChange={(e) => set('premierAvisCommentaire', e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Décrivez votre expérience, l'accessibilité observée, les points forts…"
              className="w-full border border-ocean/40 rounded-lg px-3 py-2 text-sm text-ardoise placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ocean bg-white resize-y"
            />
            <p className="text-xs text-ardoise-clair text-right mt-0.5">
              {form.premierAvisCommentaire.length}/2000
            </p>
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

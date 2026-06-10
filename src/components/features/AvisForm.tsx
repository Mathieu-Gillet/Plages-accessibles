'use client'

import { useState } from 'react'

interface AvisFormProps {
  slug: string
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export function AvisForm({ slug }: AvisFormProps) {
  const [note, setNote] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [auteur, setAuteur] = useState('')
  const [commentaire, setCommentaire] = useState('')
  const [website, setWebsite] = useState('') // honeypot — humans never see this field
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [prUrl, setPrUrl] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (note === 0) return

    setStatus('loading')
    setErrorMessage('')

    try {
      const res = await fetch('/api/avis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          note,
          auteur: auteur.trim() || undefined,
          commentaire: commentaire.trim() || undefined,
          website: website || undefined,
        }),
      })

      const data = await res.json().catch(() => ({})) as { prUrl?: string; error?: string }

      if (!res.ok) throw new Error(data.error ?? 'Erreur réseau')

      setPrUrl(data.prUrl ?? '')
      setStatus('success')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Une erreur est survenue')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div
        role="alert"
        className="bg-green-50 border border-green-200 rounded-xl p-5 text-center"
      >
        <p className="text-green-800 font-semibold text-lg mb-1">Merci pour votre retour !</p>
        <p className="text-green-700 text-sm">
          Votre avis a bien été transmis : une proposition de publication a été créée
          automatiquement. Il apparaîtra sur cette page après vérification.
        </p>
        {prUrl && (
          <a
            href={prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 text-sm font-semibold text-green-800 underline hover:no-underline"
          >
            Suivre la proposition sur GitHub ↗
          </a>
        )}
      </div>
    )
  }

  const displayNote = hovered > 0 ? hovered : note

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Honeypot anti-spam : caché aux humains et aux lecteurs d'écran */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-0 overflow-hidden">
        <label htmlFor="avis-website">Ne pas remplir ce champ</label>
        <input
          id="avis-website"
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* Note */}
      <fieldset className="mb-4">
        <legend className="text-sm font-semibold text-ardoise mb-2">
          Note <span className="text-red-500" aria-hidden="true">*</span>
        </legend>
        <div className="flex gap-1" role="group" aria-label="Choisir une note de 1 à 5">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setNote(i)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(0)}
              aria-label={`${i} étoile${i > 1 ? 's' : ''} sur 5`}
              aria-pressed={note === i}
              className="text-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean rounded transition-transform hover:scale-110"
            >
              <span aria-hidden="true">
                {i <= displayNote ? '★' : '☆'}
              </span>
            </button>
          ))}
        </div>
        {note === 0 && status !== 'idle' && (
          <p className="text-red-600 text-xs mt-1">Veuillez sélectionner une note.</p>
        )}
      </fieldset>

      {/* Auteur */}
      <div className="mb-4">
        <label htmlFor="avis-auteur" className="block text-sm font-semibold text-ardoise mb-1">
          Votre prénom <span className="text-ardoise-clair font-normal">(optionnel)</span>
        </label>
        <input
          id="avis-auteur"
          type="text"
          value={auteur}
          onChange={(e) => setAuteur(e.target.value)}
          maxLength={100}
          placeholder="Ex : Marie"
          className="w-full border border-sable-fonce rounded-lg px-3 py-2 text-sm text-ardoise placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ocean"
        />
      </div>

      {/* Commentaire */}
      <div className="mb-5">
        <label htmlFor="avis-commentaire" className="block text-sm font-semibold text-ardoise mb-1">
          Commentaire <span className="text-ardoise-clair font-normal">(optionnel)</span>
        </label>
        <textarea
          id="avis-commentaire"
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Décrivez votre expérience sur cette plage…"
          className="w-full border border-sable-fonce rounded-lg px-3 py-2 text-sm text-ardoise placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ocean resize-y"
        />
        <p className="text-xs text-ardoise-clair text-right mt-0.5">
          {commentaire.length}/2000
        </p>
      </div>

      {/* Erreur */}
      {status === 'error' && (
        <p role="alert" className="text-red-600 text-sm mb-4">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={note === 0 || status === 'loading'}
        className="bg-ocean text-white font-bold px-5 py-2 rounded-lg text-sm hover:bg-ocean-clair transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? 'Envoi en cours…' : 'Envoyer mon avis'}
      </button>
    </form>
  )
}

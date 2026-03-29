'use client'
// src/components/features/AvisSection.tsx
import { useState } from 'react'
import type { Avis } from '@/types'
import { formatNote } from '@/lib/utils'

interface AvisSectionProps {
  plageId: string
  avis: Avis[]
}

export function AvisSection({ plageId, avis: avisInitiaux }: AvisSectionProps) {
  const [avis, setAvis] = useState(avisInitiaux)
  const [note, setNote] = useState(0)
  const [commentaire, setCommentaire] = useState('')
  const [auteur, setAuteur] = useState('')
  const [envoi, setEnvoi] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')

  async function soumettre(e: React.FormEvent) {
    e.preventDefault()
    if (note === 0) return

    setEnvoi('loading')
    try {
      const res = await fetch(`/api/plages/${plageId}/avis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note, commentaire, auteur }),
      })
      if (!res.ok) throw new Error()
      const nouvelAvis = await res.json()
      setAvis([nouvelAvis, ...avis])
      setNote(0)
      setCommentaire('')
      setAuteur('')
      setEnvoi('ok')
    } catch {
      setEnvoi('error')
    }
  }

  return (
    <section aria-labelledby="titre-avis" className="mt-12">
      <h2 id="titre-avis" className="text-2xl font-bold text-ardoise mb-6">
        💬 Avis ({avis.length})
      </h2>

      {/* Liste des avis */}
      {avis.length > 0 ? (
        <ul className="space-y-4 mb-10" role="list">
          {avis.map((a) => (
            <li key={a.id} className="bg-white rounded-xl p-4 border border-sable-fonce">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-ardoise">{a.auteur ?? 'Anonyme'}</span>
                <span
                  className="text-yellow-500 font-bold text-sm"
                  aria-label={`Note : ${a.note} sur 5`}
                >
                  {'★'.repeat(a.note)}{'☆'.repeat(5 - a.note)}
                </span>
              </div>
              {a.commentaire && (
                <p className="text-ardoise-clair text-sm">{a.commentaire}</p>
              )}
              <p className="text-xs text-ardoise-clair mt-2">
                {new Date(a.date).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ardoise-clair mb-8">Aucun avis pour l&apos;instant. Soyez le premier !</p>
      )}

      {/* Formulaire */}
      <div className="bg-sable rounded-2xl p-6 border border-sable-fonce">
        <h3 className="font-bold text-ardoise text-lg mb-4">Laisser un avis</h3>
        <form onSubmit={soumettre} noValidate>
          {/* Note */}
          <fieldset className="mb-4">
            <legend className="text-sm font-semibold text-ardoise mb-2">
              Votre note <span aria-hidden="true">*</span>
              <span className="sr-only">(obligatoire)</span>
            </legend>
            <div className="flex gap-2" role="group">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNote(n)}
                  className={`text-2xl transition-transform hover:scale-110 ${
                    n <= note ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                  aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
                  aria-pressed={n === note}
                >
                  ★
                </button>
              ))}
            </div>
          </fieldset>

          {/* Auteur */}
          <div className="mb-3">
            <label htmlFor="avis-auteur" className="block text-sm font-semibold text-ardoise mb-1">
              Votre prénom (facultatif)
            </label>
            <input
              id="avis-auteur"
              type="text"
              value={auteur}
              onChange={(e) => setAuteur(e.target.value)}
              maxLength={50}
              className="w-full border border-sable-fonce rounded-lg px-3 py-2 text-sm text-ardoise focus:outline-none focus:border-ocean"
            />
          </div>

          {/* Commentaire */}
          <div className="mb-4">
            <label htmlFor="avis-commentaire" className="block text-sm font-semibold text-ardoise mb-1">
              Votre commentaire (facultatif)
            </label>
            <textarea
              id="avis-commentaire"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full border border-sable-fonce rounded-lg px-3 py-2 text-sm text-ardoise focus:outline-none focus:border-ocean resize-none"
              placeholder="Décrivez votre expérience sur cette plage…"
            />
          </div>

          <button
            type="submit"
            disabled={note === 0 || envoi === 'loading'}
            className="bg-ocean text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-ocean-clair transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {envoi === 'loading' ? 'Envoi…' : 'Publier mon avis'}
          </button>

          {envoi === 'ok' && (
            <p className="mt-3 text-vert-accessible font-semibold text-sm" role="status">
              ✅ Votre avis a bien été publié, merci !
            </p>
          )}
          {envoi === 'error' && (
            <p className="mt-3 text-red-600 font-semibold text-sm" role="alert">
              Une erreur est survenue. Veuillez réessayer.
            </p>
          )}
        </form>
      </div>
    </section>
  )
}

'use client'
// src/components/features/VoteForm.tsx
// Vote communautaire : note d'accessibilité + validation des équipements
// annoncés + commentaire optionnel. Remplace l'ancien AvisForm, qui ouvrait une
// Pull Request GitHub par avis.
import { useState } from 'react'
import {
  LABELS_ACCESSIBILITE,
  ICONES_ACCESSIBILITE,
  SEUIL_VOTES,
  type StatutEquipement,
  type TypeAccessibilite,
} from '@/types'

interface VoteFormProps {
  slug: string
  /** Équipements annoncés par la fiche — seuls ceux-là sont validables. */
  equipements: TypeAccessibilite[]
}

type Status = 'idle' | 'loading' | 'success' | 'error'

interface Resultat {
  nombreVotes: number
  seuil: number
  seuilAtteint: boolean
  commentaireEnModeration: boolean
}

const CHOIX: { valeur: StatutEquipement; label: string }[] = [
  { valeur: 'vu', label: 'Vu sur place' },
  { valeur: 'absent', label: 'Absent' },
  { valeur: 'inconnu', label: 'Je ne sais pas' },
]

export function VoteForm({ slug, equipements }: VoteFormProps) {
  const [note, setNote] = useState(0)
  const [hovered, setHovered] = useState(0)
  // Par défaut « inconnu » : on n'attribue jamais au visiteur une confirmation
  // qu'il n'a pas donnée.
  const [statuts, setStatuts] = useState<Record<string, StatutEquipement>>({})
  const [auteur, setAuteur] = useState('')
  const [commentaire, setCommentaire] = useState('')
  const [website, setWebsite] = useState('') // honeypot — invisible aux humains
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [resultat, setResultat] = useState<Resultat | null>(null)

  function setStatut(type: TypeAccessibilite, valeur: StatutEquipement) {
    setStatuts((prev) => ({ ...prev, [type]: valeur }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (note === 0) return

    setStatus('loading')
    setErrorMessage('')

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          note,
          equipements: statuts,
          auteur: auteur.trim() || undefined,
          commentaire: commentaire.trim() || undefined,
          website: website || undefined,
        }),
      })

      const data = (await res.json().catch(() => ({}))) as Partial<Resultat> & {
        error?: string
      }

      if (!res.ok) throw new Error(data.error ?? 'Erreur réseau')

      setResultat({
        nombreVotes: data.nombreVotes ?? 0,
        seuil: data.seuil ?? SEUIL_VOTES,
        seuilAtteint: data.seuilAtteint ?? false,
        commentaireEnModeration: data.commentaireEnModeration ?? false,
      })
      setStatus('success')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Une erreur est survenue')
      setStatus('error')
    }
  }

  if (status === 'success' && resultat) {
    const restants = Math.max(0, resultat.seuil - resultat.nombreVotes)
    return (
      <div
        role="alert"
        className="bg-green-50 border border-green-200 rounded-xl p-5 text-center"
      >
        <p className="text-green-800 font-semibold text-lg mb-1">
          Merci, votre vote est enregistré !
        </p>
        <p className="text-green-900 text-sm">
          {resultat.seuilAtteint
            ? `Cette plage totalise ${resultat.nombreVotes} votes : sa note moyenne est publiée sur le site et sur la carte.`
            : `Cette plage totalise ${resultat.nombreVotes} vote${resultat.nombreVotes > 1 ? 's' : ''} sur les ${resultat.seuil} nécessaires. Encore ${restants} et sa note moyenne sera visible de tous.`}
        </p>
        {resultat.commentaireEnModeration && (
          <p className="text-green-900 text-sm mt-2">
            Votre commentaire sera publié après une relecture rapide. Votre note,
            elle, compte déjà.
          </p>
        )}
      </div>
    )
  }

  const displayNote = hovered > 0 ? hovered : note

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Honeypot anti-spam : caché aux humains et aux lecteurs d'écran */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-0 overflow-hidden">
        <label htmlFor="vote-website">Ne pas remplir ce champ</label>
        <input
          id="vote-website"
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* Note */}
      <fieldset className="mb-6">
        <legend className="text-sm font-semibold text-ardoise mb-1">
          Votre note d&apos;accessibilité <span className="text-red-600" aria-hidden="true">*</span>
        </legend>
        <p className="text-xs text-ardoise-clair mb-2">
          De 1 (accès très difficile) à 5 (accès très facile), tel que vous
          l&apos;avez constaté sur place.
        </p>
        <div
          className="flex gap-1"
          role="radiogroup"
          aria-label="Choisir une note de 1 à 5"
          aria-required="true"
          aria-invalid={note === 0 && status !== 'idle'}
          aria-describedby="vote-note-error"
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              onClick={() => setNote(i)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(0)}
              aria-label={`${i} étoile${i > 1 ? 's' : ''} sur 5`}
              aria-checked={note === i}
              className="text-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean rounded transition-transform hover:scale-110"
            >
              <span aria-hidden="true">{i <= displayNote ? '★' : '☆'}</span>
            </button>
          ))}
        </div>
        <p id="vote-note-error" className="text-red-600 text-xs mt-1" aria-live="assertive">
          {note === 0 && status !== 'idle' ? 'Veuillez sélectionner une note.' : ''}
        </p>
      </fieldset>

      {/* Validation des équipements annoncés */}
      {equipements.length > 0 && (
        <fieldset className="mb-6">
          <legend className="text-sm font-semibold text-ardoise mb-1">
            Les équipements annoncés étaient-ils là ?
          </legend>
          <p className="text-xs text-ardoise-clair mb-3">
            Facultatif — ne répondez que pour ce que vous avez réellement vu.
          </p>

          <ul className="space-y-2" role="list">
            {equipements.map((type) => (
              <li
                key={type}
                className="bg-white border border-sable-fonce rounded-lg px-3 py-2 sm:flex sm:items-center sm:justify-between sm:gap-3"
              >
                {/* Le groupe de radios est étiqueté par le nom de l'équipement :
                    le lecteur d'écran l'annonce avant les trois choix. */}
                <span
                  id={`eq-label-${type}`}
                  className="block text-sm font-semibold text-ardoise mb-1.5 sm:mb-0 sm:flex-1 sm:min-w-0"
                >
                  <span aria-hidden="true">{ICONES_ACCESSIBILITE[type]}</span>{' '}
                  {LABELS_ACCESSIBILITE[type]}
                </span>

                <span
                  role="radiogroup"
                  aria-labelledby={`eq-label-${type}`}
                  className="flex flex-wrap gap-x-4 gap-y-1 shrink-0"
                >
                  {CHOIX.map(({ valeur, label }) => {
                    const id = `eq-${type}-${valeur}`
                    return (
                      <span key={valeur} className="inline-flex items-center gap-1.5">
                        <input
                          id={id}
                          type="radio"
                          name={`eq-${type}`}
                          value={valeur}
                          checked={(statuts[type] ?? 'inconnu') === valeur}
                          onChange={() => setStatut(type, valeur)}
                          className="accent-ocean focus-visible:ring-2 focus-visible:ring-ocean"
                        />
                        <label htmlFor={id} className="text-xs text-ardoise-clair">
                          {label}
                        </label>
                      </span>
                    )
                  })}
                </span>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      {/* Auteur */}
      <div className="mb-4">
        <label htmlFor="vote-auteur" className="block text-sm font-semibold text-ardoise mb-1">
          Votre prénom <span className="text-ardoise-clair font-normal">(optionnel)</span>
        </label>
        <input
          id="vote-auteur"
          type="text"
          value={auteur}
          onChange={(e) => setAuteur(e.target.value)}
          maxLength={100}
          placeholder="Ex : Marie"
          className="w-full border border-sable-fonce rounded-lg px-3 py-2 text-sm text-ardoise placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-ocean"
        />
      </div>

      {/* Commentaire */}
      <div className="mb-5">
        <label htmlFor="vote-commentaire" className="block text-sm font-semibold text-ardoise mb-1">
          Commentaire <span className="text-ardoise-clair font-normal">(optionnel)</span>
        </label>
        <textarea
          id="vote-commentaire"
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Décrivez votre expérience sur cette plage…"
          aria-describedby="vote-commentaire-aide"
          className="w-full border border-sable-fonce rounded-lg px-3 py-2 text-sm text-ardoise placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-ocean resize-y"
        />
        <p id="vote-commentaire-aide" className="text-xs text-ardoise-clair mt-0.5">
          Publié après relecture. {commentaire.length}/2000
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
        className="bg-ocean text-white font-bold px-5 py-2 rounded-lg text-sm hover:bg-ocean-fonce transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? 'Envoi en cours…' : 'Envoyer mon vote'}
      </button>
    </form>
  )
}

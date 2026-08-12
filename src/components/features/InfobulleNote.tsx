import { Info } from 'lucide-react'
import { SEUIL_VOTES } from '@/types'

// Les couleurs reprennent celles des marqueurs de la carte, pour que la légende
// et la carte racontent la même histoire.
const TRANCHES = [
  { couleur: '#4ade80', label: '4.5 – 5', desc: 'Accès jugé très facile par les visiteurs' },
  { couleur: '#7dd3fc', label: '3.5 – 4.4', desc: 'Accès jugé satisfaisant' },
  { couleur: '#fcd34d', label: '2 – 3.4', desc: 'Accès jugé difficile par endroits' },
  { couleur: '#e2e8f0', label: '< 2', desc: 'Accès jugé très difficile' },
]

export function InfobulleNote() {
  return (
    <div className="relative group inline-flex items-center">
      <button
        type="button"
        aria-label="Comprendre la note d'accessibilité"
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full"
      >
        <Info size={14} className="opacity-70 group-hover:opacity-100 transition-opacity" />
      </button>

      {/* Tooltip */}
      <div
        role="tooltip"
        className="
          absolute bottom-full right-0 mb-2 w-72
          bg-ardoise text-white text-xs rounded-xl p-3 shadow-2xl
          invisible opacity-0
          group-hover:visible group-hover:opacity-100
          group-focus-within:visible group-focus-within:opacity-100
          transition-opacity duration-150 pointer-events-none z-50
        "
      >
        <p className="font-bold mb-1.5">D&apos;où vient cette note ?</p>
        <p className="text-white/80 mb-2 leading-relaxed">
          Elle est donnée par les visiteurs : chacun note de 1 à 5 la facilité
          d&apos;accès qu&apos;il a réellement constatée sur place. La moyenne
          n&apos;est publiée qu&apos;à partir de {SEUIL_VOTES} votes, pour
          qu&apos;elle veuille dire quelque chose.
        </p>
        <ul className="space-y-1.5">
          {TRANCHES.map(({ couleur, label, desc }) => (
            <li key={label} className="flex gap-2">
              <span className="font-bold shrink-0 w-14" style={{ color: couleur }}>
                ★ {label}
              </span>
              <span className="text-white/90">{desc}</span>
            </li>
          ))}
        </ul>
        {/* Flèche */}
        <div className="absolute top-full right-3 border-[5px] border-transparent border-t-ardoise" />
      </div>
    </div>
  )
}

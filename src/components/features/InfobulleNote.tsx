import { Info } from 'lucide-react'

const TRANCHES = [
  { couleur: '#16a34a', label: '4.5 – 5', desc: 'Très bien équipée — Tiralo, Hippocampe, personnel formé, accès facilité…' },
  { couleur: '#0077b6', label: '3.5 – 4.4', desc: 'Bien équipée — équipements essentiels présents' },
  { couleur: '#f59e0b', label: '2 – 3.4', desc: 'Accessibilité de base — quelques équipements recensés' },
  { couleur: '#9ca3af', label: '< 2', desc: 'Peu équipée — données limitées' },
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
        <p className="font-bold mb-1.5">Comment est calculée la note ?</p>
        <p className="text-white/70 mb-2 leading-relaxed">
          Elle mesure le niveau d&apos;équipement PMR de la plage, de 0 à 5, selon le nombre et la qualité des aménagements accessibles recensés.
        </p>
        <ul className="space-y-1.5">
          {TRANCHES.map(({ couleur, label, desc }) => (
            <li key={label} className="flex gap-2">
              <span className="font-bold shrink-0 w-14" style={{ color: couleur }}>
                ★ {label}
              </span>
              <span className="text-white/80">{desc}</span>
            </li>
          ))}
        </ul>
        {/* Flèche */}
        <div className="absolute top-full right-3 border-[5px] border-transparent border-t-ardoise" />
      </div>
    </div>
  )
}

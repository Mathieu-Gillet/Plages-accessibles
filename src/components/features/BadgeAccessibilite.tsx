// src/components/features/BadgeAccessibilite.tsx
import { LABELS_ACCESSIBILITE, ICONES_ACCESSIBILITE, type TypeAccessibilite } from '@/types'
import { cn } from '@/lib/utils'

interface BadgeAccessibiliteProps {
  type: TypeAccessibilite
  details?: string
  taille?: 'sm' | 'md'
}

export function BadgeAccessibilite({
  type,
  details,
  taille = 'md',
}: BadgeAccessibiliteProps) {
  const label = LABELS_ACCESSIBILITE[type]
  const icone = ICONES_ACCESSIBILITE[type]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold bg-vert-pale text-vert-accessible border border-green-200',
        taille === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5'
      )}
      title={details ?? label}
      role="img"
      aria-label={`Équipement disponible : ${label}${details ? ` — ${details}` : ''}`}
    >
      <span aria-hidden="true">{icone}</span>
      {label}
    </span>
  )
}

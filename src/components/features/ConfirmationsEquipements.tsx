// src/components/features/ConfirmationsEquipements.tsx
// Retours des visiteurs sur les équipements annoncés par la fiche.
// C'est le cœur de l'intérêt du mode communautaire : les équipements viennent
// de sources externes (Handiplage, OSM, DataTourisme) parfois périmées, et seuls
// les visiteurs peuvent dire ce qui est réellement là.
import { AlertTriangle, Check } from 'lucide-react'
import { LABELS_ACCESSIBILITE, type ConfirmationEquipement, type TypeAccessibilite } from '@/types'

interface Props {
  declares: TypeAccessibilite[]
  confirmations: Map<TypeAccessibilite, ConfirmationEquipement>
}

function pluriel(n: number, mot: string): string {
  return `${n} ${mot}${n > 1 ? 's' : ''}`
}

export function ConfirmationsEquipements({ declares, confirmations }: Props) {
  const avecRetour = declares
    .map((type) => confirmations.get(type))
    .filter((c): c is ConfirmationEquipement => Boolean(c && c.confirmations + c.infirmations > 0))

  if (avecRetour.length === 0) {
    return (
      <p className="text-sm text-ardoise-clair mt-4">
        Aucun visiteur n&apos;a encore confirmé ces équipements. Si vous êtes allé
        sur place, votre retour ci-dessous fiabilisera la fiche.
      </p>
    )
  }

  return (
    <div className="mt-5">
      <h3 className="text-sm font-bold text-ardoise mb-2">
        Vérifié par les visiteurs
      </h3>
      <ul className="space-y-1.5" role="list">
        {avecRetour.map((c) => {
          // Autant ou plus d'infirmations que de confirmations : l'information
          // est contestée, on le dit plutôt que de trancher à leur place.
          const contested = c.infirmations > 0 && c.infirmations >= c.confirmations
          return (
            <li key={c.type} className="flex items-start gap-2 text-sm">
              {contested ? (
                <AlertTriangle
                  size={15}
                  className="text-amber-700 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
              ) : (
                <Check
                  size={15}
                  className="text-vert-accessible shrink-0 mt-0.5"
                  aria-hidden="true"
                />
              )}
              <span>
                <span className="font-semibold text-ardoise">
                  {LABELS_ACCESSIBILITE[c.type]}
                </span>
                {' — '}
                <span className={contested ? 'text-amber-700' : 'text-vert-accessible'}>
                  {c.confirmations > 0
                    ? `confirmé par ${pluriel(c.confirmations, 'visiteur')}`
                    : 'non confirmé'}
                  {c.infirmations > 0 &&
                    `, signalé absent par ${pluriel(c.infirmations, 'visiteur')}`}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

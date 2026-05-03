import Link from 'next/link'
import { ContributeForm } from '@/components/features/ContributeForm'

export const metadata = {
  title: 'Suggérer une plage accessible',
  description:
    'Proposez une nouvelle plage accessible aux personnes en situation de handicap. Toutes les contributions sont publiques et révisées.',
}

export default function PageContribuer() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-ardoise mb-2">
        Suggérer une plage
      </h1>
      <p className="text-ardoise-clair mb-8">
        Vous connaissez une plage accessible non référencée ? Remplissez le formulaire
        ci-dessous — une proposition sera automatiquement créée pour révision.
      </p>

      <ContributeForm />

      <p className="mt-8 text-center text-sm text-ardoise-clair">
        <Link href="/" className="text-ocean hover:underline">
          ← Retour à l&apos;accueil
        </Link>
      </p>
    </div>
  )
}

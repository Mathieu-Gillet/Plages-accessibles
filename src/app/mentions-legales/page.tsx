// src/app/mentions-legales/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Mentions légales du site Plages Accessibles : éditeur, hébergement, données personnelles et propriété intellectuelle.',
}

export default function PageMentionsLegales() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-14">
      <h1 className="text-3xl font-extrabold text-ardoise mb-8">Mentions légales</h1>

      <div className="space-y-8 text-ardoise-clair leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-ardoise mb-3">Éditeur du site</h2>
          <p>
            <strong>Plages Accessibles</strong> est un projet collaboratif open source, à but
            non lucratif, qui recense les plages françaises accessibles aux personnes en
            situation de handicap. Le code source et le contenu sont publics et consultables
            sur{' '}
            <a
              href="https://github.com/Mathieu-Gillet/Plages-accessibles"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ocean hover:underline"
            >
              GitHub
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ardoise mb-3">Hébergement</h2>
          <p>
            Le site est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723,
            États-Unis —{' '}
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ocean hover:underline"
            >
              vercel.com
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ardoise mb-3">Données personnelles</h2>
          <p>
            Le site ne crée pas de compte utilisateur et ne dépose pas de cookie de suivi
            publicitaire. Les informations transmises via les formulaires (avis, suggestion
            de plage) sont utilisées uniquement pour modérer et publier les contributions.
            Les contributions acceptées sont publiées publiquement sur GitHub, comme indiqué
            sur chaque formulaire. Des mesures d&apos;audience anonymisées (Vercel Analytics)
            sont collectées sans cookie.
          </p>
          <p className="mt-2">
            Pour exercer vos droits d&apos;accès, de rectification ou de suppression (RGPD),
            utilisez la page <Link href="/contact" className="text-ocean hover:underline">Contact</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ardoise mb-3">Propriété intellectuelle</h2>
          <p>
            Le code source du site est distribué sous licence MIT. Les photos proviennent de
            sources libres de droits (principalement Wikimedia Commons) et restent soumises à
            leurs licences respectives. Les fonds de carte sont fournis par les contributeurs
            d&apos;OpenStreetMap (licence ODbL).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ardoise mb-3">Responsabilité</h2>
          <p>
            Les informations d&apos;accessibilité sont collectées de manière collaborative et
            vérifiées au mieux de nos moyens, mais peuvent évoluer (saisonnalité des
            équipements, travaux…). Vérifiez toujours auprès de la commune ou du poste de
            secours avant votre déplacement. Si vous constatez une erreur,{' '}
            <Link href="/contact" className="text-ocean hover:underline">signalez-la nous</Link>.
          </p>
        </section>
      </div>
    </div>
  )
}

// src/app/confidentialite/page.tsx
// Politique de confidentialité — exigée par Google Play pour publier
// l'application Android, qui demande la localisation et peut envoyer des photos.
// L'URL de cette page est celle à renseigner dans la fiche Play Console.
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description:
    'Données collectées par le site et l’application mobile Plages Accessibles : localisation, votes, photos. Aucune publicité, aucun traceur, aucune revente.',
}

export default function PageConfidentialite() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-14">
      <h1 className="text-3xl font-extrabold text-ardoise mb-2">
        Politique de confidentialité
      </h1>
      <p className="text-ardoise-clair mb-8">
        Applicable au site plages-accessibles.fr et à l’application mobile Android.
      </p>

      <div className="space-y-8 text-ardoise-clair leading-relaxed">
        <section className="bg-ocean-pale rounded-2xl p-6">
          <h2 className="text-xl font-bold text-ardoise mb-3">En résumé</h2>
          <p>
            Plages Accessibles ne demande aucun compte, n’affiche aucune publicité et ne
            revend rien. Aucune donnée permettant de vous identifier n’est conservée : les
            votes et les photos sont rattachés à un identifiant anonyme, haché avant d’être
            stocké. La localisation, elle, ne quitte jamais votre téléphone.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ardoise mb-3">Responsable du traitement</h2>
          <p>
            Plages Accessibles, projet associatif open source. Contact :{' '}
            <Link href="/contact" className="text-ocean hover:underline">
              page contact
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ardoise mb-3">
            Localisation (application mobile)
          </h2>
          <p>
            L’application peut demander l’accès à votre position approximative, uniquement
            lorsque vous touchez « Autour de vous » ou « Utiliser ma position actuelle ».
            Elle sert à deux choses, calculées <strong>sur l’appareil</strong> : trier les
            plages par distance et afficher « à 1,2 km ».
          </p>
          <p className="mt-3">
            Votre position n’est <strong>ni enregistrée, ni transmise à un serveur</strong>,
            ni associée à vos votes. Refuser la permission n’enlève rien d’autre que ces deux
            fonctions ; le catalogue des plages reste entièrement consultable, y compris hors
            connexion.
          </p>
          <p className="mt-3">
            Seule exception, à votre initiative : si vous proposez une nouvelle plage et
            touchez « Utiliser ma position actuelle », les coordonnées sont incluses dans la
            proposition — c’est précisément leur objet, situer la plage sur la carte.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ardoise mb-3">Votes et commentaires</h2>
          <p>
            Lorsque vous notez une plage, sont enregistrés : la note, les équipements que
            vous confirmez ou signalez absents, votre commentaire s’il y en a un, et le
            prénom que vous choisissez éventuellement d’indiquer.
          </p>
          <p className="mt-3">
            Pour empêcher qu’un même appareil vote plusieurs fois sur la même plage, un
            identifiant aléatoire est déposé dans un cookie technique
            (<code className="text-sm">pa_votant</code>). Ni cet identifiant ni votre adresse
            IP ne sont conservés en clair : seule leur empreinte cryptographique salée
            (SHA-256) est stockée, ce qui permet la déduplication sans jamais permettre de
            remonter à vous.
          </p>
          <p className="mt-3">
            Les commentaires sont relus avant publication. La note, elle, est comptabilisée
            immédiatement, et une moyenne n’est publiée qu’à partir de cinq votes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ardoise mb-3">Photos</h2>
          <p>
            Les photos que vous envoyez — jointes à un avis, ajoutées à la galerie d’une
            plage ou à une proposition de nouvelle plage — sont stockées chez notre
            hébergeur de fichiers et relues avant d’être publiées. Elles sont ensuite
            visibles publiquement sur le site et dans l’application.
          </p>
          <p className="mt-3">
            L’application redimensionne chaque photo avant l’envoi. Les métadonnées EXIF de
            l’image d’origine, y compris les coordonnées GPS de prise de vue si votre
            appareil les enregistre, ne sont pas transmises : seule l’orientation est lue,
            pour redresser l’image.
          </p>
          <p className="mt-3">
            N’envoyez pas de photo sur laquelle des personnes sont reconnaissables sans leur
            accord. Pour demander le retrait d’une photo, écrivez-nous via la{' '}
            <Link href="/contact" className="text-ocean hover:underline">
              page contact
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ardoise mb-3">Ce que nous ne faisons pas</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Aucun compte utilisateur, aucun mot de passe, aucune adresse e-mail exigée.</li>
            <li>Aucune publicité, aucun traceur publicitaire, aucun profilage.</li>
            <li>Aucune revente ni partage de données à des tiers commerciaux.</li>
            <li>Aucun suivi de votre navigation d’une plage à l’autre.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ardoise mb-3">Sous-traitants</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Vercel</strong> (États-Unis) — hébergement du site et de l’API, mesure
              d’audience agrégée et anonyme.
            </li>
            <li>
              <strong>Supabase</strong> (Union européenne) — base des votes et stockage des
              photos.
            </li>
            <li>
              <strong>OpenStreetMap</strong> — fonds de carte. L’affichage d’une carte
              transmet à ses serveurs les coordonnées de la zone consultée, sans identifiant.
            </li>
            <li>
              <strong>Wikimedia Commons</strong> — photos d’illustration du catalogue.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ardoise mb-3">Vos droits</h2>
          <p>
            Conformément au RGPD, vous disposez d’un droit d’accès, de rectification et
            d’effacement. Les votes étant anonymisés par construction, nous ne pouvons pas
            retrouver « vos » votes à partir de votre identité ; en revanche, tout
            commentaire ou toute photo peut être supprimé sur simple demande via la{' '}
            <Link href="/contact" className="text-ocean hover:underline">
              page contact
            </Link>
            . Vous pouvez également saisir la CNIL.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ardoise mb-3">Suppression des données</h2>
          <p>
            Effacer les données de l’application depuis les réglages Android supprime vos
            favoris, vos « j’aime » et l’identifiant anonyme de votant. Les votes déjà
            déposés restent comptabilisés, puisqu’ils ne sont rattachables à personne — c’est
            la contrepartie assumée de l’anonymat.
          </p>
        </section>
      </div>
    </div>
  )
}

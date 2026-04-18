// src/app/plage/[slug]/page.tsx
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getAllSlugs, getPlageBySlug } from '@/lib/content'
import { BadgeAccessibilite } from '@/components/features/BadgeAccessibilite'
import { CarteDetailPlage } from '@/components/map/CarteDetailPlage'
import { HebergementCard } from '@/components/features/HebergementCard'
import { OffreCulturelleCard } from '@/components/features/OffreCulturelleCard'
import { AvisSection } from '@/components/features/AvisSection'
import { formatNote } from '@/lib/utils'
import { MapPin } from 'lucide-react'

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

export function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Metadata {
  const plage = getPlageBySlug(params.slug)
  if (!plage) return { title: 'Plage introuvable' }

  return {
    title: `${plage.nom} — Plage accessible à ${plage.commune}`,
    description: plage.description ?? `Découvrez les équipements d'accessibilité disponibles sur la plage de ${plage.nom} à ${plage.commune}.`,
    openGraph: {
      images: plage.photo ? [{ url: plage.photo }] : [],
    },
  }
}

export default function PagePlage({ params }: { params: { slug: string } }) {
  const plage = getPlageBySlug(params.slug)
  if (!plage) notFound()

  return (
    <article className="max-w-6xl mx-auto px-4 py-10">
      {/* En-tête */}
      <header className="mb-8">
        {plage.photo && (
          <div className="mb-6">
            <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden bg-ocean-pale shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={plage.photo}
                alt={`Vue de la plage ${plage.nom}`}
                className="w-full h-full object-cover"
                loading="eager"
              />
            </div>

            {plage.photos.length > 0 && (
              <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2" aria-label="Photos supplémentaires">
                {plage.photos.map((url, i) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative h-20 rounded-lg overflow-hidden bg-ocean-pale focus-visible:ring-2 focus-visible:ring-ocean"
                    aria-label={`Photo ${i + 2} de ${plage.nom} (ouvrir en grand, nouvel onglet)`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Photo ${i + 2} de ${plage.nom}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-ardoise">
              {plage.nom}
            </h1>
            <p className="flex items-center gap-1 text-ardoise-clair mt-1">
              <MapPin size={16} aria-hidden="true" />
              {plage.commune} · {plage.departement} · {plage.region}
            </p>
          </div>

          {plage.noteGlobale > 0 && (
            <div
              className="flex flex-col items-center bg-ocean text-white px-5 py-3 rounded-xl"
              aria-label={`Note : ${formatNote(plage.noteGlobale)} sur 5`}
            >
              <span className="text-3xl font-extrabold">{formatNote(plage.noteGlobale)}</span>
              <span className="text-xs opacity-80 mt-1">sur 5</span>
            </div>
          )}
        </div>

        {plage.description && (
          <p className="mt-4 text-ardoise-clair text-lg leading-relaxed">
            {plage.description}
          </p>
        )}
      </header>

      {/* Accessibilités */}
      <section aria-labelledby="titre-accessibilites" className="mb-10">
        <h2 id="titre-accessibilites" className="text-2xl font-bold text-ardoise mb-4">
          ♿ Équipements d&apos;accessibilité
        </h2>
        <div className="flex flex-wrap gap-3">
          {plage.accessibilites.map((type) => (
            <BadgeAccessibilite key={type} type={type} />
          ))}
        </div>
      </section>

      {/* Carte */}
      <section aria-labelledby="titre-carte" className="mb-10">
        <h2 id="titre-carte" className="text-2xl font-bold text-ardoise mb-4">
          📍 Localisation
        </h2>
        <CarteDetailPlage
          latitude={plage.latitude}
          longitude={plage.longitude}
          nom={plage.nom}
          hebergements={plage.hebergements}
          offres={plage.offresCulturelles}
        />
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${plage.latitude},${plage.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-ocean hover:underline font-semibold"
          aria-label={`Ouvrir ${plage.nom} dans Google Maps (nouvel onglet)`}
        >
          Ouvrir dans Google Maps ↗
        </a>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Hébergements */}
        {plage.hebergements.length > 0 && (
          <section aria-labelledby="titre-hebergements">
            <h2 id="titre-hebergements" className="text-2xl font-bold text-ardoise mb-4">
              🏨 Hébergements à proximité
            </h2>
            <ul className="space-y-3" role="list">
              {plage.hebergements.map((h) => (
                <li key={h.id}>
                  <HebergementCard hebergement={h} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Offres culturelles */}
        {plage.offresCulturelles.length > 0 && (
          <section aria-labelledby="titre-culture">
            <h2 id="titre-culture" className="text-2xl font-bold text-ardoise mb-4">
              🎨 À faire à proximité
            </h2>
            <ul className="space-y-3" role="list">
              {plage.offresCulturelles.map((o) => (
                <li key={o.id}>
                  <OffreCulturelleCard offre={o} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Avis */}
      <AvisSection avis={plage.avis} />
    </article>
  )
}

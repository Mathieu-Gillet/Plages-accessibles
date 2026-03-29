// src/app/plage/[slug]/page.tsx
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { BadgeAccessibilite } from '@/components/features/BadgeAccessibilite'
import { CarteDetailPlage } from '@/components/map/CarteDetailPlage'
import { HebergementCard } from '@/components/features/HebergementCard'
import { OffreCulturelleCard } from '@/components/features/OffreCulturelleCard'
import { AvisSection } from '@/components/features/AvisSection'
import { formatNote, etoiles } from '@/lib/utils'
import { MapPin, Star, Users } from 'lucide-react'

async function getPlage(slug: string) {
  try {
    return await prisma.plage.findUnique({
      where: { slug, actif: true },
      include: {
        accessibilites: true,
        hebergements: { orderBy: { distanceKm: 'asc' } },
        offrescultures: { orderBy: { distanceKm: 'asc' } },
        avis: { orderBy: { date: 'desc' }, take: 10 },
      },
    })
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const plage = await getPlage(params.slug)
  if (!plage) return { title: 'Plage introuvable' }

  return {
    title: `${plage.nom} — Plage accessible à ${plage.commune}`,
    description: plage.description ?? `Découvrez les équipements d'accessibilité disponibles sur la plage de ${plage.nom} à ${plage.commune}.`,
    openGraph: {
      images: plage.photo ? [{ url: plage.photo }] : [],
    },
  }
}

export default async function PagePlage({ params }: { params: { slug: string } }) {
  const plage = await getPlage(params.slug)
  if (!plage) notFound()

  return (
    <article className="max-w-6xl mx-auto px-4 py-10">
      {/* En-tête */}
      <header className="mb-8">
        {plage.photo && (
          <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden mb-6 bg-ocean-pale">
            <img
              src={plage.photo}
              alt={`Vue de la plage ${plage.nom}`}
              className="w-full h-full object-cover"
            />
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
              aria-label={`Note : ${formatNote(plage.noteGlobale)} sur 5 basée sur ${plage.nombreAvis} avis`}
            >
              <span className="text-3xl font-extrabold">{formatNote(plage.noteGlobale)}</span>
              <span className="text-yellow-300 text-lg" aria-hidden="true">
                {etoiles(plage.noteGlobale)}
              </span>
              <span className="text-xs opacity-80 mt-1 flex items-center gap-1">
                <Users size={12} aria-hidden="true" /> {plage.nombreAvis} avis
              </span>
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
          {plage.accessibilites.map((a) => (
            <BadgeAccessibilite key={a.id} type={a.type as any} details={a.details ?? undefined} />
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
          offres={plage.offrescultures}
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
        {plage.offrescultures.length > 0 && (
          <section aria-labelledby="titre-culture">
            <h2 id="titre-culture" className="text-2xl font-bold text-ardoise mb-4">
              🎨 À faire à proximité
            </h2>
            <ul className="space-y-3" role="list">
              {plage.offrescultures.map((o) => (
                <li key={o.id}>
                  <OffreCulturelleCard offre={o} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Avis */}
      <AvisSection plageId={plage.id} avis={plage.avis} />
    </article>
  )
}

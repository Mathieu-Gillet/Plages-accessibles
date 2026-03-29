// prisma/seed.ts
// Données d'exemple pour démarrer — à enrichir avec les vraies données

import { PrismaClient, TypeAccessibilite } from '@prisma/client'

const prisma = new PrismaClient()

const plagesData = [
  {
    nom: "Plage du Prado",
    slug: "plage-du-prado-marseille",
    description: "La plus grande plage aménagée de Marseille, avec un accès PMR complet et du matériel amphibie disponible.",
    departement: "Bouches-du-Rhône",
    region: "Provence-Alpes-Côte d'Azur",
    commune: "Marseille",
    codePostal: "13008",
    latitude: 43.2636,
    longitude: 5.3741,
    noteGlobale: 4.5,
    nombreAvis: 42,
    accessibilites: [
      TypeAccessibilite.FAUTEUIL_ROULANT,
      TypeAccessibilite.TIRALO,
      TypeAccessibilite.HIPPOCAMPE,
      TypeAccessibilite.PARKINGS_PMR,
      TypeAccessibilite.SANITAIRES_ADAPTES,
      TypeAccessibilite.CHEMIN_ACCES,
      TypeAccessibilite.SABLE_COMPACT,
      TypeAccessibilite.PERSONNEL_FORME,
      TypeAccessibilite.LOCATION_MATERIEL,
    ]
  },
  {
    nom: "Plage de l'Espiguette",
    slug: "plage-espiguette-le-grau-du-roi",
    description: "Vaste plage naturelle avec tapis d'accès, fauteuils amphibies et parkings adaptés à proximité.",
    departement: "Gard",
    region: "Occitanie",
    commune: "Le Grau-du-Roi",
    codePostal: "30240",
    latitude: 43.4768,
    longitude: 4.1356,
    noteGlobale: 4.2,
    nombreAvis: 28,
    accessibilites: [
      TypeAccessibilite.FAUTEUIL_ROULANT,
      TypeAccessibilite.HIPPOCAMPE,
      TypeAccessibilite.PARKINGS_PMR,
      TypeAccessibilite.CHEMIN_ACCES,
      TypeAccessibilite.SABLE_COMPACT,
    ]
  },
  {
    nom: "Plage de la Baule",
    slug: "plage-la-baule",
    description: "La grande plage de La Baule est réputée pour son accès facilité et ses équipements modernes pour les personnes à mobilité réduite.",
    departement: "Loire-Atlantique",
    region: "Pays de la Loire",
    commune: "La Baule-Escoublac",
    codePostal: "44500",
    latitude: 47.2886,
    longitude: -2.3877,
    noteGlobale: 4.7,
    nombreAvis: 65,
    accessibilites: [
      TypeAccessibilite.FAUTEUIL_ROULANT,
      TypeAccessibilite.TIRALO,
      TypeAccessibilite.HIPPOCAMPE,
      TypeAccessibilite.PARKINGS_PMR,
      TypeAccessibilite.SANITAIRES_ADAPTES,
      TypeAccessibilite.DOUCHES_ACCESSIBLES,
      TypeAccessibilite.CHEMIN_ACCES,
      TypeAccessibilite.RAMPE_ACCES,
      TypeAccessibilite.SABLE_COMPACT,
      TypeAccessibilite.PERSONNEL_FORME,
      TypeAccessibilite.LOCATION_MATERIEL,
    ]
  },
  {
    nom: "Plage de Cabourg",
    slug: "plage-cabourg",
    description: "Plage normande exemplaire en matière d'accessibilité, avec un programme complet Handiplage labellisé.",
    departement: "Calvados",
    region: "Normandie",
    commune: "Cabourg",
    codePostal: "14390",
    latitude: 49.2865,
    longitude: -0.1243,
    noteGlobale: 4.6,
    nombreAvis: 37,
    accessibilites: [
      TypeAccessibilite.FAUTEUIL_ROULANT,
      TypeAccessibilite.TIRALO,
      TypeAccessibilite.PARKINGS_PMR,
      TypeAccessibilite.SANITAIRES_ADAPTES,
      TypeAccessibilite.DOUCHES_ACCESSIBLES,
      TypeAccessibilite.CHEMIN_ACCES,
      TypeAccessibilite.PERSONNEL_FORME,
      TypeAccessibilite.BOUCLE_MAGNETIQUE,
    ]
  },
  {
    nom: "Plage du Lazaret",
    slug: "plage-lazaret-sete",
    description: "Plage calme et aménagée sur l'étang de Thau, idéale pour les personnes à mobilité réduite grâce à ses accès en dur.",
    departement: "Hérault",
    region: "Occitanie",
    commune: "Sète",
    codePostal: "34200",
    latitude: 43.4074,
    longitude: 3.6857,
    noteGlobale: 4.1,
    nombreAvis: 19,
    accessibilites: [
      TypeAccessibilite.FAUTEUIL_ROULANT,
      TypeAccessibilite.PARKINGS_PMR,
      TypeAccessibilite.SANITAIRES_ADAPTES,
      TypeAccessibilite.CHEMIN_ACCES,
      TypeAccessibilite.SABLE_COMPACT,
    ]
  },
]

async function main() {
  console.log('🌊 Démarrage du seed...')

  for (const plageData of plagesData) {
    const { accessibilites, ...plage } = plageData

    const created = await prisma.plage.upsert({
      where: { slug: plage.slug },
      update: {},
      create: {
        ...plage,
        accessibilites: {
          create: accessibilites.map(type => ({
            type,
            disponible: true,
          }))
        },
        hebergements: {
          create: [
            {
              nom: `Hôtel proche de ${plage.nom}`,
              type: 'hôtel',
              adresse: `${plage.codePostal} ${plage.commune}`,
              latitude: plage.latitude + 0.01,
              longitude: plage.longitude + 0.01,
              distanceKm: 0.5,
              accessiblePMR: true,
            }
          ]
        }
      }
    })

    console.log(`✅ Plage créée : ${created.nom}`)
  }

  console.log('🎉 Seed terminé !')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

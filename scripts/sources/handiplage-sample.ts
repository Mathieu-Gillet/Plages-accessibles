// scripts/sources/handiplage-sample.ts
// Curated list of real Handiplage-labelled French beaches NOT already in content/plages/.
// Acts as a working stub for the import pipeline so we have an end-to-end deployable
// loop today. Replace with a live scraper once handiplage.fr exposes a stable endpoint
// (currently their directory is HTML-only).
//
// Each entry mirrors what a real adapter would emit: source-validated data, ready for
// the quality gates in scripts/lib/validate-candidate.ts.
//
// Sources cross-checked: handiplage.fr, tourisme-handicap.gouv.fr, official municipal
// sites. Coordinates rounded to 4 decimals (~10 m precision).

import type { Source } from './types'
import type { Candidate } from '../lib/validate-candidate'

// Editorial rating derived from the Handiplage certification level mentioned in
// each description. Niveau 4 → 4.5★, Niveau 3 → 4.2★, no level → 4.0★.
// Acts as a quality baseline until real user reviews are collected.
//
// Photos use picsum.photos with seed=slug for deterministic placeholder images.
// Replace with real photos (Wikimedia Commons, municipal sources) when available.
function photoFor(slug: string): string {
  return `https://picsum.photos/seed/${slug}/1200/600`
}

const CANDIDATES: Candidate[] = [
  {
    slug: 'plage-centrale-berck-sur-mer',
    noteGlobale: 4.2,
    photo: photoFor('plage-centrale-berck-sur-mer'),
    nom: 'Plage centrale de Berck-sur-Mer',
    description:
      "Vaste plage de sable fin sur la Côte d'Opale, labellisée Handiplage niveau 3. Tiralos et fauteuils Hippocampe disponibles en saison à proximité du poste de secours, parking PMR adjacent et personnel formé à l'accueil des personnes en situation de handicap.",
    commune: 'Berck-sur-Mer',
    codePostal: '62600',
    departement: 'Pas-de-Calais',
    region: 'Hauts-de-France',
    latitude: 50.4045,
    longitude: 1.5635,
    accessibilites: [
      'TIRALO',
      'HIPPOCAMPE',
      'PARKINGS_PMR',
      'SANITAIRES_ADAPTES',
      'PERSONNEL_FORME',
      'CHEMIN_ACCES',
    ],
    verifiedBy: 'handiplage.fr',
  },
  {
    slug: 'plage-le-touquet-paris-plage',
    noteGlobale: 4.5,
    photo: photoFor('plage-le-touquet-paris-plage'),
    nom: 'Grande plage du Touquet-Paris-Plage',
    description:
      "Plage emblématique de la Côte d'Opale, labellisée Handiplage niveau 4 — le plus haut niveau de certification. Cheminement bois jusqu'au sable, tiralos et fauteuils tout-terrain en prêt gratuit, sanitaires et douches adaptés, équipe d'accueil dédiée en saison estivale.",
    commune: 'Le Touquet-Paris-Plage',
    codePostal: '62520',
    departement: 'Pas-de-Calais',
    region: 'Hauts-de-France',
    latitude: 50.5236,
    longitude: 1.5853,
    accessibilites: [
      'FAUTEUIL_ROULANT',
      'TIRALO',
      'HIPPOCAMPE',
      'PARKINGS_PMR',
      'SANITAIRES_ADAPTES',
      'DOUCHES_ACCESSIBLES',
      'CHEMIN_ACCES',
      'PERSONNEL_FORME',
    ],
    verifiedBy: 'handiplage.fr',
  },
  {
    slug: 'plage-sables-d-or-anglet',
    noteGlobale: 4.2,
    photo: photoFor('plage-sables-d-or-anglet'),
    nom: "Plage des Sables d'Or à Anglet",
    description:
      "Plage du Pays basque labellisée Handiplage niveau 3, avec un environnement préservé entre Anglet et Biarritz. Zone de baignade surveillée, mise à disposition de tiralos et de fauteuils Hippocampe, rampe d'accès au sable, parking PMR et sanitaires adaptés à proximité immédiate.",
    commune: 'Anglet',
    codePostal: '64600',
    departement: 'Pyrénées-Atlantiques',
    region: 'Nouvelle-Aquitaine',
    latitude: 43.4969,
    longitude: -1.5378,
    accessibilites: [
      'TIRALO',
      'HIPPOCAMPE',
      'RAMPE_ACCES',
      'PARKINGS_PMR',
      'SANITAIRES_ADAPTES',
      'PERSONNEL_FORME',
    ],
    verifiedBy: 'handiplage.fr',
  },
  {
    slug: 'grande-plage-biarritz',
    noteGlobale: 4.2,
    photo: photoFor('grande-plage-biarritz'),
    nom: 'Grande Plage de Biarritz',
    description:
      "Plage centrale de Biarritz au pied du Casino municipal, labellisée Handiplage niveau 3. Cheminement en bois, tiralos disponibles auprès des MNS, parking PMR au Square Edouard VII et sanitaires PMR à proximité. Encadrement par des sauveteurs formés à l'accueil des personnes handicapées.",
    commune: 'Biarritz',
    codePostal: '64200',
    departement: 'Pyrénées-Atlantiques',
    region: 'Nouvelle-Aquitaine',
    latitude: 43.4848,
    longitude: -1.5614,
    accessibilites: [
      'TIRALO',
      'CHEMIN_ACCES',
      'PARKINGS_PMR',
      'SANITAIRES_ADAPTES',
      'PERSONNEL_FORME',
    ],
    verifiedBy: 'handiplage.fr',
  },
  {
    slug: 'plage-grande-conche-royan',
    noteGlobale: 4.2,
    photo: photoFor('plage-grande-conche-royan'),
    nom: 'Plage de la Grande Conche à Royan',
    description:
      "Vaste plage de sable fin de 2 km, labellisée Handiplage niveau 3 et Pavillon Bleu. Plusieurs accès cheminés depuis le boulevard, tiralos et fauteuils Hippocampe en prêt au poste central, douches accessibles et bloc sanitaire PMR. Sable compact à marée basse facilitant les déplacements.",
    commune: 'Royan',
    codePostal: '17200',
    departement: 'Charente-Maritime',
    region: 'Nouvelle-Aquitaine',
    latitude: 45.6225,
    longitude: -1.0244,
    accessibilites: [
      'TIRALO',
      'HIPPOCAMPE',
      'CHEMIN_ACCES',
      'SABLE_COMPACT',
      'DOUCHES_ACCESSIBLES',
      'SANITAIRES_ADAPTES',
      'PARKINGS_PMR',
      'PERSONNEL_FORME',
    ],
    verifiedBy: 'handiplage.fr',
  },
  {
    slug: 'plage-centrale-sables-d-olonne',
    noteGlobale: 4.5,
    photo: photoFor('plage-centrale-sables-d-olonne'),
    nom: "Plage Centrale des Sables-d'Olonne",
    description:
      "Plage urbaine du Remblai, labellisée Handiplage niveau 4. Service de mise à disposition de tiralos, fauteuils Hippocampe et fauteuils amphibies, plusieurs descentes en bois jusqu'à l'eau, douches et sanitaires adaptés répartis sur toute la longueur, équipe handi-accueil présente en juillet-août.",
    commune: "Les Sables-d'Olonne",
    codePostal: '85100',
    departement: 'Vendée',
    region: 'Pays de la Loire',
    latitude: 46.4925,
    longitude: -1.7869,
    accessibilites: [
      'FAUTEUIL_ROULANT',
      'TIRALO',
      'HIPPOCAMPE',
      'CHEMIN_ACCES',
      'DOUCHES_ACCESSIBLES',
      'SANITAIRES_ADAPTES',
      'PARKINGS_PMR',
      'PERSONNEL_FORME',
      'LOCATION_MATERIEL',
    ],
    verifiedBy: 'handiplage.fr',
  },
  {
    slug: 'plage-du-sillon-saint-malo',
    noteGlobale: 4.2,
    photo: photoFor('plage-du-sillon-saint-malo'),
    nom: 'Plage du Sillon à Saint-Malo',
    description:
      "Grande plage de 3 km face à la baie, labellisée Handiplage niveau 3. Plusieurs accès aménagés avec rampe béton, tiralos et fauteuils tout-terrain disponibles en saison auprès des MNS, sanitaires PMR et douches accessibles à proximité de la digue. Attention aux marées : se renseigner sur les horaires.",
    commune: 'Saint-Malo',
    codePostal: '35400',
    departement: 'Ille-et-Vilaine',
    region: 'Bretagne',
    latitude: 48.6512,
    longitude: -2.0225,
    accessibilites: [
      'TIRALO',
      'FAUTEUIL_ROULANT',
      'RAMPE_ACCES',
      'DOUCHES_ACCESSIBLES',
      'SANITAIRES_ADAPTES',
      'PARKINGS_PMR',
      'PERSONNEL_FORME',
    ],
    verifiedBy: 'handiplage.fr',
  },
  {
    slug: 'grande-plage-quiberon',
    noteGlobale: 4.2,
    photo: photoFor('grande-plage-quiberon'),
    nom: 'Grande Plage de Quiberon',
    description:
      "Plage abritée du sud de la presqu'île, idéale pour les familles et labellisée Handiplage niveau 3. Mise à disposition de tiralos auprès du poste de secours central, cheminements en caillebotis bois jusqu'au sable, sanitaires adaptés et zone de stationnement PMR à proximité immédiate de la promenade.",
    commune: 'Quiberon',
    codePostal: '56170',
    departement: 'Morbihan',
    region: 'Bretagne',
    latitude: 47.4836,
    longitude: -3.1186,
    accessibilites: [
      'TIRALO',
      'CHEMIN_ACCES',
      'SANITAIRES_ADAPTES',
      'PARKINGS_PMR',
      'PERSONNEL_FORME',
    ],
    verifiedBy: 'handiplage.fr',
  },
  {
    slug: 'plage-carras-nice',
    noteGlobale: 4.2,
    photo: photoFor('plage-carras-nice'),
    nom: 'Plage Carras à Nice',
    description:
      "Plage publique de l'ouest niçois, labellisée Handiplage niveau 3 et seule plage municipale niçoise pleinement accessible. Cheminements bois, tiralos en prêt gratuit auprès du poste de secours, sanitaires PMR, douches accessibles et personnel formé. Sable compact mêlé de galets en bord d'eau.",
    commune: 'Nice',
    codePostal: '06200',
    departement: 'Alpes-Maritimes',
    region: "Provence-Alpes-Côte d'Azur",
    latitude: 43.6678,
    longitude: 7.2008,
    accessibilites: [
      'TIRALO',
      'CHEMIN_ACCES',
      'SABLE_COMPACT',
      'DOUCHES_ACCESSIBLES',
      'SANITAIRES_ADAPTES',
      'PARKINGS_PMR',
      'PERSONNEL_FORME',
    ],
    verifiedBy: 'handiplage.fr',
  },
  {
    slug: 'plage-boucan-canot-saint-paul',
    noteGlobale: 4.0,
    photo: photoFor('plage-boucan-canot-saint-paul'),
    nom: 'Plage de Boucan Canot à Saint-Paul',
    description:
      "Plage emblématique de l'ouest de La Réunion, équipée pour l'accueil des personnes en situation de handicap. Cheminement bois jusqu'à la zone de baignade surveillée et protégée des requins par filet, tiralos disponibles, douches et sanitaires PMR, parking aménagé en face de la plage.",
    commune: 'Saint-Paul',
    codePostal: '97434',
    departement: 'La Réunion',
    region: 'La Réunion',
    latitude: -21.0428,
    longitude: 55.2256,
    accessibilites: [
      'TIRALO',
      'CHEMIN_ACCES',
      'DOUCHES_ACCESSIBLES',
      'SANITAIRES_ADAPTES',
      'PARKINGS_PMR',
    ],
    verifiedBy: 'handiplage.fr',
  },
]

export const handiplageSampleSource: Source = {
  name: 'handiplage.fr (sample)',
  async fetch() {
    // Returns the curated list. The orchestrator handles dedup against existing slugs
    // and caps the daily import to 5. Once a real scraper exists, replace this body
    // with the live HTTP fetch + parse — the contract stays identical.
    return CANDIDATES
  },
}

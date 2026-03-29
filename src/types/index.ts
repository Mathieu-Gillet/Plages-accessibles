// src/types/index.ts

export type TypeAccessibilite =
  | 'FAUTEUIL_ROULANT'
  | 'HANDISURF'
  | 'TIRALO'
  | 'HIPPOCAMPE'
  | 'PARKINGS_PMR'
  | 'SANITAIRES_ADAPTES'
  | 'DOUCHES_ACCESSIBLES'
  | 'CHEMIN_ACCES'
  | 'RAMPE_ACCES'
  | 'SABLE_COMPACT'
  | 'PERSONNEL_FORME'
  | 'SIGNALISATION_BRAILLE'
  | 'BOUCLE_MAGNETIQUE'
  | 'LOCATION_MATERIEL'

export const LABELS_ACCESSIBILITE: Record<TypeAccessibilite, string> = {
  FAUTEUIL_ROULANT: 'Accès fauteuil roulant',
  HANDISURF: 'Handisurf',
  TIRALO: 'Tiralo (fauteuil amphibie)',
  HIPPOCAMPE: 'Hippocampe nautique',
  PARKINGS_PMR: 'Parkings PMR',
  SANITAIRES_ADAPTES: 'Sanitaires adaptés',
  DOUCHES_ACCESSIBLES: 'Douches accessibles',
  CHEMIN_ACCES: "Chemin d'accès aménagé",
  RAMPE_ACCES: "Rampe d'accès",
  SABLE_COMPACT: 'Sable compact / tapis',
  PERSONNEL_FORME: 'Personnel formé handicap',
  SIGNALISATION_BRAILLE: 'Signalisation braille',
  BOUCLE_MAGNETIQUE: 'Boucle magnétique',
  LOCATION_MATERIEL: 'Location matériel adapté',
}

export const ICONES_ACCESSIBILITE: Record<TypeAccessibilite, string> = {
  FAUTEUIL_ROULANT: '♿',
  HANDISURF: '🏄',
  TIRALO: '🪑',
  HIPPOCAMPE: '🐬',
  PARKINGS_PMR: '🅿️',
  SANITAIRES_ADAPTES: '🚻',
  DOUCHES_ACCESSIBLES: '🚿',
  CHEMIN_ACCES: '🛤️',
  RAMPE_ACCES: '📐',
  SABLE_COMPACT: '🏖️',
  PERSONNEL_FORME: '👨‍⚕️',
  SIGNALISATION_BRAILLE: '👁️',
  BOUCLE_MAGNETIQUE: '🦻',
  LOCATION_MATERIEL: '🔧',
}

export interface PlageResume {
  id: string
  nom: string
  slug: string
  commune: string
  departement: string
  region: string
  latitude: number
  longitude: number
  noteGlobale: number
  nombreAvis: number
  photo?: string | null
  accessibilites: TypeAccessibilite[]
}

export interface PlageDetail extends PlageResume {
  description?: string | null
  codePostal: string
  photos: string[]
  hebergements: Hebergement[]
  offresCulturelles: OffreCulturelle[]
  avis: Avis[]
}

export interface Hebergement {
  id: string
  nom: string
  type: string
  adresse: string
  telephone?: string | null
  email?: string | null
  siteWeb?: string | null
  latitude: number
  longitude: number
  distanceKm: number
  accessiblePMR: boolean
}

export interface OffreCulturelle {
  id: string
  nom: string
  type: string
  adresse: string
  description?: string | null
  telephone?: string | null
  siteWeb?: string | null
  latitude: number
  longitude: number
  distanceKm: number
  accessiblePMR: boolean
}

export interface Avis {
  id: string
  note: number
  commentaire?: string | null
  auteur?: string | null
  date: Date
}

export const REGIONS_FRANCE = [
  'Auvergne-Rhône-Alpes',
  'Bourgogne-Franche-Comté',
  'Bretagne',
  'Centre-Val de Loire',
  'Corse',
  'Grand Est',
  'Guadeloupe',
  'Guyane',
  'Hauts-de-France',
  'Île-de-France',
  'La Réunion',
  'Martinique',
  'Mayotte',
  'Normandie',
  'Nouvelle-Aquitaine',
  'Occitanie',
  'Pays de la Loire',
  "Provence-Alpes-Côte d'Azur",
] as const

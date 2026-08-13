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
  photo?: string | null
  accessibilites: TypeAccessibilite[]
  /** Date de dernière vérification éditoriale (YYYY-MM-DD), départage le classement. */
  verifiedAt?: string | null
}

export interface PlageDetail extends PlageResume {
  description?: string | null
  codePostal: string
  photos: string[]
  hebergements: Hebergement[]
  offresCulturelles: OffreCulturelle[]
}

/**
 * Nombre de votes requis avant qu'une note moyenne devienne publique.
 * En dessous, la moyenne existe en base mais n'est affichée nulle part :
 * publier une moyenne sur 1 ou 2 votes reproduirait le défaut des anciennes
 * notes importées — un chiffre précis qui ne mesure rien.
 *
 * Vit ici, et non dans src/lib/votes-core.ts, pour rester importable par les
 * composants client (votes-core dépend de node:crypto).
 */
export const SEUIL_VOTES = 5

/** État déclaré par le visiteur pour un équipement annoncé sur la fiche. */
export const STATUTS_EQUIPEMENT = ['vu', 'absent', 'inconnu'] as const

export type StatutEquipement = (typeof STATUTS_EQUIPEMENT)[number]

/**
 * Note communautaire d'une plage, agrégée depuis les votes de visiteurs.
 * `notePubliee` reste `null` tant que SEUIL_VOTES n'est pas atteint.
 */
export interface StatsVote {
  nombreVotes: number
  notePubliee: number | null
}

/** Plage enrichie de sa note communautaire — ce que consomment carte et cartes. */
export interface PlageAvecVotes extends PlageResume {
  stats: StatsVote
}

/** Décompte communautaire pour un équipement déclaré sur une fiche. */
export interface ConfirmationEquipement {
  type: TypeAccessibilite
  confirmations: number
  infirmations: number
}

export type NiveauAccessibilite = 'confirme' | 'partiel' | 'inconnu'

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
  niveauAccessibilite?: NiveauAccessibilite
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
  niveauAccessibilite?: NiveauAccessibilite
}

/** Commentaire de visiteur, publié uniquement après modération. */
export interface Avis {
  id: string
  note: number
  commentaire: string
  auteur?: string | null
  /** Photo prise sur place, soumise à la même modération que le texte. */
  photoUrl?: string | null
  date: Date
}

/** Formats acceptés pour la photo d'un avis, et taille maximale. */
export const TYPES_IMAGE_AVIS = ['image/jpeg', 'image/png', 'image/webp'] as const
export const TAILLE_MAX_PHOTO_AVIS = 5 * 1024 * 1024

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

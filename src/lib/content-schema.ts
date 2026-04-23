// src/lib/content-schema.ts
// Zod schemas validating beach content files at build time.
// A failed schema means the build fails — no silently broken data in prod.
import { z } from 'zod'

export const TYPES_ACCESSIBILITE = [
  'FAUTEUIL_ROULANT',
  'HANDISURF',
  'TIRALO',
  'HIPPOCAMPE',
  'PARKINGS_PMR',
  'SANITAIRES_ADAPTES',
  'DOUCHES_ACCESSIBLES',
  'CHEMIN_ACCES',
  'RAMPE_ACCES',
  'SABLE_COMPACT',
  'PERSONNEL_FORME',
  'SIGNALISATION_BRAILLE',
  'BOUCLE_MAGNETIQUE',
  'LOCATION_MATERIEL',
] as const

export const typeAccessibiliteSchema = z.enum(TYPES_ACCESSIBILITE)

export const accessibiliteSchema = z.union([
  typeAccessibiliteSchema, // shorthand: just the type
  z.object({
    type: typeAccessibiliteSchema,
    disponible: z.boolean().default(true),
    details: z.string().optional(),
  }),
])

export const hebergementSchema = z.object({
  nom: z.string().min(1),
  type: z.string().min(1),
  adresse: z.string().min(1),
  telephone: z.string().regex(/^[\d+\-() ]+$/, 'Format téléphone invalide').optional(),
  email: z.string().email().optional(),
  siteWeb: z.string().url().refine(u => u.startsWith('https://'), 'HTTPS requis').optional(),
  latitude: z.number(),
  longitude: z.number(),
  distanceKm: z.number().min(0),
  accessiblePMR: z.boolean().default(false),
})

export const offreCulturelleSchema = z.object({
  nom: z.string().min(1),
  type: z.string().min(1),
  adresse: z.string().min(1),
  description: z.string().optional(),
  telephone: z.string().regex(/^[\d+\-() ]+$/, 'Format téléphone invalide').optional(),
  siteWeb: z.string().url().refine(u => u.startsWith('https://'), 'HTTPS requis').optional(),
  latitude: z.number(),
  longitude: z.number(),
  distanceKm: z.number().min(0),
  accessiblePMR: z.boolean().default(false),
})

export const avisSchema = z.object({
  note: z.number().int().min(1).max(5),
  commentaire: z.string().optional(),
  auteur: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date au format YYYY-MM-DD'),
})

export const plageContentSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug en kebab-case minuscule'),
  nom: z.string().min(1),
  description: z.string().optional(),
  commune: z.string().min(1),
  codePostal: z.string().regex(/^\d{5}$/, 'Code postal à 5 chiffres'),
  departement: z.string().min(1),
  region: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  photo: z.string().url().refine(u => u.startsWith('https://'), 'HTTPS requis').nullable().optional(),
  photos: z.array(z.string().url().refine(u => u.startsWith('https://'), 'HTTPS requis')).default([]),
  noteGlobale: z.number().min(0).max(5).default(0),
  nombreAvis: z.number().int().min(0).default(0),
  actif: z.boolean().default(true),
  // Traçabilité éditoriale (audit recommandation) :
  verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  verifiedBy: z.string().optional(),
  accessibilites: z.array(accessibiliteSchema).default([]),
  hebergements: z.array(hebergementSchema).default([]),
  offresCulturelles: z.array(offreCulturelleSchema).default([]),
  avis: z.array(avisSchema).default([]),
})

export type PlageContent = z.infer<typeof plageContentSchema>

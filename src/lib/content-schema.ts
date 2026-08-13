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

// Accessibility confidence of a nearby POI, derived from OSM's `wheelchair` tag:
//   confirme = wheelchair yes/designated · partiel = limited · inconnu = untagged.
// Optional so the ~200 POIs enriched before this field still validate.
export const niveauAccessibiliteSchema = z.enum(['confirme', 'partiel', 'inconnu'])

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
  niveauAccessibilite: niveauAccessibiliteSchema.optional(),
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
  niveauAccessibilite: niveauAccessibiliteSchema.optional(),
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
  // Aucune note dans le contenu : depuis le passage en mode communautaire, la
  // note d'une plage est calculée à partir des votes de visiteurs (table
  // Supabase `votes`, cf. src/lib/votes.ts) et n'est publiée qu'au-delà de
  // SEUIL_VOTES. Les champs `noteGlobale`, `nombreAvis` et `avis` des anciennes
  // fiches ont été supprimés ; Zod ignore silencieusement une clé résiduelle.
  actif: z.boolean().default(true),
  // Traçabilité éditoriale (audit recommandation) :
  verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  verifiedBy: z.string().nullable().optional(),
  accessibilites: z.array(accessibiliteSchema).default([]),
  hebergements: z.array(hebergementSchema).default([]),
  offresCulturelles: z.array(offreCulturelleSchema).default([]),
}).refine(
  // (0, 0) is the placeholder used by contribution PRs lacking GPS coords;
  // it must be filled in before a beach goes live on the map.
  (p) => !p.actif || p.latitude !== 0 || p.longitude !== 0,
  { message: 'Une plage active doit avoir des coordonnées GPS renseignées (lat/lon ≠ 0,0)', path: ['latitude'] },
)

export type PlageContent = z.infer<typeof plageContentSchema>

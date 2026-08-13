// scripts/lib/photo-qualite.ts
// Contrôle qualité d'une photo de plage : le nom de fichier ne suffit pas.
//
// Wikimedia Commons mélange photographies et fonds numérisés. Une recherche
// « intitle:plage <commune> » remonte donc aussi bien une plage en été qu'une
// carte marine du XVIIᵉ siècle intitulée « Carte des sept capitaineries... avec
// les sondes des plages » — techniquement pertinente, visuellement inutile pour
// quelqu'un qui prépare une sortie.
//
// Deux filtres complémentaires :
//   1. le nom de fichier (cartes, gravures, identifiants Gallica) ;
//   2. l'image elle-même, téléchargée et mesurée — c'est le seul moyen d'écarter
//      un noir et blanc ou un sépia dont le nom ne dit rien.

import sharp from 'sharp'

const USER_AGENT =
  'Plages-Accessibles-Bot/1.0 (https://plages-accessibles.fr; falathar329@gmail.com)'

/**
 * Documents plutôt que photographies. `btv1b` est l'identifiant des numérisations
 * de la BnF (Gallica) massivement versées sur Commons : cartes anciennes,
 * estampes, cartes postales — jamais une photo utilisable.
 */
const TOKENS_DOCUMENT =
  /(carte|map[-_ ]|plan[-_ ]de|cadastre|atlas|blason|armoiries|btv1b|gravure|lithographie|estampe|dessin|croquis|schema|schéma|affiche|timbre|manuscrit|portulan|nautique|peinture|tableau|huile[-_ ]sur|aquarelle|panneau|pancarte|plaque|borne|stele|stèle|logo)/i

/**
 * Seuil de « coloration » (métrique de Hasler & Süsstrunk).
 * Un noir et blanc franc tombe sous 5. Le seuil reste bas volontairement : une
 * plage bretonne sous un ciel gris mesure une quinzaine, et l'écarter serait
 * pire que laisser passer un tirage viré — d'où la relecture humaine en amont,
 * dont la liste d'exclusion garde la trace.
 */
const SEUIL_COLORATION = 8

/** Au-delà, l'image est majoritairement du papier blanc : un document scanné. */
const SEUIL_BLANC = 0.45

export interface QualitePhoto {
  acceptable: boolean
  /** Raison du rejet, destinée aux journaux du script. */
  motif?: string
  coloration?: number
  partBlanche?: number
  etendueTeintes?: number
}

/** Rejet sur le seul nom de fichier — gratuit, à tenter avant tout téléchargement. */
export function nomEvoqueUnDocument(url: string): boolean {
  const nom = decodeURIComponent(url.split('/').pop() ?? url)
  return TOKENS_DOCUMENT.test(nom)
}

/**
 * Coloration au sens de Hasler & Süsstrunk (2003) : l'écart-type et la moyenne
 * des oppositions rouge-vert et jaune-bleu. Proche de 0 pour toute image
 * désaturée, quelle que soit sa luminosité — ce qui attrape aussi bien le noir
 * et blanc franc que le sépia, là où une simple mesure de saturation moyenne
 * laisserait passer le second.
 */
function mesurer(pixels: Buffer): {
  coloration: number
  partBlanche: number
  etendueTeintes: number
} {
  const n = pixels.length / 3
  let sommeRg = 0
  let sommeYb = 0
  let sommeRg2 = 0
  let sommeYb2 = 0
  let blancs = 0

  // Étendue des teintes, conservée à titre indicatif dans le rapport d'audit.
  // Elle a été essayée comme critère de rejet automatique des sépias : trop de
  // faux positifs, une plage dominée par le bleu du ciel et de l'eau concentre
  // ses teintes autant qu'une carte postale virée.
  let vecteurX = 0
  let vecteurY = 0
  let poids = 0

  for (let i = 0; i < pixels.length; i += 3) {
    const r = pixels[i]
    const v = pixels[i + 1]
    const b = pixels[i + 2]

    const rg = r - v
    const yb = 0.5 * (r + v) - b

    sommeRg += rg
    sommeYb += yb
    sommeRg2 += rg * rg
    sommeYb2 += yb * yb

    if (r > 228 && v > 228 && b > 228) blancs++

    const max = Math.max(r, v, b)
    const min = Math.min(r, v, b)
    const saturation = max === 0 ? 0 : (max - min) / max
    if (saturation > 0.18) {
      const angle = Math.atan2(yb, rg)
      vecteurX += Math.cos(angle) * saturation
      vecteurY += Math.sin(angle) * saturation
      poids += saturation
    }
  }

  // 0 = toutes les teintes identiques (monochrome teinté), 1 = teintes réparties.
  const concentration = poids > 0 ? Math.hypot(vecteurX, vecteurY) / poids : 1
  const etendueTeintes = 1 - concentration

  const moyRg = sommeRg / n
  const moyYb = sommeYb / n
  const ecartRg = Math.sqrt(Math.max(0, sommeRg2 / n - moyRg * moyRg))
  const ecartYb = Math.sqrt(Math.max(0, sommeYb2 / n - moyYb * moyYb))

  const coloration =
    Math.sqrt(ecartRg * ecartRg + ecartYb * ecartYb) +
    0.3 * Math.sqrt(moyRg * moyRg + moyYb * moyYb)

  return { coloration, partBlanche: blancs / n, etendueTeintes }
}

/**
 * Télécharge l'image, la réduit et la mesure.
 *
 * Une erreur réseau renvoie `acceptable: true` : on ne supprime pas une photo
 * parce que Wikimedia a hoqueté. Le doute profite à l'existant.
 */
export async function verifierPhoto(url: string): Promise<QualitePhoto> {
  if (nomEvoqueUnDocument(url)) {
    return { acceptable: false, motif: 'nom de document (carte, gravure, scan)' }
  }

  let donnees: ArrayBuffer
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) return { acceptable: true, motif: `HTTP ${res.status}, non vérifiée` }
    donnees = await res.arrayBuffer()
  } catch {
    return { acceptable: true, motif: 'téléchargement impossible, non vérifiée' }
  }

  try {
    // 160 px suffisent : on mesure une statistique globale, pas un détail.
    const { data } = await sharp(Buffer.from(donnees))
      .resize(160, 160, { fit: 'inside' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const { coloration, partBlanche, etendueTeintes } = mesurer(data)

    if (coloration < SEUIL_COLORATION) {
      return {
        acceptable: false,
        motif: `image désaturée (noir et blanc), coloration ${coloration.toFixed(1)}`,
        coloration,
        partBlanche,
        etendueTeintes,
      }
    }
    if (partBlanche > SEUIL_BLANC) {
      return {
        acceptable: false,
        motif: `${Math.round(partBlanche * 100)} % de blanc — document scanné`,
        coloration,
        partBlanche,
        etendueTeintes,
      }
    }

    return { acceptable: true, coloration, partBlanche, etendueTeintes }
  } catch {
    return { acceptable: true, motif: 'image illisible, non vérifiée' }
  }
}

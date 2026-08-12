// src/lib/carte-accueil.ts
// Sélection des plages mises en avant sur la carte d'accueil.
//
// La carte d'accueil n'affiche plus les 268 plages : au-delà de quelques
// dizaines de marqueurs, la carte devient illisible et sans hiérarchie. On en
// retient donc au maximum MAX_PLAGES_PAR_REGION par région, choisies par un
// classement déterministe (même entrée → même sortie, donc build stable et SEO
// prévisible). L'intégralité du catalogue reste accessible via /recherche.
import type { PlageAvecVotes, PlageResume, StatsVote } from '@/types'
import { STATS_VIDES } from './votes-core'

export const MAX_PLAGES_PAR_REGION = 5

export function attacherStats(
  plages: PlageResume[],
  stats: Map<string, StatsVote>,
): PlageAvecVotes[] {
  return plages.map((p) => ({ ...p, stats: stats.get(p.slug) ?? STATS_VIDES }))
}

/**
 * Classement de mise en avant, en deux strates :
 *
 *  1. les plages dont la note communautaire est publiée (seuil de votes
 *     atteint), de la meilleure à la moins bonne ;
 *  2. les autres, à défaut de retour visiteur, par richesse d'équipements
 *     recensés puis fraîcheur de la vérification éditoriale.
 *
 * Conséquence voulue : la carte se remplit progressivement de contenu
 * réellement validé par les visiteurs, et récompense la participation.
 */
export function classerPlages(plages: PlageAvecVotes[]): PlageAvecVotes[] {
  return [...plages].sort(comparerPourMiseEnAvant)
}

function comparerPourMiseEnAvant(a: PlageAvecVotes, b: PlageAvecVotes): number {
  const noteA = a.stats.notePubliee
  const noteB = b.stats.notePubliee

  // Strate 1 avant strate 2.
  if ((noteA === null) !== (noteB === null)) return noteA === null ? 1 : -1

  if (noteA !== null && noteB !== null) {
    if (noteB !== noteA) return noteB - noteA
    // À note égale, la plage la plus votée est la mieux établie.
    if (b.stats.nombreVotes !== a.stats.nombreVotes) {
      return b.stats.nombreVotes - a.stats.nombreVotes
    }
    return a.nom.localeCompare(b.nom, 'fr')
  }

  // Strate 2 : équipements recensés, puis vérification la plus récente.
  if (b.accessibilites.length !== a.accessibilites.length) {
    return b.accessibilites.length - a.accessibilites.length
  }
  const verifA = a.verifiedAt ?? ''
  const verifB = b.verifiedAt ?? ''
  if (verifA !== verifB) return verifB.localeCompare(verifA)
  return a.nom.localeCompare(b.nom, 'fr')
}

/**
 * Au plus `maxParRegion` plages par région, triées par le classement de mise
 * en avant. Le résultat global est lui-même classé, pour que les meilleures
 * plages ressortent quel que soit l'ordre de parcours des régions.
 */
export function selectionnerPlagesCarte(
  plages: PlageResume[],
  stats: Map<string, StatsVote>,
  maxParRegion: number = MAX_PLAGES_PAR_REGION,
): PlageAvecVotes[] {
  const parRegion = new Map<string, PlageAvecVotes[]>()
  for (const plage of attacherStats(plages, stats)) {
    const liste = parRegion.get(plage.region) ?? []
    liste.push(plage)
    parRegion.set(plage.region, liste)
  }

  const retenues: PlageAvecVotes[] = []
  for (const liste of parRegion.values()) {
    retenues.push(...classerPlages(liste).slice(0, maxParRegion))
  }
  return classerPlages(retenues)
}

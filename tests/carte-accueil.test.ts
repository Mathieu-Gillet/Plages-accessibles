import { describe, it, expect } from 'vitest'
import {
  MAX_PLAGES_PAR_REGION,
  attacherStats,
  classerPlages,
  selectionnerPlagesCarte,
} from '@/lib/carte-accueil'
import type { PlageResume, StatsVote, TypeAccessibilite } from '@/types'

function plage(
  slug: string,
  region: string,
  opts: { equipements?: number; verifiedAt?: string | null; nom?: string } = {},
): PlageResume {
  const tous: TypeAccessibilite[] = [
    'TIRALO',
    'PARKINGS_PMR',
    'RAMPE_ACCES',
    'SANITAIRES_ADAPTES',
    'DOUCHES_ACCESSIBLES',
  ]
  return {
    id: slug,
    slug,
    nom: opts.nom ?? slug,
    commune: 'Commune',
    departement: 'Dept',
    region,
    latitude: 46,
    longitude: 2,
    photo: null,
    accessibilites: tous.slice(0, opts.equipements ?? 1),
    verifiedAt: opts.verifiedAt ?? '2026-01-01',
  }
}

const notee = (note: number, votes = 5): StatsVote => ({
  nombreVotes: votes,
  notePubliee: note,
})
const enAttente = (votes = 0): StatsVote => ({ nombreVotes: votes, notePubliee: null })

describe('attacherStats', () => {
  it('retombe sur « aucun vote » pour une plage absente de la map', () => {
    const [p] = attacherStats([plage('a', 'Bretagne')], new Map())
    expect(p.stats).toEqual({ nombreVotes: 0, notePubliee: null })
  })
})

describe('classerPlages', () => {
  it('place les plages notées avant celles en attente', () => {
    const plages = attacherStats(
      [
        plage('sans-note', 'Bretagne', { equipements: 5 }),
        plage('notee', 'Bretagne', { equipements: 1 }),
      ],
      new Map([['notee', notee(2.0)]]),
    )
    // Même faiblement notée et peu équipée, la plage validée par les visiteurs
    // passe devant : c'est tout l'objet du mode communautaire.
    expect(classerPlages(plages).map((p) => p.slug)).toEqual(['notee', 'sans-note'])
  })

  it('trie les plages notées par note décroissante', () => {
    const plages = attacherStats(
      [plage('b', 'Bretagne'), plage('a', 'Bretagne'), plage('c', 'Bretagne')],
      new Map([
        ['a', notee(3.2)],
        ['b', notee(4.8)],
        ['c', notee(4.1)],
      ]),
    )
    expect(classerPlages(plages).map((p) => p.slug)).toEqual(['b', 'c', 'a'])
  })

  it('départage une égalité de note par le nombre de votes', () => {
    const plages = attacherStats(
      [plage('peu', 'Bretagne'), plage('beaucoup', 'Bretagne')],
      new Map([
        ['peu', notee(4.0, 5)],
        ['beaucoup', notee(4.0, 40)],
      ]),
    )
    expect(classerPlages(plages).map((p) => p.slug)).toEqual(['beaucoup', 'peu'])
  })

  it('classe les plages non notées par richesse d’équipements', () => {
    const plages = attacherStats(
      [
        plage('pauvre', 'Bretagne', { equipements: 1 }),
        plage('riche', 'Bretagne', { equipements: 4 }),
      ],
      new Map(),
    )
    expect(classerPlages(plages).map((p) => p.slug)).toEqual(['riche', 'pauvre'])
  })

  it('départage à équipements égaux par vérification la plus récente', () => {
    const plages = attacherStats(
      [
        plage('vieille', 'Bretagne', { equipements: 2, verifiedAt: '2025-03-01' }),
        plage('fraiche', 'Bretagne', { equipements: 2, verifiedAt: '2026-07-01' }),
      ],
      new Map(),
    )
    expect(classerPlages(plages).map((p) => p.slug)).toEqual(['fraiche', 'vieille'])
  })

  it('reste déterministe : même entrée, même sortie', () => {
    const plages = attacherStats(
      [
        plage('a', 'Bretagne', { equipements: 2, nom: 'Alpha' }),
        plage('b', 'Bretagne', { equipements: 2, nom: 'Bravo' }),
        plage('c', 'Bretagne', { equipements: 2, nom: 'Charlie' }),
      ],
      new Map(),
    )
    const premier = classerPlages(plages).map((p) => p.slug)
    expect(classerPlages([...plages].reverse()).map((p) => p.slug)).toEqual(premier)
  })

  it('ne mute pas le tableau reçu', () => {
    const plages = attacherStats(
      [plage('z', 'Bretagne'), plage('a', 'Bretagne', { equipements: 3 })],
      new Map(),
    )
    const ordreInitial = plages.map((p) => p.slug)
    classerPlages(plages)
    expect(plages.map((p) => p.slug)).toEqual(ordreInitial)
  })
})

describe('selectionnerPlagesCarte', () => {
  it('retient au plus MAX_PLAGES_PAR_REGION plages par région', () => {
    const plages = [
      ...Array.from({ length: 12 }, (_, i) => plage(`bre-${i}`, 'Bretagne')),
      ...Array.from({ length: 9 }, (_, i) => plage(`occ-${i}`, 'Occitanie')),
    ]
    const retenues = selectionnerPlagesCarte(plages, new Map())

    expect(retenues).toHaveLength(MAX_PLAGES_PAR_REGION * 2)
    for (const region of ['Bretagne', 'Occitanie']) {
      expect(retenues.filter((p) => p.region === region)).toHaveLength(
        MAX_PLAGES_PAR_REGION,
      )
    }
  })

  it('garde toutes les plages d’une région moins fournie que le plafond', () => {
    const plages = [plage('a', 'Corse'), plage('b', 'Corse')]
    expect(selectionnerPlagesCarte(plages, new Map())).toHaveLength(2)
  })

  it('retient en priorité les plages notées de chaque région', () => {
    const plages = [
      plage('bre-riche', 'Bretagne', { equipements: 5 }),
      plage('bre-notee', 'Bretagne', { equipements: 1 }),
      plage('bre-autre', 'Bretagne', { equipements: 3 }),
    ]
    const retenues = selectionnerPlagesCarte(
      plages,
      new Map([['bre-notee', notee(4.5)]]),
      1,
    )
    expect(retenues.map((p) => p.slug)).toEqual(['bre-notee'])
  })

  it('n’exclut personne quand une région a exactement le plafond', () => {
    const plages = Array.from({ length: MAX_PLAGES_PAR_REGION }, (_, i) =>
      plage(`p-${i}`, 'Normandie'),
    )
    expect(selectionnerPlagesCarte(plages, new Map())).toHaveLength(
      MAX_PLAGES_PAR_REGION,
    )
  })

  it('ne publie aucune note tant que le seuil n’est pas atteint', () => {
    // Cas du jour 1 : des votes existent mais aucune plage n'a atteint le seuil.
    const plages = [plage('a', 'Bretagne'), plage('b', 'Bretagne')]
    const retenues = selectionnerPlagesCarte(
      plages,
      new Map([
        ['a', enAttente(3)],
        ['b', enAttente(1)],
      ]),
    )
    expect(retenues.every((p) => p.stats.notePubliee === null)).toBe(true)
  })

  it('classe le résultat global, toutes régions confondues', () => {
    const plages = [
      plage('occ-top', 'Occitanie'),
      plage('bre-moyenne', 'Bretagne'),
      plage('cor-basse', 'Corse'),
    ]
    const retenues = selectionnerPlagesCarte(
      plages,
      new Map([
        ['occ-top', notee(4.9)],
        ['bre-moyenne', notee(3.5)],
        ['cor-basse', notee(1.8)],
      ]),
    )
    expect(retenues.map((p) => p.slug)).toEqual(['occ-top', 'bre-moyenne', 'cor-basse'])
  })
})

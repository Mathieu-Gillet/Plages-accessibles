import { describe, it, expect } from 'vitest'
import {
  STATS_VIDES,
  appliquerSeuil,
  hashEmpreinte,
  normaliserEquipements,
} from '@/lib/votes-core'
import { SEUIL_VOTES, type TypeAccessibilite } from '@/types'

describe('appliquerSeuil', () => {
  it('masque la moyenne sous le seuil', () => {
    for (let n = 0; n < SEUIL_VOTES; n++) {
      const stats = appliquerSeuil(n, 4.6)
      expect(stats.notePubliee).toBeNull()
      // Le décompte reste exposé pour afficher la progression.
      expect(stats.nombreVotes).toBe(n)
    }
  })

  it('publie la moyenne dès le seuil atteint', () => {
    expect(appliquerSeuil(SEUIL_VOTES, 3.8)).toEqual({
      nombreVotes: SEUIL_VOTES,
      notePubliee: 3.8,
    })
    expect(appliquerSeuil(SEUIL_VOTES + 40, 2.1).notePubliee).toBe(2.1)
  })

  it('ne publie rien si la moyenne est absente, même au-delà du seuil', () => {
    expect(appliquerSeuil(12, null).notePubliee).toBeNull()
  })

  it('STATS_VIDES représente une plage sans aucun vote', () => {
    expect(STATS_VIDES).toEqual({ nombreVotes: 0, notePubliee: null })
  })
})

describe('hashEmpreinte', () => {
  it('est déterministe', () => {
    expect(hashEmpreinte('sel', '1.2.3.4')).toBe(hashEmpreinte('sel', '1.2.3.4'))
  })

  it('ne laisse pas fuir la valeur en clair', () => {
    const hash = hashEmpreinte('sel', '82.65.14.201')
    expect(hash).not.toContain('82.65')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('change de sel change l’empreinte', () => {
    expect(hashEmpreinte('sel-a', 'x')).not.toBe(hashEmpreinte('sel-b', 'x'))
  })

  it('sépare deux valeurs voisines', () => {
    expect(hashEmpreinte('sel', 'a')).not.toBe(hashEmpreinte('sel', 'b'))
  })
})

describe('normaliserEquipements', () => {
  const declares: TypeAccessibilite[] = ['TIRALO', 'PARKINGS_PMR', 'RAMPE_ACCES']

  it('sépare vus et absents', () => {
    expect(
      normaliserEquipements(
        { TIRALO: 'vu', PARKINGS_PMR: 'absent', RAMPE_ACCES: 'inconnu' },
        declares,
      ),
    ).toEqual({ vus: ['TIRALO'], absents: ['PARKINGS_PMR'] })
  })

  it('ignore le statut « inconnu » — pas de confirmation implicite', () => {
    expect(normaliserEquipements({ TIRALO: 'inconnu' }, declares)).toEqual({
      vus: [],
      absents: [],
    })
  })

  it('rejette un équipement non annoncé sur la fiche', () => {
    // Anti-bourrage : un client ne peut pas confirmer un équipement absent
    // de la fiche pour la faire paraître mieux dotée.
    expect(normaliserEquipements({ HANDISURF: 'vu' }, declares)).toEqual({
      vus: [],
      absents: [],
    })
  })

  it('rejette un type hors référentiel', () => {
    expect(
      normaliserEquipements({ PISCINE_OLYMPIQUE: 'vu', TIRALO: 'vu' }, declares),
    ).toEqual({ vus: ['TIRALO'], absents: [] })
  })

  it('ignore un statut non reconnu', () => {
    expect(normaliserEquipements({ TIRALO: 'peut-être' }, declares)).toEqual({
      vus: [],
      absents: [],
    })
  })

  it('renvoie des listes triées, pour un diff stable en base', () => {
    const { vus } = normaliserEquipements(
      { RAMPE_ACCES: 'vu', PARKINGS_PMR: 'vu', TIRALO: 'vu' },
      declares,
    )
    expect(vus).toEqual(['PARKINGS_PMR', 'RAMPE_ACCES', 'TIRALO'])
  })

  it('accepte une saisie vide', () => {
    expect(normaliserEquipements({}, declares)).toEqual({ vus: [], absents: [] })
  })
})

import { describe, it, expect } from 'vitest'
import { mapAccessibilites, buildDescription, type OverpassTags } from '../scripts/sources/openstreetmap'

describe('mapAccessibilites', () => {
  it('ne retient rien pour wheelchair=limited seul', () => {
    // Régression « Plage du Lac d'Auron » (Bourges, importée le 2026-08-11) :
    // ce seul tag suffisait à fabriquer une fiche complète. Dans OSM, `limited`
    // signale une accessibilité PARTIELLE — c'est une réserve, pas un équipement.
    expect(mapAccessibilites({ wheelchair: 'limited' })).toEqual([])
  })

  it('retient un site limited seulement s\'il documente un équipement concret', () => {
    expect(mapAccessibilites({ wheelchair: 'limited', 'toilets:wheelchair': 'yes' })).toEqual([
      'SANITAIRES_ADAPTES',
    ])
    expect(mapAccessibilites({ wheelchair: 'limited', 'parking:disabled': 'yes' })).toEqual(['PARKINGS_PMR'])
  })

  it('retient wheelchair=yes / designated', () => {
    expect(mapAccessibilites({ wheelchair: 'yes' })).toEqual(['FAUTEUIL_ROULANT', 'CHEMIN_ACCES'])
    expect(mapAccessibilites({ wheelchair: 'designated' })).toEqual(['FAUTEUIL_ROULANT', 'CHEMIN_ACCES'])
  })

  it('ne retient rien pour wheelchair=no', () => {
    expect(mapAccessibilites({ wheelchair: 'no' })).toEqual([])
  })

  it('cumule les équipements documentés', () => {
    const tags: OverpassTags = {
      wheelchair: 'yes',
      'toilets:wheelchair': 'yes',
      'capacity:disabled': '4',
      surface: 'sand',
    }
    expect(mapAccessibilites(tags).sort()).toEqual(
      ['CHEMIN_ACCES', 'FAUTEUIL_ROULANT', 'PARKINGS_PMR', 'SABLE_COMPACT', 'SANITAIRES_ADAPTES'].sort(),
    )
  })
})

describe('buildDescription', () => {
  const desc = buildDescription('Plage des Mouettes', 'Saint-Hilaire-de-Riez', { wheelchair: 'yes' })

  it('ne prétend pas que la donnée est vérifiée sur le terrain', () => {
    expect(desc).not.toMatch(/recoupement avec les informations terrain/i)
    expect(desc).toMatch(/n'ont pas été vérifiées sur le terrain/i)
  })

  it('ne qualifie pas tous les sites de « balnéaires » (le catalogue inclut des lacs)', () => {
    expect(desc).not.toMatch(/balnéaire/i)
  })

  it('reste au-dessus du seuil de validation de 120 caractères', () => {
    expect(desc.length).toBeGreaterThanOrEqual(120)
  })

  it('conserve la description native de la source quand elle est exploitable', () => {
    const native = "Cheminement en platelage bois jusqu'au poste de secours, fauteuil amphibie disponible."
    expect(buildDescription('Plage X', 'Commune Y', { wheelchair: 'yes', description: native })).toContain(native)
  })
})

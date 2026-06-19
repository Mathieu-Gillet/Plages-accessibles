import { describe, it, expect } from 'vitest'
import { slugify, formatNote, etoiles, distanceLabel } from '@/lib/utils'

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Grande Plage de Biarritz')).toBe('grande-plage-de-biarritz')
  })

  it('strips diacritics', () => {
    expect(slugify('Plage du Métro')).toBe('plage-du-metro')
    expect(slugify("Côte d'Azur")).toBe('cote-dazur')
  })

  it('drops punctuation and collapses repeated hyphens', () => {
    expect(slugify('Plage !! (test)')).toBe('plage-test')
  })

  it('strips leading and trailing hyphens', () => {
    expect(slugify('!Plage!')).toBe('plage')
    expect(slugify('  - Plage -  ')).toBe('plage')
  })

  it('is idempotent on an already-slugified string', () => {
    const once = slugify('La Baule-Escoublac')
    expect(slugify(once)).toBe(once)
  })
})

describe('formatNote', () => {
  it('always renders one decimal', () => {
    expect(formatNote(4)).toBe('4.0')
    expect(formatNote(4.25)).toBe('4.3')
    expect(formatNote(0)).toBe('0.0')
  })
})

describe('etoiles', () => {
  it('renders full, half and empty stars to a total of 5', () => {
    expect(etoiles(5)).toBe('★★★★★')
    expect(etoiles(0)).toBe('☆☆☆☆☆')
    expect(etoiles(3.5)).toBe('★★★½☆')
    expect(etoiles(3.4)).toBe('★★★☆☆')
  })
})

describe('distanceLabel', () => {
  it('uses metres below 1 km', () => {
    expect(distanceLabel(0.5)).toBe('500 m')
    expect(distanceLabel(0.05)).toBe('50 m')
  })

  it('uses kilometres with one decimal at or above 1 km', () => {
    expect(distanceLabel(2.4)).toBe('2.4 km')
    expect(distanceLabel(1)).toBe('1.0 km')
  })
})

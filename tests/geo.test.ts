import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  slugify,
  makeSlug,
  regionFromCodePostal,
  departementFromCodePostal,
  reverseGeocode,
} from '../scripts/lib/geo'

describe('makeSlug / slugify', () => {
  it('builds a beach slug from name + commune', () => {
    expect(makeSlug('Grande Plage', 'Biarritz')).toBe('grande-plage-biarritz')
  })
  it('strips diacritics and apostrophes', () => {
    expect(slugify("Plage de l'Espiguette")).toBe('plage-de-lespiguette')
  })
})

describe('regionFromCodePostal', () => {
  it('maps metropolitan departments', () => {
    expect(regionFromCodePostal('64200')).toBe('Nouvelle-Aquitaine')
    expect(regionFromCodePostal('06000')).toBe("Provence-Alpes-Côte d'Azur")
  })
  it('handles Corsica 2A/2B', () => {
    expect(regionFromCodePostal('20000')).toBe('Corse')
    expect(regionFromCodePostal('20200')).toBe('Corse')
  })
  it('handles DOM-TOM', () => {
    expect(regionFromCodePostal('97400')).toBe('La Réunion')
  })
  it('falls back to France for unknown codes', () => {
    expect(regionFromCodePostal('99999')).toBe('France')
  })
})

describe('departementFromCodePostal', () => {
  it('maps the postcode to a department name', () => {
    expect(departementFromCodePostal('64200')).toBe('Pyrénées-Atlantiques')
    expect(departementFromCodePostal('2A001')).toBe('Corse-du-Sud')
  })
})

describe('reverseGeocode', () => {
  afterEach(() => vi.unstubAllGlobals())

  function mockFetch(impl: () => Promise<Response> | Response) {
    vi.stubGlobal('fetch', vi.fn(impl))
  }

  it('returns commune + postcode from the government API', async () => {
    mockFetch(() =>
      new Response(JSON.stringify({ features: [{ properties: { city: 'Biarritz', postcode: '64200' } }] }), {
        status: 200,
      }),
    )
    expect(await reverseGeocode(43.48, -1.56)).toEqual({ commune: 'Biarritz', codePostal: '64200' })
  })

  it('returns null on a non-OK response', async () => {
    mockFetch(() => new Response('', { status: 503 }))
    expect(await reverseGeocode(43.48, -1.56)).toBeNull()
  })

  it('returns null when no feature is returned', async () => {
    mockFetch(() => new Response(JSON.stringify({ features: [] }), { status: 200 }))
    expect(await reverseGeocode(0, 0)).toBeNull()
  })

  it('returns null when the postcode is malformed', async () => {
    mockFetch(() =>
      new Response(JSON.stringify({ features: [{ properties: { city: 'X', postcode: 'abc' } }] }), { status: 200 }),
    )
    expect(await reverseGeocode(43.48, -1.56)).toBeNull()
  })

  it('returns null when fetch throws', async () => {
    mockFetch(() => { throw new Error('network down') })
    expect(await reverseGeocode(43.48, -1.56)).toBeNull()
  })
})

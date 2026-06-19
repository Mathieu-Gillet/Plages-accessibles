import { describe, it, expect } from 'vitest'
import { validateCandidate, type Candidate } from '../scripts/lib/validate-candidate'

const LONG_DESC =
  'La Grande Plage de Biarritz est une plage urbaine de sable fin disposant ' +
  'd\'un cheminement accessible, de fauteuils amphibies et de sanitaires adaptés ' +
  'aux personnes à mobilité réduite tout au long de la saison estivale.'

function baseCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    slug: 'grande-plage-biarritz',
    nom: 'Grande Plage',
    commune: 'Biarritz',
    codePostal: '64200',
    departement: 'Pyrénées-Atlantiques',
    region: 'Nouvelle-Aquitaine',
    latitude: 43.48,
    longitude: -1.56,
    verifiedBy: 'openstreetmap',
    description: LONG_DESC,
    accessibilites: ['FAUTEUIL_ROULANT', 'SANITAIRES_ADAPTES'],
    ...overrides,
  }
}

describe('validateCandidate', () => {
  it('accepts a well-formed candidate from an allowlisted source', () => {
    const res = validateCandidate(baseCandidate())
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.plage.slug).toBe('grande-plage-biarritz')
      expect(res.plage.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/) // defaulted to today
    }
  })

  it('rejects an unlabelled source', () => {
    const res = validateCandidate(baseCandidate({ verifiedBy: 'random-blog' }))
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toMatch(/non labellisée/)
  })

  it('rejects coordinates outside France (e.g. 0,0 placeholder)', () => {
    const res = validateCandidate(baseCandidate({ latitude: 0, longitude: 0 }))
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toMatch(/hors France/)
  })

  it('rejects a too-short description', () => {
    const res = validateCandidate(baseCandidate({ description: 'Trop court.' }))
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toMatch(/description trop courte/)
  })

  it('rejects a candidate with no documented accessibility feature', () => {
    const res = validateCandidate(baseCandidate({ accessibilites: [] }))
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toMatch(/accessibilités/)
  })
})

import { describe, it, expect } from 'vitest'
import { isOffTopicPhoto } from '../scripts/lib/wikimedia'

const commons = (file: string) =>
  `https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/${file}/1200px-${file}`

describe('isOffTopicPhoto', () => {
  it('rejects town-hall / church / bridge / station photos', () => {
    // Real offenders found in production content:
    expect(isOffTopicPhoto(commons('Audg_-_Mairie_W.jpg'))).toBe(true)
    expect(isOffTopicPhoto(commons('Mairie_de_Gravelines.jpg'))).toBe(true)
    expect(isOffTopicPhoto(commons('Eglise_Lanton_02.jpg'))).toBe(true)
    expect(isOffTopicPhoto(commons('Libourne_Pont_de_Pierre.jpg'))).toBe(true)
    expect(isOffTopicPhoto(commons('Ouistreham-Capitainerie-du-port.JPG'))).toBe(true)
    expect(isOffTopicPhoto(commons('Place_St-Pierre_en_2014_(Toulouse).JPG'))).toBe(true)
  })

  it('keeps genuine beach photos even when they also mention a bridge/port', () => {
    // "pont"/"port" tokens present, but a beach keyword redeems them:
    expect(isOffTopicPhoto(commons('Plage_de_LE_PORTEL.jpg'))).toBe(false)
    expect(isOffTopicPhoto(commons('Pornic_-_Plage_du_port.jpg'))).toBe(false)
    expect(isOffTopicPhoto(commons("Panneau_plage_du_Pont_d'Yeu.JPG"))).toBe(false)
    expect(isOffTopicPhoto(commons('Plage_(Port_Grimaud)_(1).jpg'))).toBe(false)
  })

  it('keeps clearly-beach filenames', () => {
    expect(isOffTopicPhoto(commons('Cabourg_beach.jpg'))).toBe(false)
    expect(isOffTopicPhoto(commons('Plage_du_Prado_Marseille.jpg'))).toBe(false)
    expect(isOffTopicPhoto(commons('Dune_du_Pilat.jpg'))).toBe(false)
  })
})

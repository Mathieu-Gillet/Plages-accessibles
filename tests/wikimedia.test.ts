import { describe, it, expect } from 'vitest'
import { isOffTopicPhoto, isNonPhotographic, filenameMatchesPlace } from '../scripts/lib/wikimedia'

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

describe('isNonPhotographic', () => {
  it('rejects artwork and cartographic plates even when they say "plage"', () => {
    // Real offenders found in production content — all carry a beach keyword,
    // so the off-topic filter alone let every one of them through.
    expect(isNonPhotographic(commons('Morisot_Personnages_sur_la_plage.png'))).toBe(true)
    expect(isNonPhotographic(commons('83129-Six-Fours-les-Plages-Sols.png'))).toBe(true)
    expect(isNonPhotographic(commons('17051-Le_Bois-Plage-en-Ré-Routes-Hydro.png'))).toBe(true)
    expect(isNonPhotographic(commons('Les_voies_de_Stella-Plage_-_Cucq.png'))).toBe(true)
    expect(isNonPhotographic(commons('Carte_de_la_plage_de_Cabourg.jpg'))).toBe(true)
    expect(isNonPhotographic(commons('Blason_de_Biarritz.jpg'))).toBe(true)
  })

  it('rejects non-free files hosted outside Commons', () => {
    // fr.wikipedia local uploads are fair-use only (film posters, album covers):
    // "La Plage" is the 2000 film, not a beach in Cavalaire-sur-Mer.
    expect(isNonPhotographic('https://upload.wikimedia.org/wikipedia/fr/6/65/La_Plage.png')).toBe(true)
    expect(isNonPhotographic('https://upload.wikimedia.org/wikipedia/en/1/12/Beach.jpg')).toBe(true)
  })

  it('accepts genuine Commons photographs', () => {
    expect(isNonPhotographic(commons('Plage_du_Prado_Marseille.jpg'))).toBe(false)
    expect(isNonPhotographic(commons('Ouistreham-Plage.JPG'))).toBe(false)
    expect(
      isNonPhotographic(
        'https://upload.wikimedia.org/wikipedia/commons/5/5a/La_Londe-les-Maures_-_Plage_des_Bormettes.webp',
      ),
    ).toBe(false)
  })

  it('keeps "plan d\'eau", the usual French term for the inland sites listed here', () => {
    expect(isNonPhotographic(commons("Plan_d'eau_de_Praz-sur-Arly.jpg"))).toBe(false)
  })

  it('ignores the tracking query string appended by the Commons API', () => {
    expect(
      isNonPhotographic(
        'https://upload.wikimedia.org/wikipedia/commons/a/ae/Morisot_Personnages_sur_la_plage.png?utm_source=commons.wikimedia.org',
      ),
    ).toBe(true)
  })
})

describe('filenameMatchesPlace', () => {
  it('rejects a file unrelated to the commune we searched for', () => {
    // `intitle:plage Bourges` only constrains "plage" to the title — the commune
    // is a loose full-text term, so an unrelated painting could win.
    expect(
      filenameMatchesPlace(commons('Morisot_Personnages_sur_la_plage.png'), "Plage du Lac d'Auron", 'Bourges'),
    ).toBe(false)
  })

  it('accepts a file naming the commune or the beach', () => {
    expect(
      filenameMatchesPlace(commons('La_plage_des_catalans,_Marseille_-_panoramio.jpg'), 'Plage du Prado', 'Marseille'),
    ).toBe(true)
    expect(filenameMatchesPlace(commons('Socoa-Ciboure,_près_de_la_plage.JPG'), 'Plage du Fort', 'Ciboure')).toBe(true)
    // Matched on the beach name rather than the commune:
    expect(filenameMatchesPlace(commons('Dune_du_Pilat_2019.jpg'), 'Dune du Pilat', 'La Teste-de-Buch')).toBe(true)
  })

  it('is accent-insensitive', () => {
    expect(filenameMatchesPlace(commons('Plage_de_Nimes.jpg'), 'Plage', 'Nîmes')).toBe(true)
  })

  it('accepts when the place has no distinctive token to match on', () => {
    // "Èze" is too short to discriminate — better to accept than to over-reject.
    expect(filenameMatchesPlace(commons('Plage_de_galets.jpg'), 'Plage', 'Èze')).toBe(true)
  })
})

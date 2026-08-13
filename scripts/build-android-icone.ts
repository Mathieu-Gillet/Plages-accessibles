// scripts/build-android-icone.ts
// Fabrique l'icône Android et les visuels du Play Store à partir de
// `content/preview.webp`.
//
// Run: `npx tsx scripts/build-android-icone.ts`
//
// Une icône adaptative Android est faite de deux couches de 108×108 dp que le
// lanceur détoure lui-même (cercle, carré arrondi, goutte selon le constructeur).
// L'image fournie contient déjà son fond bleu et son cadre arrondi : la reprendre
// telle quelle produirait un fond dans un fond, et le masque rognerait l'emblème.
// On la décompose donc : le bleu devient la couche de fond, l'emblème circulaire
// la couche avant, réduit dans la « zone sûre » centrale de 66 % que tous les
// masques préservent.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

// Le projet Android vit dans un dépôt séparé (Mathieu-Gillet/app_plages-accessibles),
// non public. Ce script reste ici parce que sa source est un visuel du site ; il écrit
// dans le clone de l'app, désigné par `APP_ANDROID` ou, à défaut, cherché à côté de
// ce dépôt.
const SOURCE = path.join(process.cwd(), 'content', 'preview.webp')
const APP_ANDROID = process.env.APP_ANDROID ?? path.join(process.cwd(), '..', 'app_plages-accessibles')
const RES = path.join(APP_ANDROID, 'app', 'src', 'main', 'res')
const STORE = path.join(APP_ANDROID, 'store')

/** Densités Android : mdpi vaut 48 dp, les autres en sont des multiples. */
const DENSITES: Array<{ dossier: string; taille: number }> = [
  { dossier: 'mipmap-mdpi', taille: 108 },
  { dossier: 'mipmap-hdpi', taille: 162 },
  { dossier: 'mipmap-xhdpi', taille: 216 },
  { dossier: 'mipmap-xxhdpi', taille: 324 },
  { dossier: 'mipmap-xxxhdpi', taille: 432 },
]

/**
 * Part de la couche avant réellement occupée par l'emblème.
 * 0,66 est la zone garantie visible quel que soit le masque du lanceur ; on
 * reste très légèrement en dessous pour que le liseré blanc du cercle respire.
 */
const PART_EMBLEME = 0.62

/** Dégradé vertical, repris de l'image d'origine. */
function degradeSvg(largeur: number, haut: string, bas: string, hauteur = largeur): string {
  return `<svg width="${largeur}" height="${hauteur}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fond" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${haut}"/>
        <stop offset="1" stop-color="${bas}"/>
      </linearGradient>
    </defs>
    <rect width="${largeur}" height="${hauteur}" fill="url(#fond)"/>
  </svg>`
}

async function main(): Promise<void> {
  // Sans ce garde-fou, `mkdir -p` fabriquerait une arborescence Android orpheline
  // à côté du dépôt au lieu de signaler que le clone de l'app est introuvable.
  try {
    await fs.access(path.join(APP_ANDROID, 'settings.gradle.kts'))
  } catch {
    throw new Error(
      `Clone de l'app Android introuvable dans ${APP_ANDROID}.\n` +
        `Clonez github.com/Mathieu-Gillet/app_plages-accessibles à côté de ce dépôt, ` +
        `ou indiquez son chemin : APP_ANDROID=/chemin/vers/le/clone npx tsx scripts/build-android-icone.ts`,
    )
  }

  const source = sharp(SOURCE)
  const meta = await source.metadata()
  const cote = Math.min(meta.width ?? 1024, meta.height ?? 1024)

  // Le fond n'est pas un aplat mais un dégradé, du bleu franc en haut au bleu
  // nuit en bas. On prélève donc deux teintes plutôt qu'une, dans la bande
  // gauche : les coins tombent hors du cadre arrondi, et le centre est occupé
  // par le cercle blanc.
  // Lecture des pixels bruts plutôt que `stats()` : cette dernière mesure
  // l'image d'entrée et ignore le recadrage qui la précède dans le pipeline —
  // elle renvoyait la moyenne de tout le logo, quel que soit le point demandé.
  const { data: pixels, info } = await sharp(SOURCE)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const prelever = (fractionY: number): string => {
    const x0 = Math.round(info.width * 0.03)
    const x1 = Math.round(info.width * 0.06)
    const y0 = Math.round(info.height * fractionY)
    const y1 = y0 + Math.round(info.height * 0.04)

    let sr = 0
    let sv = 0
    let sb = 0
    let n = 0
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * info.width + x) * info.channels
        sr += pixels[i]
        sv += pixels[i + 1]
        sb += pixels[i + 2]
        n++
      }
    }
    const moy = [sr / n, sv / n, sb / n].map((c) => Math.round(c))
    return `#${moy.map((c) => c.toString(16).padStart(2, '0')).join('')}`
  }

  const hautHex = prelever(0.25)
  const basHex = prelever(0.75)
  console.log(`Dégradé de fond : ${hautHex} → ${basHex}`)

  // L'emblème est le disque central. On le découpe puis on le détoure au
  // cercle : conserver son pourtour bleu dessinerait un carré visible une fois
  // la vignette posée sur le dégradé, dont la teinte varie avec la hauteur.
  const marge = Math.round(cote * 0.105)
  const coteEmbleme = cote - marge * 2
  const masque = Buffer.from(
    `<svg width="${coteEmbleme}" height="${coteEmbleme}">
       <circle cx="${coteEmbleme / 2}" cy="${coteEmbleme / 2}" r="${coteEmbleme / 2}" fill="#fff"/>
     </svg>`,
  )

  const embleme = await sharp(SOURCE)
    .extract({ left: marge, top: marge, width: coteEmbleme, height: coteEmbleme })
    .composite([{ input: masque, blend: 'dest-in' }])
    .png()
    .toBuffer()

  for (const { dossier, taille } of DENSITES) {
    const cible = path.join(RES, dossier)
    await fs.mkdir(cible, { recursive: true })

    const tailleEmbleme = Math.round(taille * PART_EMBLEME)
    const decalage = Math.round((taille - tailleEmbleme) / 2)

    const emblemeRedim = await sharp(embleme)
      .resize(tailleEmbleme, tailleEmbleme, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()

    // Couche avant : emblème centré sur du transparent.
    await sharp({
      create: {
        width: taille,
        height: taille,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: emblemeRedim, left: decalage, top: decalage }])
      .png()
      .toFile(path.join(cible, 'ic_launcher_foreground.png'))

    // Couche de fond : le dégradé de l'image d'origine, que le lanceur
    // détourera lui-même selon sa forme de masque.
    await sharp(Buffer.from(degradeSvg(taille, hautHex, basHex)))
      .png()
      .toFile(path.join(cible, 'ic_launcher_background.png'))
  }
  console.log(`✓ icône adaptative écrite dans ${DENSITES.length} densités`)

  // ── Visuels du Play Store ────────────────────────────────────────────────
  await fs.mkdir(STORE, { recursive: true })

  // Icône de la fiche : 512×512, sans transparence (Google la refuse).
  // Ici on garde l'image d'origine telle quelle : le Play Store applique son
  // propre arrondi et n'a pas besoin des deux couches.
  await sharp(SOURCE)
    .resize(512, 512, { fit: 'cover' })
    .flatten({ background: '#ffffff' })
    .png()
    .toFile(path.join(STORE, 'icone-512.png'))

  // Bandeau 1024×500 : l'emblème posé sur l'aplat de marque, décalé à gauche
  // pour laisser respirer le titre que Google superpose parfois.
  const emblemeBandeau = await sharp(embleme)
    .resize(380, 380, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  await sharp(Buffer.from(degradeSvg(1024, hautHex, basHex, 500)))
    .composite([{ input: emblemeBandeau, left: 90, top: 60 }])
    .png()
    .toFile(path.join(STORE, 'bandeau-1024x500.png'))

  console.log(`✓ visuels Play Store écrits dans ${path.relative(process.cwd(), STORE)}`)
}

void main()

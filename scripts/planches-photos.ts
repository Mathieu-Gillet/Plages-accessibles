// scripts/planches-photos.ts
// Assemble les photos du catalogue en planches-contact, pour relecture visuelle.
//
// Run: `npx tsx scripts/planches-photos.ts [--toutes] [--sortie <dossier>]`
//   défaut      seules les photos absentes de content/photos-validees.json
//   --toutes    toutes les photos, y compris celles déjà relues
//
// Aucun automate ne distingue une plage d'une mairie, d'un panneau ou d'un
// tableau de Gauguin — et Wikimedia Commons renvoie les trois pour une requête
// « plage <commune> ». La relecture reste humaine ; ce script se contente de la
// rendre praticable en une poignée d'images au lieu de 250 onglets.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import type { OverlayOptions } from 'sharp'

const CONTENT = path.join(process.cwd(), 'content', 'plages')
const VALIDEES = path.join(process.cwd(), 'content', 'photos-validees.json')
const UA = 'Plages-Accessibles-Bot/1.0 (https://plages-accessibles.fr; falathar329@gmail.com)'

const TUILE_L = 260
const TUILE_H = 195
const COLS = 5
const LIGNES = 5
const PAR_PLANCHE = COLS * LIGNES

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Wikimedia coupe les rafales : sans temporisation, une passe se fait jeter. */
async function telecharger(url: string, cacheDir: string, slug: string): Promise<Buffer | null> {
  const cible = path.join(cacheDir, `${slug}.bin`)
  try {
    return await fs.readFile(cible)
  } catch {
    /* pas encore en cache */
  }

  for (let essai = 0; essai < 4; essai++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (res.status === 429 || res.status >= 500) {
        await pause(3000 * (essai + 1))
        continue
      }
      if (!res.ok) return null
      const buf = Buffer.from(await res.arrayBuffer())
      await fs.writeFile(cible, buf)
      await pause(350)
      return buf
    } catch {
      await pause(2000)
    }
  }
  return null
}

function etiquette(numero: number): Buffer {
  return Buffer.from(
    `<svg width="${TUILE_L}" height="26">
       <rect x="0" y="0" width="46" height="26" fill="#000000cc"/>
       <text x="8" y="19" font-family="sans-serif" font-size="16" fill="#ffffff">${numero}</text>
     </svg>`,
  )
}

async function main(): Promise<void> {
  const toutes = process.argv.includes('--toutes')
  const iSortie = process.argv.indexOf('--sortie')
  const sortie = iSortie >= 0 ? process.argv[iSortie + 1] : 'planches-photos'
  const cacheDir = path.join(sortie, '.cache')

  await fs.mkdir(cacheDir, { recursive: true })

  const validees: Set<string> = toutes
    ? new Set()
    : new Set(
        await fs
          .readFile(VALIDEES, 'utf8')
          .then((b) => (JSON.parse(b) as { urls?: string[] }).urls ?? [])
          .catch(() => []),
      )

  const fichiers = (await fs.readdir(CONTENT)).filter((f) => f.endsWith('.json'))
  const aRelire: Array<{ slug: string; nom: string; commune: string; photo: string }> = []

  for (const f of fichiers) {
    const d = JSON.parse(await fs.readFile(path.join(CONTENT, f), 'utf8'))
    const photo: string | null = d.photo ?? null
    if (!photo || photo.includes('picsum.photos')) continue
    if (validees.has(photo)) continue
    aRelire.push({ slug: d.slug, nom: d.nom, commune: d.commune, photo })
  }

  if (aRelire.length === 0) {
    console.log('Toutes les photos du catalogue ont déjà été relues.')
    return
  }
  console.log(`${aRelire.length} photo(s) à relire\n`)

  for (let p = 0; p * PAR_PLANCHE < aRelire.length; p++) {
    const lot = aRelire.slice(p * PAR_PLANCHE, (p + 1) * PAR_PLANCHE)
    const calques: OverlayOptions[] = []

    for (let i = 0; i < lot.length; i++) {
      const item = lot[i]
      const numero = p * PAR_PLANCHE + i + 1
      console.log(`${numero}\t${item.slug}\t${item.nom} — ${item.commune}`)

      const brut = await telecharger(item.photo, cacheDir, item.slug)
      if (!brut) continue

      try {
        const tuile = await sharp(brut).resize(TUILE_L, TUILE_H, { fit: 'cover' }).jpeg().toBuffer()
        const col = i % COLS
        const ligne = Math.floor(i / COLS)
        calques.push({ input: tuile, left: col * TUILE_L, top: ligne * TUILE_H })
        calques.push({ input: etiquette(numero), left: col * TUILE_L, top: ligne * TUILE_H })
      } catch {
        console.log('   (illisible)')
      }
    }

    await sharp({
      create: {
        width: COLS * TUILE_L,
        height: LIGNES * TUILE_H,
        channels: 3,
        background: { r: 20, g: 30, b: 40 },
      },
    })
      .composite(calques)
      .jpeg({ quality: 78 })
      .toFile(path.join(sortie, `planche-${String(p + 1).padStart(2, '0')}.jpg`))
  }

  console.log(`\nPlanches écrites dans ${sortie}/`)
}

void main()

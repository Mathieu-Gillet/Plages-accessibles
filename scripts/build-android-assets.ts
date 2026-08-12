// scripts/build-android-assets.ts
// Compile content/plages/*.json en un asset unique embarqué dans l'APK Android.
//
// Run: `npx tsx scripts/build-android-assets.ts`
//
// L'app mobile est utilisable hors réseau — c'est le point : on consulte une
// fiche plage *sur la plage*, là où la 4G manque le plus souvent. Les 268
// fiches voyagent donc dans l'APK ; seules les notes communautaires (votes)
// restent en ligne.
//
// Chaque fiche passe par le même schéma Zod que le site : un contenu invalide
// casse la génération de l'asset, jamais l'app en production.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { plageContentSchema } from '../src/lib/content-schema'
import type { TypeAccessibilite } from '../src/types'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'plages')
const ASSET_PATH = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'assets', 'plages.json')

/**
 * Fiche telle que l'app la consomme. Volontairement plus pauvre que
 * `PlageDetail` côté site : hébergements et offres culturelles pèsent la
 * moitié du contenu et n'apparaissent sur aucune maquette mobile.
 *
 * La `description` est également écartée. Générée pour la plupart des fiches à
 * partir d'un gabarit, elle répète ce que les pastilles d'équipements disent
 * déjà en un coup d'œil, et occupait sur mobile la place qui revient aux avis
 * de visiteurs. Le site la conserve : elle y alimente la balise meta
 * description et le JSON-LD schema.org, où elle a une vraie utilité.
 */
interface PlageAsset {
  slug: string
  nom: string
  commune: string
  codePostal: string
  departement: string
  region: string
  latitude: number
  longitude: number
  photo: string | null
  accessibilites: TypeAccessibilite[]
  verifiedAt: string | null
  verifiedBy: string | null
}

/** `accessibilites` accepte deux formes dans le contenu : "TIRALO" ou { type, disponible }. */
function typesDisponibles(
  brut: ReturnType<typeof plageContentSchema.parse>['accessibilites'],
): TypeAccessibilite[] {
  return brut
    .filter((a) => typeof a === 'string' || a.disponible)
    .map((a) => (typeof a === 'string' ? a : a.type))
}

/** Les photos picsum sont des bouche-trous : inutile de les embarquer. */
function photoReelle(url: string | null | undefined): string | null {
  if (!url || url.includes('picsum.photos')) return null
  return url
}

async function main(): Promise<void> {
  const fichiers = (await fs.readdir(CONTENT_DIR)).filter((f) => f.endsWith('.json'))

  const plages: PlageAsset[] = []
  let inactives = 0

  for (const fichier of fichiers) {
    const contenu = await fs.readFile(path.join(CONTENT_DIR, fichier), 'utf-8')
    const parsed = plageContentSchema.safeParse(JSON.parse(contenu))

    if (!parsed.success) {
      console.error(`✗ ${fichier} : contenu invalide`)
      console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2))
      process.exit(1)
    }

    const p = parsed.data
    // Même règle que le site : une fiche `actif: false` n'est publiée nulle part.
    if (!p.actif) {
      inactives++
      continue
    }

    plages.push({
      slug: p.slug,
      nom: p.nom,
      commune: p.commune,
      codePostal: p.codePostal,
      departement: p.departement,
      region: p.region,
      latitude: p.latitude,
      longitude: p.longitude,
      photo: photoReelle(p.photo),
      accessibilites: typesDisponibles(p.accessibilites),
      verifiedAt: p.verifiedAt ?? null,
      verifiedBy: p.verifiedBy ?? null,
    })
  }

  // Tri stable par nom : l'asset est versionné, un ordre dépendant du système
  // de fichiers produirait un diff à chaque génération.
  plages.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))

  await fs.mkdir(path.dirname(ASSET_PATH), { recursive: true })
  await fs.writeFile(ASSET_PATH, JSON.stringify({ plages }), 'utf-8')

  const taille = (await fs.stat(ASSET_PATH)).size
  const avecPhoto = plages.filter((p) => p.photo).length
  console.log(`✓ ${plages.length} plages → ${path.relative(process.cwd(), ASSET_PATH)}`)
  console.log(`  ${avecPhoto} avec photo · ${inactives} fiches inactives ignorées · ${(taille / 1024).toFixed(0)} Ko`)
}

void main()

// scripts/add-plage.ts
// Insère une ou plusieurs plages en base sans doublons.
// Usage : tsx scripts/add-plage.ts --json '<JSON>'
//         tsx scripts/add-plage.ts --file scripts/import/plages.json

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'

const prisma = new PrismaClient()

export type PlageInput = {
  nom: string
  slug: string
  commune: string
  codePostal: string
  departement: string
  region: string
  latitude: number
  longitude: number
  description?: string
  photo?: string
  photos?: string[]
  accessibilites?: Array<{
    type: TypeAccessibilite
    details?: string
  }>
}

type TypeAccessibilite =
  | 'FAUTEUIL_ROULANT'
  | 'HANDISURF'
  | 'TIRALO'
  | 'HIPPOCAMPE'
  | 'PARKINGS_PMR'
  | 'SANITAIRES_ADAPTES'
  | 'DOUCHES_ACCESSIBLES'
  | 'CHEMIN_ACCES'
  | 'RAMPE_ACCES'
  | 'SABLE_COMPACT'
  | 'PERSONNEL_FORME'
  | 'SIGNALISATION_BRAILLE'
  | 'BOUCLE_MAGNETIQUE'
  | 'LOCATION_MATERIEL'

export async function addPlage(data: PlageInput): Promise<'added' | 'skipped'> {
  const existing = await prisma.plage.findUnique({ where: { slug: data.slug } })
  if (existing) {
    console.log(`⏭  Déjà existante : ${data.nom} (${data.commune})`)
    return 'skipped'
  }

  await prisma.plage.create({
    data: {
      nom: data.nom,
      slug: data.slug,
      commune: data.commune,
      codePostal: data.codePostal,
      departement: data.departement,
      region: data.region,
      latitude: data.latitude,
      longitude: data.longitude,
      description: data.description ?? null,
      photo: data.photo ?? null,
      photos: data.photos ?? [],
      actif: true,
      accessibilites: {
        create: (data.accessibilites ?? []).map((a) => ({
          type: a.type,
          details: a.details ?? null,
          disponible: true,
        })),
      },
    },
  })

  console.log(`✅ Ajoutée : ${data.nom} (${data.commune}, ${data.departement})`)
  return 'added'
}

export function toSlug(nom: string, commune: string): string {
  return `${nom}-${commune}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function main() {
  const args = process.argv.slice(2)
  let plages: PlageInput[] = []

  const jsonIdx = args.indexOf('--json')
  const fileIdx = args.indexOf('--file')

  if (jsonIdx !== -1) {
    const raw = args[jsonIdx + 1]
    const parsed = JSON.parse(raw)
    plages = Array.isArray(parsed) ? parsed : [parsed]
  } else if (fileIdx !== -1) {
    const raw = readFileSync(args[fileIdx + 1], 'utf-8')
    const parsed = JSON.parse(raw)
    plages = Array.isArray(parsed) ? parsed : [parsed]
  } else {
    console.error('Usage: tsx scripts/add-plage.ts --json \'<JSON>\' | --file <path>')
    process.exit(1)
  }

  let added = 0
  let skipped = 0

  for (const plage of plages) {
    if (!plage.slug) plage.slug = toSlug(plage.nom, plage.commune)
    const result = await addPlage(plage)
    result === 'added' ? added++ : skipped++
  }

  console.log(`\n📊 Résultat : ${added} ajoutée(s), ${skipped} ignorée(s) (doublon)`)
}

main().finally(() => prisma.$disconnect())

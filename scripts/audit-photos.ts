// scripts/audit-photos.ts
// Passe en revue les photos déjà publiées et écarte celles qui ne montrent pas
// la plage : cartes anciennes, gravures, scans d'archives, noir et blanc, sépia.
//
// Run: `npx tsx scripts/audit-photos.ts`            → rapport seul, rien n'est écrit
//      `npx tsx scripts/audit-photos.ts --appliquer` → remet les rejetées en repli
//
// Une photo rejetée redevient un placeholder : `enrich-photos.ts` la reprendra
// au prochain passage et tentera une autre source. Rien n'est perdu.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { verifierPhoto } from './lib/photo-qualite'
import { ajouterPhotosRejetees } from './lib/photos-rejetees'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'plages')

interface BeachJson {
  slug: string
  nom: string
  commune: string
  photo?: string | null
  [key: string]: unknown
}

function estPlaceholder(url: string | null | undefined): boolean {
  return !url || url.includes('picsum.photos')
}

function placeholderPour(slug: string): string {
  return `https://picsum.photos/seed/${slug}/1200/600`
}

async function main(): Promise<void> {
  const appliquer = process.argv.includes('--appliquer')
  const fichiers = (await fs.readdir(CONTENT_DIR)).filter((f) => f.endsWith('.json'))

  const rejetees: Array<{ slug: string; motif: string; url: string }> = []
  let verifiees = 0
  let ignorees = 0

  for (const fichier of fichiers) {
    const chemin = path.join(CONTENT_DIR, fichier)
    const data = JSON.parse(await fs.readFile(chemin, 'utf8')) as BeachJson

    if (estPlaceholder(data.photo)) {
      ignorees++
      continue
    }

    const qualite = await verifierPhoto(data.photo as string)
    verifiees++

    if (qualite.acceptable) {
      process.stdout.write('.')
      continue
    }

    process.stdout.write('\n')
    console.log(`✗ ${data.slug} — ${qualite.motif}`)
    rejetees.push({ slug: data.slug, motif: qualite.motif ?? '', url: data.photo as string })

    if (appliquer) {
      data.photo = placeholderPour(data.slug)
      await fs.writeFile(chemin, JSON.stringify(data, null, 2) + '\n', 'utf8')
    }
  }

  if (appliquer && rejetees.length > 0) {
    // Sans cet enregistrement, le cron d'enrichissement réattribuerait les
    // mêmes images dès le lendemain : la recherche Wikimedia est déterministe.
    const ajoutees = await ajouterPhotosRejetees(rejetees.map((r) => r.url))
    console.log(`\n${ajoutees} URL ajoutée(s) à content/photos-rejetees.json`)
  }

  console.log('\n')
  console.log(`Vérifiées : ${verifiees}  |  Déjà sans photo : ${ignorees}  |  Rejetées : ${rejetees.length}`)

  if (rejetees.length > 0 && !appliquer) {
    console.log('\nRelancer avec --appliquer pour remettre ces fiches en repli,')
    console.log('puis `npx tsx scripts/enrich-photos.ts` pour leur chercher une autre photo.')
  }
}

void main()

// scripts/lib/photos-rejetees.ts
// Liste des images écartées après relecture : elles ne doivent jamais revenir.
//
// Sans elle, la purge ne tiendrait pas une nuit. `enrich-photos.yml` tourne en
// cron et refait exactement la même recherche déterministe sur Wikimedia : la
// mairie, la carte postale de 1900 ou la carte marine qu'on vient de retirer
// seraient réattribuées au prochain passage.
//
// Le fichier est versionné avec le contenu, à la manière du reste du projet :
// pas de base, une décision éditoriale visible dans l'historique Git.

import { promises as fs } from 'node:fs'
import path from 'node:path'

const FICHIER = path.join(process.cwd(), 'content', 'photos-rejetees.json')

export async function chargerPhotosRejetees(): Promise<Set<string>> {
  try {
    const brut = await fs.readFile(FICHIER, 'utf8')
    const { urls } = JSON.parse(brut) as { urls?: string[] }
    return new Set(urls ?? [])
  } catch {
    // Fichier absent au premier usage : ce n'est pas une erreur.
    return new Set()
  }
}

export async function ajouterPhotosRejetees(nouvelles: Iterable<string>): Promise<number> {
  const existantes = await chargerPhotosRejetees()
  const avant = existantes.size
  for (const url of nouvelles) existantes.add(url)

  await fs.writeFile(
    FICHIER,
    JSON.stringify({ urls: [...existantes].sort() }, null, 2) + '\n',
    'utf8',
  )
  return existantes.size - avant
}

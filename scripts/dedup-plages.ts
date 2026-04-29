// scripts/dedup-plages.ts
// Standalone duplicate-beach cleaner.
// Run manually : npx tsx scripts/dedup-plages.ts [--dry-run]
// Run by CI     : .github/workflows/dedup-plages.yml
//
// Detects duplicates by photo URL and by GPS proximity (< 500 m).
// Writes the number of deleted files to GITHUB_OUTPUT when running in CI.

import { promises as fs } from 'node:fs'
import { readAllBeaches, dedupBeaches } from './lib/dedup'

async function appendGithubOutput(key: string, value: string): Promise<void> {
  const out = process.env.GITHUB_OUTPUT
  if (!out) return
  await fs.appendFile(out, `${key}=${value}\n`)
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')
  if (dryRun) console.log('[dedup] mode dry-run — aucun fichier supprimé')

  const beaches = await readAllBeaches()
  console.log(`[dedup] ${beaches.length} plage(s) en base`)

  const { deleted } = await dedupBeaches(beaches, dryRun)

  console.log(`\n[dedup] ${deleted.length} doublon(s) supprimé(s)${dryRun ? ' (dry-run)' : ''}`)
  deleted.forEach((s) => console.log(`  x ${s}`))

  await appendGithubOutput('deleted', String(deleted.length))
  await appendGithubOutput('slugs', deleted.join(','))
}

main().catch((err) => {
  console.error('Erreur fatale :', err)
  process.exit(1)
})

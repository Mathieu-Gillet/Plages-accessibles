// scripts/import-plages.ts
// Daily beach import orchestrator. Run as: `npx tsx scripts/import-plages.ts [--dry-run]`
//
// Pipeline:
//   1. Read existing slugs from content/plages/*.json
//   2. Fetch raw candidates from each registered source
//   3. Drop candidates whose slug already exists
//   4. Validate each remaining candidate (Zod + quality gates)
//   5. Take up to MAX_PER_RUN qualified candidates
//   6. Write each as a JSON file under content/plages/
//   7. Emit a summary to stdout AND to GITHUB_OUTPUT (for the workflow)
//
// Exit code is always 0 — even with 0 added — so the workflow can decide
// whether to open a PR based on the `added` output.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { handiplageSampleSource } from './sources/handiplage-sample'
import type { Source } from './sources/types'
import { validateCandidate, type Candidate } from './lib/validate-candidate'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'plages')
const MAX_PER_RUN = 5

const SOURCES: Source[] = [
  handiplageSampleSource,
  // Add more adapters here once available (data.gouv.fr, tourisme-handicap, etc.)
]

interface RunSummary {
  added: string[]
  skippedDuplicates: string[]
  rejected: Array<{ slug: string; reason: string }>
  capped: number
}

async function readExistingSlugs(): Promise<Set<string>> {
  const files = await fs.readdir(CONTENT_DIR)
  const slugs = files
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
  return new Set(slugs)
}

async function gatherCandidates(): Promise<Candidate[]> {
  const all: Candidate[] = []
  for (const source of SOURCES) {
    try {
      const items = await source.fetch()
      console.log(`[source ${source.name}] ${items.length} candidat(s)`)
      all.push(...items)
    } catch (err) {
      console.error(`[source ${source.name}] échec : ${(err as Error).message}`)
    }
  }
  // Dedup across sources by slug (first occurrence wins).
  const seen = new Set<string>()
  return all.filter((c) => {
    if (seen.has(c.slug)) return false
    seen.add(c.slug)
    return true
  })
}

async function writeBeach(slug: string, data: unknown): Promise<void> {
  const file = path.join(CONTENT_DIR, `${slug}.json`)
  await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

async function appendGithubOutput(key: string, value: string): Promise<void> {
  const out = process.env.GITHUB_OUTPUT
  if (!out) return
  await fs.appendFile(out, `${key}=${value}\n`)
}

function printSummary(summary: RunSummary, dryRun: boolean): void {
  console.log('\n=== Récapitulatif ===')
  console.log(`Ajoutées      : ${summary.added.length}${dryRun ? ' (dry-run, non écrites)' : ''}`)
  summary.added.forEach((s) => console.log(`  + ${s}`))
  console.log(`Doublons      : ${summary.skippedDuplicates.length}`)
  summary.skippedDuplicates.forEach((s) => console.log(`  ~ ${s}`))
  console.log(`Rejetées      : ${summary.rejected.length}`)
  summary.rejected.forEach((r) => console.log(`  - ${r.slug} : ${r.reason}`))
  if (summary.capped > 0) {
    console.log(`Plafond MAX_PER_RUN=${MAX_PER_RUN} atteint, ${summary.capped} candidat(s) reportés à demain`)
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')
  const summary: RunSummary = {
    added: [],
    skippedDuplicates: [],
    rejected: [],
    capped: 0,
  }

  const existingSlugs = await readExistingSlugs()
  console.log(`[index] ${existingSlugs.size} plage(s) déjà en base`)

  const candidates = await gatherCandidates()
  console.log(`[total] ${candidates.length} candidat(s) uniques après dedup inter-sources`)

  let qualifiedCount = 0
  for (const candidate of candidates) {
    if (existingSlugs.has(candidate.slug)) {
      summary.skippedDuplicates.push(candidate.slug)
      continue
    }

    const result = validateCandidate(candidate)
    if (!result.ok) {
      summary.rejected.push({ slug: result.slug, reason: result.reason })
      continue
    }

    if (qualifiedCount >= MAX_PER_RUN) {
      summary.capped++
      continue
    }

    if (!dryRun) {
      await writeBeach(result.plage.slug, result.plage)
    }
    summary.added.push(result.plage.slug)
    qualifiedCount++
  }

  printSummary(summary, dryRun)

  // Expose machine-readable outputs for the GitHub Actions workflow.
  await appendGithubOutput('added', String(summary.added.length))
  await appendGithubOutput('rejected', String(summary.rejected.length))
  await appendGithubOutput('slugs', summary.added.join(','))
}

main().catch((err) => {
  console.error('Erreur fatale :', err)
  process.exit(1)
})

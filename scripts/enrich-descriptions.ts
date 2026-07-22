// scripts/enrich-descriptions.ts
// One-shot / cron script: walks content/plages/*.json and rewrites the
// TEMPLATED descriptions (the generic "Plage labellisée Handiplage à …" boiler-
// plate shared by ~195 beaches) into natural French prose using Claude Haiku.
//
// Run: `npx tsx scripts/enrich-descriptions.ts [--dry-run] [--limit N]`
//   --dry-run   compute + print, write nothing
//   --limit N   cap the number of rewrites this run (default DESCRIPTIONS_PER_RUN or 50)
//
// Requires ANTHROPIC_API_KEY. Without it the script exits 0 without touching
// anything (same graceful-degradation contract as the import pipeline).
//
// Only descriptions matching a known TEMPLATE signature are rewritten — genuine
// human/AI descriptions are left untouched. Idempotent: a rewritten description
// no longer matches the template, so re-runs skip it.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { generateDescription, isAiDescriptionAvailable } from './lib/ai-description'
import { TYPES_ACCESSIBILITE } from '../src/lib/content-schema'

type TypeAccessibilite = (typeof TYPES_ACCESSIBILITE)[number]

const CONTENT_DIR = path.join(process.cwd(), 'content', 'plages')
const DEFAULT_LIMIT = Number(process.env.DESCRIPTIONS_PER_RUN) || 50

// Signatures identifying a machine-generated template (not real editorial text).
// Keep this list tight so we never overwrite a genuine description.
const TEMPLATE_MARKERS = [
  'Plage labellisée Handiplage à', // scripts/sources/handiplage-live.ts buildDescription()
]

interface Accessibilite {
  type?: string
  disponible?: boolean
}

interface BeachJson {
  slug: string
  nom: string
  commune: string
  description?: string
  verifiedBy?: string
  accessibilites?: Array<string | Accessibilite>
  [key: string]: unknown
}

function isTemplated(description: string | undefined): boolean {
  if (!description) return false
  return TEMPLATE_MARKERS.some((m) => description.startsWith(m))
}

/** Normalise the accessibilites field (strings or {type,disponible}) to a typed list. */
function mapAccessibilites(raw: BeachJson['accessibilites']): TypeAccessibilite[] {
  return (raw ?? [])
    .map((a) => (typeof a === 'string' ? a : a.disponible === false ? null : a.type))
    .filter((t): t is TypeAccessibilite =>
      t !== null && t !== undefined && (TYPES_ACCESSIBILITE as readonly string[]).includes(t),
    )
}

async function appendGithubOutput(key: string, value: string): Promise<void> {
  const out = process.env.GITHUB_OUTPUT
  if (!out) return
  await fs.appendFile(out, `${key}=${value}\n`)
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')
  const limitFlag = process.argv.indexOf('--limit')
  const limit = limitFlag !== -1 ? Number(process.argv[limitFlag + 1]) || DEFAULT_LIMIT : DEFAULT_LIMIT

  if (!isAiDescriptionAvailable()) {
    console.log('[enrich-descriptions] ANTHROPIC_API_KEY absent — rien à faire.')
    await appendGithubOutput('rewritten', '0')
    return
  }

  const files = (await fs.readdir(CONTENT_DIR)).filter((f) => f.endsWith('.json'))
  let rewritten = 0
  let skipped = 0
  let failed = 0
  const slugs: string[] = []

  for (const file of files) {
    if (rewritten >= limit) break

    const full = path.join(CONTENT_DIR, file)
    const data = JSON.parse(await fs.readFile(full, 'utf8')) as BeachJson

    if (!isTemplated(data.description)) {
      skipped++
      continue
    }

    const accessibilites = mapAccessibilites(data.accessibilites)
    const aiDesc = await generateDescription({
      nom: data.nom,
      commune: data.commune,
      accessibilites,
      // Feed the templated text as source so equipment facts are preserved but
      // reformulated into natural prose (the system prompt forbids inventing).
      nativeText: data.description,
      verifiedBy: data.verifiedBy ?? 'handiplage.fr',
    })

    if (!aiDesc) {
      console.log(`[fail] ${data.slug} — génération IA indisponible`)
      failed++
      continue
    }

    if (!dryRun) {
      data.description = aiDesc
      await fs.writeFile(full, JSON.stringify(data, null, 2) + '\n', 'utf8')
    }
    console.log(`[ok] ${data.slug}${dryRun ? ' (dry-run)' : ''} — ${aiDesc.slice(0, 70)}…`)
    rewritten++
    slugs.push(data.slug)
  }

  console.log(
    `\nRéécrites : ${rewritten}${dryRun ? ' (dry-run)' : ''}  |  Échecs : ${failed}  |  Ignorées (non-template) : ${skipped}`,
  )

  await appendGithubOutput('rewritten', String(rewritten))
  await appendGithubOutput('slugs', slugs.join(','))
}

main().catch((err) => {
  console.error('Erreur fatale :', err)
  process.exit(1)
})

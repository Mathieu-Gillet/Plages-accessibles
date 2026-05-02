// scripts/sources/claude-research.ts
// Claude-API-based research source.
//
// When all open data sources have been exhausted, this source asks Claude to
// suggest French beaches with documented PMR accessibility that are NOT already
// in the local catalog. Output passes through the same Zod + quality gates as
// any other source (GPS in France, ≥1 accessibility, etc.) so hallucinated
// candidates are filtered downstream.
//
// Cost: ~10 beaches × ~250 output tokens × claude-haiku-4-5 ≈ negligible per run.
// Skips silently when ANTHROPIC_API_KEY is absent.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import type { Source } from './types'
import type { Candidate } from '../lib/validate-candidate'
import { makeSlug, regionFromCodePostal, departementFromCodePostal } from '../lib/geo'
import { TYPES_ACCESSIBILITE } from '../../src/lib/content-schema'

type TypeAccessibilite = (typeof TYPES_ACCESSIBILITE)[number]

const TARGET_COUNT = 12
const CONTENT_DIR = path.join(process.cwd(), 'content', 'plages')

interface ClaudeBeach {
  nom: string
  commune: string
  codePostal: string
  latitude: number
  longitude: number
  accessibilites: string[]
  description: string
}

const SYSTEM_PROMPT = `\
Tu es expert en tourisme accessible en France. Ta mission : proposer des plages françaises (métropole + DOM-TOM) connues pour leurs aménagements PMR et qui NE SONT PAS dans la liste fournie par l'utilisateur.

Tu réponds UNIQUEMENT avec un objet JSON valide, sans préambule ni markdown, structuré ainsi :

{
  "plages": [
    {
      "nom": "Plage de la Corniche",
      "commune": "Sète",
      "codePostal": "34200",
      "latitude": 43.3839,
      "longitude": 3.6478,
      "accessibilites": ["FAUTEUIL_ROULANT", "PARKINGS_PMR", "SANITAIRES_ADAPTES"],
      "description": "Longue plage de sable fin équipée d'un cheminement bois jusqu'au bord de l'eau, parking PMR à proximité immédiate et sanitaires adaptés. La pente douce et la baignade surveillée en saison la rendent particulièrement adaptée aux familles avec personnes à mobilité réduite."
    }
  ]
}

Contraintes absolues :
- Plages réelles et vérifiables (label Tourisme & Handicap, label Handiplage, ou aménagements documentés publiquement)
- Coordonnées GPS précises (latitude/longitude en degrés décimaux, ±0.01°)
- Code postal à 5 chiffres exact de la commune
- Au moins 1 accessibilité par plage parmi : FAUTEUIL_ROULANT, HANDISURF, TIRALO, HIPPOCAMPE, PARKINGS_PMR, SANITAIRES_ADAPTES, DOUCHES_ACCESSIBLES, CHEMIN_ACCES, RAMPE_ACCES, SABLE_COMPACT, PERSONNEL_FORME, SIGNALISATION_BRAILLE, BOUCLE_MAGNETIQUE, LOCATION_MATERIEL
- Description en français entre 150 et 300 caractères, factuelle, sans superlatifs
- Aucune plage déjà présente dans la liste de l'utilisateur (vérifier nom + commune)
- Diversifier géographiquement : étaler les propositions sur plusieurs régions
- Si tu n'es pas sûr de l'existence d'une plage ou de ses coordonnées, NE LA PROPOSE PAS`.trim()

async function loadExistingBeaches(): Promise<Array<{ nom: string; commune: string }>> {
  try {
    const files = await fs.readdir(CONTENT_DIR)
    const beaches: Array<{ nom: string; commune: string }> = []
    for (const f of files.filter((f) => f.endsWith('.json'))) {
      try {
        const raw = await fs.readFile(path.join(CONTENT_DIR, f), 'utf8')
        const data = JSON.parse(raw) as { nom?: string; commune?: string }
        if (data.nom && data.commune) {
          beaches.push({ nom: data.nom, commune: data.commune })
        }
      } catch { /* ignore malformed file */ }
    }
    return beaches
  } catch {
    return []
  }
}

function isValidAccessibilite(a: string): a is TypeAccessibilite {
  return (TYPES_ACCESSIBILITE as readonly string[]).includes(a)
}

function toCandidate(b: ClaudeBeach): Candidate | null {
  if (!b.nom || !b.commune || !/^\d{5}$/.test(b.codePostal)) return null
  if (typeof b.latitude !== 'number' || typeof b.longitude !== 'number') return null

  const accessibilites = (b.accessibilites ?? []).filter(isValidAccessibilite)
  if (accessibilites.length < 1) return null

  const slug = makeSlug(b.nom, b.commune)
  return {
    slug,
    nom: b.nom,
    commune: b.commune,
    codePostal: b.codePostal,
    departement: departementFromCodePostal(b.codePostal),
    region: regionFromCodePostal(b.codePostal),
    latitude: b.latitude,
    longitude: b.longitude,
    accessibilites,
    noteGlobale: 3.5,
    photo: `https://picsum.photos/seed/${slug}/1200/600`,
    verifiedBy: 'claude-research',
    description: b.description,
  } as unknown as Candidate
}

function parseJsonResponse(text: string): ClaudeBeach[] {
  // Tolerate models that wrap JSON in ```json fences despite instructions.
  const cleaned = text.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
  const data = JSON.parse(cleaned) as { plages?: ClaudeBeach[] }
  return Array.isArray(data.plages) ? data.plages : []
}

export const claudeResearchSource: Source = {
  name: 'claude-research (anthropic API)',
  async fetch(): Promise<Candidate[]> {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('[claude-research] ANTHROPIC_API_KEY absent — source ignorée')
      return []
    }

    const existing = await loadExistingBeaches()
    const existingList = existing.length > 0
      ? existing.map((b) => `- ${b.nom} (${b.commune})`).join('\n')
      : '(aucune)'

    const userPrompt = `Liste des plages déjà présentes dans le catalogue (à NE PAS reproposer) :
${existingList}

Propose ${TARGET_COUNT} plages françaises avec aménagements PMR qui ne sont PAS dans cette liste. Réponds avec le JSON demandé.`

    const ai = new Anthropic()
    let text: string
    try {
      const message = await ai.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      })
      const block = message.content.find((b) => b.type === 'text')
      text = block?.type === 'text' ? block.text : ''
    } catch (err) {
      console.error(`[claude-research] échec API : ${(err as Error).message}`)
      return []
    }

    if (!text.trim()) return []

    let beaches: ClaudeBeach[]
    try {
      beaches = parseJsonResponse(text)
    } catch (err) {
      console.error(`[claude-research] JSON invalide : ${(err as Error).message}`)
      return []
    }

    const candidates: Candidate[] = []
    for (const b of beaches) {
      const c = toCandidate(b)
      if (c) candidates.push(c)
    }
    console.log(`[claude-research] ${candidates.length}/${beaches.length} candidat(s) bien formés`)
    return candidates
  },
}

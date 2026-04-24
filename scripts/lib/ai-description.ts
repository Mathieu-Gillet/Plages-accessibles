// AI-powered description generator for beach import.
//
// Uses Claude Haiku (fast, cheap) to produce clean, natural French descriptions
// from raw beach data. Falls back silently when ANTHROPIC_API_KEY is absent or
// on any API error — the caller then keeps its template-generated description.
//
// Prompt caching is declared on the system prompt so repeated calls within a
// single import run share the same cache entry (saves ~90% on input tokens).
// Haiku 4.5's caching minimum is 2048 tokens — our system prompt alone is too
// short, but the combined tools+system prefix will exceed it as the SDK grows.

import Anthropic from '@anthropic-ai/sdk'
import { TYPES_ACCESSIBILITE } from '../../src/lib/content-schema'

type TypeAccessibilite = (typeof TYPES_ACCESSIBILITE)[number]

const ACCESSIBILITY_LABELS: Record<TypeAccessibilite, string> = {
  FAUTEUIL_ROULANT: 'accès fauteuil roulant',
  HANDISURF: 'handisurf',
  TIRALO: 'tiralo (fauteuil amphibie)',
  HIPPOCAMPE: 'hippocampe (fauteuil mer)',
  PARKINGS_PMR: 'parking PMR',
  SANITAIRES_ADAPTES: 'sanitaires adaptés PMR',
  DOUCHES_ACCESSIBLES: 'douches accessibles',
  CHEMIN_ACCES: "cheminement d'accès adapté",
  RAMPE_ACCES: "rampe d'accès vers l'eau",
  SABLE_COMPACT: 'sable compact praticable',
  PERSONNEL_FORME: "personnel formé à l'accueil PMR",
  SIGNALISATION_BRAILLE: 'signalisation braille/tactile',
  BOUCLE_MAGNETIQUE: 'boucle magnétique',
  LOCATION_MATERIEL: 'location de matériel adapté',
}

const SYSTEM_PROMPT = `\
Tu es rédacteur pour un guide du tourisme accessible en France. Ta tâche : écrire la description d'une plage accessible aux personnes en situation de handicap.

Contraintes absolues :
- Français naturel, chaleureux, sans jargon administratif ni superlatifs
- Entre 180 et 300 caractères (description courte et dense)
- Commence par un fait concret sur la plage (pas son nom, pas "Cette plage")
- Mentionne la commune de façon organique
- Cite 2 ou 3 équipements spécifiques parmi ceux fournis — ne les liste pas tous
- Si un texte source est disponible, reformule son contenu utile, n'invente rien
- Réponds uniquement avec la description (pas de guillemets, pas de préambule)`.trim()

let cachedClient: Anthropic | null = null

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (!cachedClient) cachedClient = new Anthropic()
  return cachedClient
}

export interface DescriptionInput {
  nom: string
  commune: string
  accessibilites: TypeAccessibilite[]
  nativeText?: string
  verifiedBy: string
}

export async function generateDescription(input: DescriptionInput): Promise<string | null> {
  const ai = getClient()
  if (!ai) return null

  const featsList = input.accessibilites
    .map((a) => ACCESSIBILITY_LABELS[a] ?? a.toLowerCase().replace(/_/g, ' '))
    .join(', ')

  const userPrompt = [
    `Nom : ${input.nom}`,
    `Commune : ${input.commune}`,
    `Équipements : ${featsList || 'non précisés'}`,
    input.nativeText?.trim() ? `Texte source : ${input.nativeText.trim()}` : null,
    `Source des données : ${input.verifiedBy}`,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const message = await ai.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          // Cache the system prompt across all beaches in one import run.
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    })

    const block = message.content.find((b) => b.type === 'text')
    const text = block?.type === 'text' ? block.text.trim() : null

    if (!text || text.length < 50) {
      console.error(`[ai-description] réponse trop courte pour ${input.nom} — ignorée`)
      return null
    }
    return text
  } catch (err) {
    console.error(`[ai-description] échec pour "${input.nom}" : ${(err as Error).message}`)
    return null
  }
}

export function isAiDescriptionAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

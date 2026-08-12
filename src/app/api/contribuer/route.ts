import { z } from 'zod'
import { TYPES_ACCESSIBILITE } from '@/lib/content-schema'
import { REGIONS_FRANCE } from '@/types'
import { clientIp, isHoneypotTriggered, isRateLimited } from '@/lib/anti-spam'
import { slugify } from '@/lib/utils'
import {
  GitHubApiError,
  countOpenPullRequests,
  createBranch,
  createPullRequest,
  getBaseSha,
  getFile,
  putFile,
} from '@/lib/github'

// Global backstop: the in-memory rate limit is per serverless instance, so a
// distributed bot can bypass it. Once this many contribution PRs sit
// unreviewed, refuse new submissions instead of flooding the repo.
const MAX_PENDING_PRS = 10

const ContributePayloadSchema = z.object({
  nom: z.string().min(2).max(200),
  description: z.string().min(150).max(3000),
  commune: z.string().min(2).max(200),
  codePostal: z.string().regex(/^\d{5}$/, 'Code postal à 5 chiffres'),
  departement: z.string().min(2).max(200),
  region: z.enum(REGIONS_FRANCE),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  accessibilites: z.array(z.enum(TYPES_ACCESSIBILITE)).default([]),
  photo: z
    .string()
    .url()
    .refine((u) => u.startsWith('https://'), 'HTTPS requis')
    .optional()
    .or(z.literal('')),
  noteContributeur: z.string().max(500).optional(),
  premierAvisNote: z.number().int().min(1).max(5).optional(),
  premierAvisAuteur: z.string().max(100).optional(),
  premierAvisCommentaire: z.string().max(2000).optional(),
})

/** Neutralise user values injected into a GitHub Markdown table cell. */
function escapeCell(value: string): string {
  return value
    .replace(/[\r\n]+/g, ' ')
    .replace(/\|/g, '\\|')
    .replace(/[<>]/g, '')
    .trim()
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  // Bots fill the hidden field: pretend success so they don't adapt.
  if (isHoneypotTriggered(body)) {
    return Response.json({ ok: true }, { status: 201 })
  }
  // Stricter than /api/avis: each call creates a branch + PR on GitHub.
  if (isRateLimited(clientIp(req), 3)) {
    return Response.json({ error: 'Trop de requêtes, réessayez plus tard' }, { status: 429 })
  }

  const parsed = ContributePayloadSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data

  const pat = process.env.GITHUB_PAT
  if (!pat) {
    console.error('[api/contribuer] Missing env var: GITHUB_PAT')
    return Response.json({ error: 'Configuration serveur manquante' }, { status: 500 })
  }

  const slug = slugify(`${data.nom}-${data.commune}`)
  const timestamp = Date.now()
  const branch = `contribution/${slug}-${timestamp}`

  const hasGps = data.latitude !== undefined && data.longitude !== undefined
  const hasPremierAvis = data.premierAvisNote !== undefined

  // verifiedAt/verifiedBy are intentionally omitted: the content schema
  // only accepts date strings, a literal `null` would break the site build
  // once the contribution PR is merged.
  const plageJson = {
    slug,
    nom: data.nom,
    description: data.description,
    commune: data.commune,
    codePostal: data.codePostal,
    departement: data.departement,
    region: data.region,
    latitude: data.latitude ?? 0,
    longitude: data.longitude ?? 0,
    photo: data.photo || null,
    photos: [],
    // Aucune note dans le contenu : elle appartient désormais aux visiteurs
    // (table Supabase `votes`). La note éventuellement donnée par le
    // contributeur est reportée dans le corps de la PR comme signal éditorial,
    // et il pourra voter sur la fiche dès sa publication.
    actif: false,
    accessibilites: data.accessibilites,
    hebergements: [],
    offresCulturelles: [],
  }

  const accessibilitesLabel = data.accessibilites.length > 0
    ? data.accessibilites.join(', ')
    : '—'

  const etoiles = hasPremierAvis
    ? '★'.repeat(data.premierAvisNote!) + '☆'.repeat(5 - data.premierAvisNote!)
    : ''

  const prBody = [
    `## Nouvelle plage proposée`,
    ``,
    `| Champ | Valeur |`,
    `|---|---|`,
    `| **Nom** | ${escapeCell(data.nom)} |`,
    `| **Commune** | ${escapeCell(data.commune)} (${data.codePostal}) |`,
    `| **Département** | ${escapeCell(data.departement)} |`,
    `| **Région** | ${data.region} |`,
    `| **Coordonnées** | ${hasGps ? `${data.latitude}, ${data.longitude}` : '⚠️ non renseignées — à compléter avant merge'} |`,
    `| **Équipements** | ${accessibilitesLabel} |`,
    ``,
    `### Description`,
    ``,
    data.description,
    ``,
    data.noteContributeur
      ? `### Source du contributeur\n\n${data.noteContributeur}\n`
      : '',
    hasPremierAvis ? [
      `### ⭐ Ressenti du contributeur`,
      ``,
      `> **Note :** ${etoiles} (${data.premierAvisNote}/5)`,
      data.premierAvisAuteur ? `> **Auteur :** ${escapeCell(data.premierAvisAuteur)}` : '',
      data.premierAvisCommentaire ? `>\n> *"${data.premierAvisCommentaire}"*` : '',
      ``,
      `*Signal éditorial pour la relecture uniquement : cette note n'est pas écrite dans le JSON.*`,
      `*Les notes du site proviennent exclusivement des votes de visiteurs, publiés à partir de 5 votes.*`,
    ].filter(Boolean).join('\n') : '',
    ``,
    `---`,
    `*Contribution soumise via le formulaire du site — à vérifier avant merge.*`,
    `*\`actif: false\` — la plage ne sera visible qu'après activation manuelle.*`,
    hasGps ? '' : `*\`latitude: 0, longitude: 0\` — les coordonnées GPS sont à renseigner avant de merger.*`,
  ].filter((line) => line !== undefined && line !== null).join('\n')

  try {
    if ((await countOpenPullRequests(pat, 'contribution/')) >= MAX_PENDING_PRS) {
      return Response.json(
        { error: 'Trop de propositions en attente de validation, réessayez dans quelques jours' },
        { status: 429 },
      )
    }

    // A beach with this slug already in the catalog would make putFile fail
    // with an opaque 422 — answer with a clear conflict instead.
    if (await getFile(pat, `content/plages/${slug}.json`)) {
      return Response.json(
        { error: 'Cette plage existe déjà dans l’annuaire' },
        { status: 409 },
      )
    }

    const baseSha = await getBaseSha(pat)
    await createBranch(pat, branch, baseSha)
    await putFile(pat, {
      path: `content/plages/${slug}.json`,
      branch,
      content: JSON.stringify(plageJson, null, 2) + '\n',
      message: `feat(content): contribution plage "${data.nom}" (${data.commune})`,
    })
    const prUrl = await createPullRequest(pat, {
      title: `Nouvelle plage : ${data.nom} (${data.commune})`,
      head: branch,
      body: prBody,
    })
    return Response.json({ ok: true, prUrl }, { status: 201 })
  } catch (err) {
    if (err instanceof GitHubApiError) {
      console.error(`[api/contribuer] ${err.message}`)
      return Response.json({ error: `Erreur GitHub (${err.step})` }, { status: 502 })
    }
    console.error('[api/contribuer] Unexpected error:', err)
    return Response.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

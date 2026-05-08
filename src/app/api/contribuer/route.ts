import { z } from 'zod'
import { TYPES_ACCESSIBILITE } from '@/lib/content-schema'
import { REGIONS_FRANCE } from '@/types'

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

const GITHUB_REPO = 'Mathieu-Gillet/Plages-accessibles'
const GITHUB_API = 'https://api.github.com'
const BASE_BRANCH = 'master'

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Corps de requête invalide' }, { status: 400 })
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

  const githubHeaders = {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }

  const slug = slugify(`${data.nom}-${data.commune}`)
  const timestamp = Date.now()
  const branch = `contribution/${slug}-${timestamp}`
  const today = new Date().toISOString().slice(0, 10)

  const hasGps = data.latitude !== undefined && data.longitude !== undefined
  const hasPremierAvis = data.premierAvisNote !== undefined

  const avis = hasPremierAvis
    ? [
        {
          note: data.premierAvisNote!,
          auteur: data.premierAvisAuteur || undefined,
          commentaire: data.premierAvisCommentaire || undefined,
          date: today,
        },
      ]
    : []

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
    noteGlobale: data.premierAvisNote ?? 0,
    nombreAvis: hasPremierAvis ? 1 : 0,
    actif: false,
    verifiedAt: null,
    verifiedBy: null,
    accessibilites: data.accessibilites,
    hebergements: [],
    offresCulturelles: [],
    avis,
  }

  // 1. Get SHA of base branch
  const refRes = await fetch(
    `${GITHUB_API}/repos/${GITHUB_REPO}/git/ref/heads/${BASE_BRANCH}`,
    { headers: githubHeaders }
  )
  if (!refRes.ok) {
    console.error('[api/contribuer] GitHub ref error:', refRes.status)
    return Response.json({ error: 'Erreur GitHub (lecture branche)' }, { status: 502 })
  }
  const refData = await refRes.json() as { object: { sha: string } }
  const sha = refData.object.sha

  // 2. Create new branch
  const branchRes = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/git/refs`, {
    method: 'POST',
    headers: githubHeaders,
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
  })
  if (!branchRes.ok) {
    console.error('[api/contribuer] GitHub branch error:', branchRes.status)
    return Response.json({ error: 'Erreur GitHub (création branche)' }, { status: 502 })
  }

  // 3. Create file on that branch
  const fileContent = Buffer.from(JSON.stringify(plageJson, null, 2) + '\n').toString('base64')
  const fileRes = await fetch(
    `${GITHUB_API}/repos/${GITHUB_REPO}/contents/content/plages/${slug}.json`,
    {
      method: 'PUT',
      headers: githubHeaders,
      body: JSON.stringify({
        message: `feat(content): contribution plage "${data.nom}" (${data.commune})`,
        content: fileContent,
        branch,
      }),
    }
  )
  if (!fileRes.ok) {
    console.error('[api/contribuer] GitHub file error:', fileRes.status)
    return Response.json({ error: 'Erreur GitHub (création fichier)' }, { status: 502 })
  }

  // 4. Open Pull Request
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
    `| **Nom** | ${data.nom} |`,
    `| **Commune** | ${data.commune} (${data.codePostal}) |`,
    `| **Département** | ${data.departement} |`,
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
      `### ⭐ Premier avis du contributeur`,
      ``,
      `> **Note :** ${etoiles} (${data.premierAvisNote}/5)`,
      data.premierAvisAuteur ? `> **Auteur :** ${data.premierAvisAuteur}` : '',
      data.premierAvisCommentaire ? `>\n> *"${data.premierAvisCommentaire}"*` : '',
      ``,
      `*Cet avis est inclus dans le fichier JSON et sera publié automatiquement dès le merge.*`,
    ].filter(Boolean).join('\n') : '',
    ``,
    `---`,
    `*Contribution soumise via le formulaire du site — à vérifier avant merge.*`,
    `*\`actif: false\` — la plage ne sera visible qu'après activation manuelle.*`,
    hasGps ? '' : `*\`latitude: 0, longitude: 0\` — les coordonnées GPS sont à renseigner avant de merger.*`,
  ].filter((line) => line !== undefined && line !== null).join('\n')

  const prRes = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/pulls`, {
    method: 'POST',
    headers: githubHeaders,
    body: JSON.stringify({
      title: `Nouvelle plage : ${data.nom} (${data.commune})`,
      head: branch,
      base: BASE_BRANCH,
      body: prBody,
    }),
  })
  if (!prRes.ok) {
    console.error('[api/contribuer] GitHub PR error:', prRes.status)
    return Response.json({ error: 'Erreur GitHub (création PR)' }, { status: 502 })
  }

  const pr = await prRes.json() as { html_url: string }
  return Response.json({ ok: true, prUrl: pr.html_url }, { status: 201 })
}

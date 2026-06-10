import { z } from 'zod'
import { clientIp, isHoneypotTriggered, isRateLimited } from '@/lib/anti-spam'
import {
  GITHUB_REPO,
  GitHubApiError,
  createBranch,
  createPullRequest,
  getBaseSha,
  getFile,
  putFile,
} from '@/lib/github'

const AvisPayloadSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug invalide'),
  note: z.number().int().min(1).max(5),
  auteur: z.string().max(100).optional(),
  commentaire: z.string().max(2000).optional(),
})

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Best-effort admin notification — a missing Resend config never blocks the PR flow. */
async function notifyByEmail(opts: {
  nom: string
  slug: string
  note: number
  auteur?: string
  commentaire?: string
  prUrl: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  const to = process.env.ADMIN_EMAIL
  if (!apiKey || !from || !to) return

  const date = new Date().toLocaleDateString('fr-FR', { dateStyle: 'full' })
  const etoiles = '★'.repeat(opts.note) + '☆'.repeat(5 - opts.note)
  const html = `
<!DOCTYPE html>
<html lang="fr">
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
  <h2 style="color:#0369a1">Nouvel avis — ${escHtml(opts.nom)}</h2>
  <table style="border-collapse:collapse;width:100%">
    <tr>
      <td style="padding:8px;font-weight:bold;border-bottom:1px solid #e2e8f0;width:140px">Plage</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0">${escHtml(opts.nom)} (<code>${escHtml(opts.slug)}</code>)</td>
    </tr>
    <tr>
      <td style="padding:8px;font-weight:bold;border-bottom:1px solid #e2e8f0">Note</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#ca8a04">${etoiles} (${opts.note}/5)</td>
    </tr>
    <tr>
      <td style="padding:8px;font-weight:bold;border-bottom:1px solid #e2e8f0">Auteur</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0">${escHtml(opts.auteur ?? 'Anonyme')}</td>
    </tr>
    <tr>
      <td style="padding:8px;font-weight:bold;border-bottom:1px solid #e2e8f0">Commentaire</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0">${opts.commentaire ? escHtml(opts.commentaire) : '—'}</td>
    </tr>
    <tr>
      <td style="padding:8px;font-weight:bold;border-bottom:1px solid #e2e8f0">Date</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0">${date}</td>
    </tr>
    <tr>
      <td style="padding:8px;font-weight:bold">Proposition</td>
      <td style="padding:8px"><a href="${escHtml(opts.prUrl)}">Examiner et merger la PR</a></td>
    </tr>
  </table>
</body>
</html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `[Avis] ${opts.nom} — ${opts.note}/5`,
        html,
      }),
    })
    if (!res.ok) {
      console.error('[api/avis] Resend notification error:', res.status, await res.text())
    }
  } catch (err) {
    console.error('[api/avis] Resend notification error:', err)
  }
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
  // Each call creates a branch + PR on GitHub, so keep the limit tight.
  if (isRateLimited(clientIp(req), 3)) {
    return Response.json({ error: 'Trop de requêtes, réessayez plus tard' }, { status: 429 })
  }

  const parsed = AvisPayloadSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const { slug, note, auteur, commentaire } = parsed.data

  const pat = process.env.GITHUB_PAT
  if (!pat) {
    console.error('[api/avis] Missing env var: GITHUB_PAT')
    return Response.json({ error: 'Configuration serveur manquante' }, { status: 500 })
  }

  const path = `content/plages/${slug}.json`

  try {
    // 1. Load the current beach file — also validates the slug really exists.
    const file = await getFile(pat, path)
    if (!file) {
      return Response.json({ error: 'Plage introuvable' }, { status: 404 })
    }

    let plage: Record<string, unknown>
    try {
      plage = JSON.parse(file.content) as Record<string, unknown>
    } catch {
      console.error(`[api/avis] Invalid JSON in repo for ${path}`)
      return Response.json({ error: 'Données de la plage illisibles' }, { status: 502 })
    }

    const nom = typeof plage.nom === 'string' ? plage.nom : slug
    const today = new Date().toISOString().slice(0, 10)
    const nouvelAvis = {
      note,
      ...(commentaire ? { commentaire } : {}),
      ...(auteur ? { auteur } : {}),
      date: today,
    }

    // 2. Append the review. noteGlobale measures the PMR equipment level,
    //    not the review average, so it is deliberately left untouched.
    const avisExistants = Array.isArray(plage.avis) ? plage.avis : []
    plage.avis = [...avisExistants, nouvelAvis]
    plage.nombreAvis =
      (typeof plage.nombreAvis === 'number' ? plage.nombreAvis : avisExistants.length) + 1

    // 3. Branch + commit + PR.
    const branch = `avis/${slug}-${Date.now()}`
    const baseSha = await getBaseSha(pat)
    await createBranch(pat, branch, baseSha)
    await putFile(pat, {
      path,
      branch,
      content: JSON.stringify(plage, null, 2) + '\n',
      message: `feat(content): new review for "${nom}" (${note}/5)`,
      sha: file.sha,
    })

    const etoiles = '★'.repeat(note) + '☆'.repeat(5 - note)
    const prBody = [
      `## Nouvel avis visiteur`,
      ``,
      `| Champ | Valeur |`,
      `|---|---|`,
      `| **Plage** | [${nom}](https://github.com/${GITHUB_REPO}/blob/master/${path}) (\`${slug}\`) |`,
      `| **Note** | ${etoiles} (${note}/5) |`,
      `| **Auteur** | ${auteur ?? 'Anonyme'} |`,
      `| **Date** | ${today} |`,
      ``,
      commentaire ? `### Commentaire\n\n> ${commentaire.replace(/\n/g, '\n> ')}\n` : '',
      `---`,
      `*Avis soumis via le formulaire du site — à vérifier avant merge (ton, spam, doublon).*`,
      `*\`nombreAvis\` a été incrémenté ; \`noteGlobale\` (niveau d'équipement) n'est pas modifiée automatiquement.*`,
      `*L'avis sera visible sur le site dès le merge.*`,
    ].filter(Boolean).join('\n')

    const prUrl = await createPullRequest(pat, {
      title: `Avis : ${nom} — ${note}/5`,
      head: branch,
      body: prBody,
    })

    // 4. Optional admin notification.
    await notifyByEmail({ nom, slug, note, auteur, commentaire, prUrl })

    return Response.json({ ok: true, prUrl }, { status: 201 })
  } catch (err) {
    if (err instanceof GitHubApiError) {
      console.error(`[api/avis] ${err.message}`)
      return Response.json({ error: `Erreur GitHub (${err.step})` }, { status: 502 })
    }
    console.error('[api/avis] Unexpected error:', err)
    return Response.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

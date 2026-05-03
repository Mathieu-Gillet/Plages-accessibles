import { z } from 'zod'

const AvisPayloadSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug invalide'),
  nom: z.string().min(1).max(200),
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

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = AvisPayloadSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const { slug, nom, note, auteur, commentaire } = parsed.data

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  const to = process.env.ADMIN_EMAIL

  if (!apiKey || !from || !to) {
    console.error('[api/avis] Missing env vars: RESEND_API_KEY, RESEND_FROM_EMAIL or ADMIN_EMAIL')
    return Response.json({ error: 'Configuration serveur manquante' }, { status: 500 })
  }

  const date = new Date().toLocaleDateString('fr-FR', { dateStyle: 'full' })
  const etoiles = '★'.repeat(note) + '☆'.repeat(5 - note)
  const auteurEsc = escHtml(auteur ?? 'Anonyme')
  const commentaireEsc = commentaire ? escHtml(commentaire) : '—'
  const nomEsc = escHtml(nom)

  const html = `
<!DOCTYPE html>
<html lang="fr">
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
  <h2 style="color:#0369a1">Nouvel avis — ${nomEsc}</h2>
  <table style="border-collapse:collapse;width:100%">
    <tr>
      <td style="padding:8px;font-weight:bold;border-bottom:1px solid #e2e8f0;width:140px">Plage</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0">${nomEsc} (<code>${escHtml(slug)}</code>)</td>
    </tr>
    <tr>
      <td style="padding:8px;font-weight:bold;border-bottom:1px solid #e2e8f0">Note</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#ca8a04">${etoiles} (${note}/5)</td>
    </tr>
    <tr>
      <td style="padding:8px;font-weight:bold;border-bottom:1px solid #e2e8f0">Auteur</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0">${auteurEsc}</td>
    </tr>
    <tr>
      <td style="padding:8px;font-weight:bold;border-bottom:1px solid #e2e8f0">Commentaire</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0">${commentaireEsc}</td>
    </tr>
    <tr>
      <td style="padding:8px;font-weight:bold">Date</td>
      <td style="padding:8px">${date}</td>
    </tr>
  </table>
</body>
</html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `[Avis] ${nom} — ${note}/5`,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[api/avis] Resend error:', res.status, err)
    return Response.json({ error: "Erreur lors de l'envoi de l'email" }, { status: 502 })
  }

  return Response.json({ ok: true }, { status: 200 })
}

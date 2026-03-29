// src/app/api/plages/[slug]/avis/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const AvisSchema = z.object({
  note: z.number().int().min(1).max(5),
  commentaire: z.string().max(500).optional(),
  auteur: z.string().max(50).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  // Ici params.slug est l'ID de la plage (on accepte les deux)
  const body = await request.json()
  const parsed = AvisSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const plage = await prisma.plage.findFirst({
    where: {
      OR: [{ id: params.slug }, { slug: params.slug }],
      actif: true,
    },
  })

  if (!plage) {
    return NextResponse.json({ error: 'Plage introuvable' }, { status: 404 })
  }

  // Créer l'avis
  const avis = await prisma.avis.create({
    data: {
      ...parsed.data,
      plageId: plage.id,
    },
  })

  // Mettre à jour la note globale
  const stats = await prisma.avis.aggregate({
    where: { plageId: plage.id },
    _avg: { note: true },
    _count: { note: true },
  })

  await prisma.plage.update({
    where: { id: plage.id },
    data: {
      noteGlobale: Math.round((stats._avg.note ?? 0) * 10) / 10,
      nombreAvis: stats._count.note,
    },
  })

  return NextResponse.json({ ...avis, date: avis.date.toISOString() })
}

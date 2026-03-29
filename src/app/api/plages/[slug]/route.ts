// src/app/api/plages/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const plage = await prisma.plage.findUnique({
    where: { slug: params.slug, actif: true },
    include: {
      accessibilites: true,
      hebergements: {
        orderBy: { distanceKm: 'asc' },
      },
      offrescultures: {
        orderBy: { distanceKm: 'asc' },
      },
      avis: {
        orderBy: { date: 'desc' },
        take: 20,
      },
    },
  })

  if (!plage) {
    return NextResponse.json({ error: 'Plage non trouvée' }, { status: 404 })
  }

  return NextResponse.json(plage)
}

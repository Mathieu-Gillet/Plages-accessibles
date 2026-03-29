// src/app/api/plages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const region = searchParams.get('region')
  const departement = searchParams.get('departement')
  const q = searchParams.get('q')
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const page = parseInt(searchParams.get('page') ?? '1')

  const where = {
    actif: true,
    ...(region ? { region } : {}),
    ...(departement ? { departement } : {}),
    ...(q
      ? {
          OR: [
            { nom: { contains: q, mode: 'insensitive' as const } },
            { commune: { contains: q, mode: 'insensitive' as const } },
            { departement: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [plages, total] = await Promise.all([
    prisma.plage.findMany({
      where,
      select: {
        id: true,
        nom: true,
        slug: true,
        commune: true,
        departement: true,
        region: true,
        latitude: true,
        longitude: true,
        noteGlobale: true,
        nombreAvis: true,
        photo: true,
        accessibilites: {
          select: { type: true },
        },
      },
      orderBy: { noteGlobale: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.plage.count({ where }),
  ])

  const formatted = plages.map((p) => ({
    ...p,
    accessibilites: p.accessibilites.map((a) => a.type),
  }))

  return NextResponse.json({ plages: formatted, total, page, limit })
}

// src/lib/votant.ts
// Identité anonyme d'un contributeur, partagée par les routes de vote, de photo
// et de « j'aime ».
//
// Un UUID posé en cookie httpOnly au premier geste, jamais associé à un compte
// ni à une donnée personnelle. Il ne sert qu'à empêcher un même navigateur (ou
// une même installation de l'application, qui persiste le cookie) de voter deux
// fois sur la même plage ou de gonfler le compteur de likes d'une photo.
//
// Le cookie n'est jamais stocké tel quel : les tables ne contiennent que son
// empreinte salée (cf. hashEmpreinte dans votes-core).
import 'server-only'
import { cookies } from 'next/headers'
import { randomUUID } from 'node:crypto'
import type { NextResponse } from 'next/server'

export const COOKIE_VOTANT = 'pa_votant'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 an

export interface Votant {
  id: string
  /** True quand le cookie vient d'être créé — il faudra le poser sur la réponse. */
  nouveau: boolean
}

export async function lireVotant(): Promise<Votant> {
  const jar = await cookies()
  const existant = jar.get(COOKIE_VOTANT)?.value
  return existant ? { id: existant, nouveau: false } : { id: randomUUID(), nouveau: true }
}

/**
 * Pose le cookie sur la réponse elle-même : en Route Handler, c'est la seule
 * voie fiable pour émettre un Set-Cookie.
 */
export function poserCookieVotant(res: NextResponse, votant: Votant): void {
  if (!votant.nouveau) return
  res.cookies.set(COOKIE_VOTANT, votant.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
}

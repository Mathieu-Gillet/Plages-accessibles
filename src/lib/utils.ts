// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { NiveauAccessibilite } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') // strip leading/trailing hyphens (e.g. "!Plage" \u2192 "plage")
}

export function formatNote(note: number): string {
  return note.toFixed(1)
}

export function etoiles(note: number): string {
  const plein = Math.floor(note)
  const demi = note % 1 >= 0.5 ? 1 : 0
  return '★'.repeat(plein) + (demi ? '½' : '') + '☆'.repeat(5 - plein - demi)
}

export function distanceLabel(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

/**
 * Badge d'accessibilité d'un POI voisin (hébergement / lieu culturel).
 * Honnête par construction : on ne revendique « Accessible PMR » que pour un
 * niveau confirmé ; « partiel » et « à vérifier » sont visuellement distincts.
 * Rétrocompat : les POIs sans `niveauAccessibilite` retombent sur le booléen
 * `accessiblePMR` historique (true → confirmé, false → aucun badge).
 */
export function accessibiliteBadge(
  niveau: NiveauAccessibilite | undefined,
  accessiblePMR: boolean,
): { text: string; className: string } | null {
  const effectif: NiveauAccessibilite | null =
    niveau ?? (accessiblePMR ? 'confirme' : null)
  switch (effectif) {
    case 'confirme':
      return { text: '♿ Accessible PMR', className: 'text-vert-accessible' }
    case 'partiel':
      return { text: '♿ Accès partiel', className: 'text-amber-700' }
    case 'inconnu':
      return { text: 'Accessibilité à vérifier', className: 'text-ardoise-clair' }
    default:
      return null
  }
}

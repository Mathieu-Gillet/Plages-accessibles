// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

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
    .trim()
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

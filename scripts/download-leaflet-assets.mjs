#!/usr/bin/env node
// scripts/download-leaflet-assets.mjs
// Copies the Leaflet marker images required by src/components/map/CarteLeaflet.tsx
// into public/leaflet/. Run once after npm install if the assets are missing:
//   node scripts/download-leaflet-assets.mjs
// The images ship with the leaflet npm package, so no network access is needed.

import { mkdirSync, copyFileSync, existsSync } from 'fs'
import { join } from 'path'

const FILES = ['marker-icon.png', 'marker-icon-2x.png', 'marker-shadow.png']
const SRC = join(process.cwd(), 'node_modules', 'leaflet', 'dist', 'images')
const DEST = join(process.cwd(), 'public', 'leaflet')

if (!existsSync(SRC)) {
  console.error('❌ node_modules/leaflet introuvable — lancez `npm install` d’abord.')
  process.exit(1)
}

mkdirSync(DEST, { recursive: true })

for (const file of FILES) {
  copyFileSync(join(SRC, file), join(DEST, file))
  console.log(`✅ Copié : ${file}`)
}

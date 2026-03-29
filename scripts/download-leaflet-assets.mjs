#!/usr/bin/env node
// scripts/download-leaflet-assets.mjs
// Lance ce script une fois après npm install :
// node scripts/download-leaflet-assets.mjs

import { mkdirSync, createWriteStream } from 'fs'
import { get } from 'https'
import { join } from 'path'

const BASE = 'https://unpkg.com/leaflet@1.9.4/dist/images/'
const FILES = ['marker-icon.png', 'marker-icon-2x.png', 'marker-shadow.png']
const DEST = join(process.cwd(), 'public', 'leaflet')

mkdirSync(DEST, { recursive: true })

for (const file of FILES) {
  const url = BASE + file
  const dest = join(DEST, file)
  get(url, (res) => {
    res.pipe(createWriteStream(dest))
    console.log(`✅ Téléchargé : ${file}`)
  })
}

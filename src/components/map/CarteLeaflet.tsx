'use client'
// src/components/map/CarteLeaflet.tsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import type { PlageResume } from '@/types'
import { formatNote } from '@/lib/utils'
import 'leaflet/dist/leaflet.css'

// Fix icône Leaflet avec webpack — workaround officiel react-leaflet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: '/leaflet/marker-icon.png',
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

// Icône personnalisée bleue
function creerIconePlage(note: number) {
  const couleur = note >= 4.5 ? '#16a34a' : note >= 3.5 ? '#0077b6' : '#f59e0b'
  return L.divIcon({
    html: `<div style="
      background: ${couleur};
      color: white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 800;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    ">
      <span style="transform: rotate(45deg)">${note > 0 ? note.toFixed(1) : '🏖'}</span>
    </div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })
}

interface CarteLeafletProps {
  plages: PlageResume[]
  hauteur?: string
  centreInitial?: [number, number]
  zoomInitial?: number
  marqueursPoi?: Array<{
    latitude: number
    longitude: number
    nom: string
    type: 'hebergement' | 'culture'
  }>
}

export default function CarteLeaflet({
  plages,
  hauteur = '400px',
  centreInitial = [46.8, 2.3],
  zoomInitial = 6,
  marqueursPoi = [],
}: CarteLeafletProps) {
  return (
    <MapContainer
      center={centreInitial}
      zoom={zoomInitial}
      style={{ height: hauteur, width: '100%' }}
      aria-label="Carte des plages accessibles en France"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {plages.map((plage) => (
        <Marker
          key={plage.id}
          position={[plage.latitude, plage.longitude]}
          icon={creerIconePlage(plage.noteGlobale)}
          title={plage.nom}
        >
          <Popup>
            <div className="min-w-[180px]">
              <p className="font-bold text-ardoise text-base leading-tight">{plage.nom}</p>
              <p className="text-xs text-ardoise-clair mt-0.5">{plage.commune}</p>
              {plage.noteGlobale > 0 && (
                <p className="text-sm font-bold mt-2 flex items-center gap-1" style={{ color: '#f59e0b' }}>
                  <span aria-hidden="true">★</span>
                  <span>{formatNote(plage.noteGlobale)}</span>
                  <span className="text-ardoise-clair font-normal text-xs">/ 5</span>
                </p>
              )}
              <a
                href={`/plage/${plage.slug}`}
                className="mt-3 block text-center text-sm py-2 px-3 rounded-lg font-bold transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#2d6a4f', color: 'white' }}
              >
                Voir la plage →
              </a>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* POI (hébergements, culture) */}
      {marqueursPoi.map((poi, i) => (
        <Marker
          key={i}
          position={[poi.latitude, poi.longitude]}
          title={poi.nom}
        >
          <Popup>
            <p className="font-semibold text-sm">{poi.nom}</p>
            <p className="text-xs text-gray-500 capitalize">{poi.type}</p>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

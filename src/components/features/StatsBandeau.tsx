// src/components/features/StatsBandeau.tsx
interface StatsBandeauProps {
  totalPlages: number
  totalRegions: number
}

export function StatsBandeau({ totalPlages, totalRegions }: StatsBandeauProps) {
  return (
    <section
      className="bg-ocean text-white py-8 px-4"
      aria-label="Chiffres clés"
    >
      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
        <div>
          <p className="text-4xl font-extrabold">{totalPlages}</p>
          <p className="text-ocean-pale mt-1 font-medium">Plages référencées</p>
        </div>
        <div>
          <p className="text-4xl font-extrabold">{totalRegions}</p>
          <p className="text-ocean-pale mt-1 font-medium">Régions couvertes</p>
        </div>
        <div>
          <p className="text-4xl font-extrabold">100%</p>
          <p className="text-ocean-pale mt-1 font-medium">Gratuit &amp; collaboratif</p>
        </div>
      </div>
    </section>
  )
}

# TODO — Plages Accessibles

> Mis à jour le 2026-06-19. Voir `tasks/modifs.md` pour l'historique des livraisons.

---

## ✅ Livré — Audit 2026-06-19 (branche `audit/2026-06-19-fixes`)

### Sécurité
- [x] **XSS stockée corrigée** : le JSON-LD de `/plage/[slug]` échappe désormais `<`/`>`/`&` (`<`…) — une contribution avec `</script>` ne peut plus exécuter de JS
- [x] Anti-spam : `clientIp()` privilégie `x-real-ip` (posé par la plateforme) au lieu du `x-forwarded-for` spoofable
- [x] Injection Markdown : valeurs utilisateur (`nom`/`commune`/`auteur`…) neutralisées dans les tableaux des PRs bot

### Croissance du catalogue
- [x] **Reverse-geocoding OSM** (`api-adresse.data.gouv.fr`, gratuit, sans clé) : les plages OSM sans `addr:city`/`addr:postcode` ne sont plus jetées → déblocage du principal goulot
- [x] `MAX_PER_RUN` 10 → 25 (configurable via env `MAX_PER_RUN`)
- [x] Coût IA : `generateDescription` n'est plus appelé sur les candidats au-delà du plafond (économie proportionnelle au volume brut)
- [x] Dédup GPS resserré ~200 m → ~100 m (`GEO_CELL_FACTOR` 500 → 1000) : ne fusionne plus des plages distinctes sur littoral dense

### Robustesse pipeline / CI
- [x] `timeout-minutes: 20` + `concurrency` sur les workflows import & enrich
- [x] Crons décalés : import 06:00, enrich 07:00 UTC (plus de PRs/Overpass concurrents)
- [x] `AbortController` (timeout 90 s) sur les requêtes Overpass
- [x] **Tests Vitest** (34 tests : `slugify`, `formatNote`, `etoiles`, anti-spam, `reverseGeocode`, `validateCandidate`) + étape `npm test` dans la CI

### Accessibilité (RGAA)
- [x] **Alternative liste à la carte d'accueil** (toggle Carte/Liste, navigable au clavier + lecteurs d'écran)
- [x] Contrastes : hover des boutons `ocean-clair` (2,2:1) → `ocean-fonce` (~7,8:1) ; marqueurs/notes orange `#f59e0b` (1,9:1) → `#b45309` (~4,9:1) ; compteurs gris clair → `ardoise-clair`
- [x] Formulaires : `aria-required`/`aria-invalid`/`aria-describedby` + focus auto sur le 1er champ en erreur (`ContributeForm`), note en `radiogroup`/`radio` avec `aria-live` (`AvisForm`)
- [x] `@media (prefers-reduced-motion)` : coupe smooth-scroll + transitions

### Qualité
- [x] `slugify` dédupliqué (route `/contribuer` importe `@/lib/utils`, qui retire aussi les tirets en bord)
- [x] `noteGlobale` découplée de la note d'avis dans `/contribuer` (plus de rich-snippet `AggregateRating` faux)

---

## 🔑 À faire par toi (actions externes que je ne peux pas réaliser)

- [ ] **Clé AccesLibre** : s'inscrire sur https://api.gouv.fr/les-api/api-acces-libre → secret `ACCESLIBRE_API_KEY` (GitHub Actions + Vercel). Source dormante tant que la clé manque (~500 records PMR).
- [ ] **Clé DataTourisme** : s'inscrire sur https://www.datatourisme.fr → secret `DATATOURISME_API_KEY` (~200-300 POI plages).
- [ ] **Rate-limit partagé (Vercel KV / Upstash Redis)** : le throttle par-IP actuel est en mémoire (perdu à chaque cold start serverless). Provisionner le store, puis remplacer la `Map` de `src/lib/anti-spam.ts`. Le backstop global `MAX_PENDING_PRS` reste en place entre-temps.

---

## 🚀 Croissance — suite (code à écrire)

- [ ] **Run dominical haut volume** : cron `0 4 * * 0` avec `MAX_PER_RUN=100` pour rattraper le backlog des sources.
- [ ] **Auto-merge sources officielles** : merger automatiquement les PRs `auto/import-*` dont toutes les plages viennent de `handiplage.fr`/`tourisme-handicap` (CI = garde-fou). Ajouter un output `all_trusted` dans `import-plages.ts`.
- [ ] **Cron `enrich-photos`** : `scripts/enrich-photos.ts` existe mais n'est pas cron-ifié (photos Wikimedia pour les plages encore en placeholder).
- [ ] **Bandeau « Proposez une plage »** sur la home (formulaire `/contribuer` peu visible).
- [ ] **Extraction OSM** : utiliser `description:fr` comme source de description pour réduire les rejets « description trop courte ».
- [ ] **Workflow saisonnier** (cron avril + octobre) : ré-interroger les sources pour détecter les changements d'accessibilités sur les plages existantes.

---

## 🟠 Qualité & robustesse (reste)

- [ ] **`<img>` → `next/image`** (`PlageCard.tsx`, `/plage/[slug]/page.tsx`) — **bloqué** : les photos de contribution acceptent n'importe quel hôte HTTPS, or `next/image` plante en SSG sur un hôte hors `remotePatterns`. Préalable : restreindre les hôtes photo autorisés côté `/contribuer` (Wikimedia Commons), PUIS basculer sur `next/image`.
- [ ] Étendre les tests : `searchPlages()` (nécessite de mocker `server-only` + fs), composants formulaires (ajouter `@testing-library/react` + env jsdom).
- [ ] Audit contraste complet de la palette avec axe-core (CI a11y).

---

## 🔧 Migrations majeures (1 PR chacune, validation explicite requise)

Dans cet ordre (chacun peut casser du code) — clôt aussi les 6 vulnérabilités npm restantes (toutes via Next + `@vercel/*`) :

1. [ ] React 18 → 19 + react-leaflet 4 → 5 (couplés)
2. [ ] Next 15 → 16 (`npx @next/codemod@latest upgrade`)
3. [ ] Zod 3 → 4
4. [ ] Tailwind 3 → 4 (migrer la palette `@theme` — dont le nouveau `ocean-fonce`)

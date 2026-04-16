# TODO — Plages Accessibles

> Roadmap issue de l'audit complet du 2026-04-16. Voir `tasks/modifs.md` pour ce qui a déjà été livré.

## Étape 1 — Sécurité immédiate (LIVRÉE 2026-04-16)
- [x] Lot A : bump patch/minor sûr (Prisma, TanStack, Zod, lucide, autoprefixer, postcss, types)
- [x] Lot B : ESLint 9 flat config + eslint-config-next 15 → 4 vulnérabilités HIGH `glob` éliminées
- [x] Bump Next 14.2.5 → 14.2.35 (patch sécurité, élimine 16 advisories CRITICAL)
- [x] `next.config.js` : remotePatterns restreints (mitige GHSA-9g9p-9gw9-jx7f)
- [x] Vérifier que `.env` n'a jamais été commité ✓ (clean)
- [ ] **Reste 1 HIGH** (Next < 16, GHSA-3x4c-7xq6-9pq8 + GHSA-q4gf-8mx6-v5v3) → résolution dans Étape 5 (Next 15 puis 16)

## Étape 2 — Fonctionnalités manquantes
- [ ] Modèle Prisma `Suggestion` + `POST /api/suggestions` + brancher `src/app/contribuer/page.tsx:31` (retire le `setTimeout` mock)
- [ ] Page `/mentions-legales` (lien dans Footer cassé)
- [ ] Page `/contact` (lien dans Footer cassé)
- [ ] Rate-limit sur `POST /api/plages/[slug]/avis` (par IP via `x-forwarded-for`)
- [ ] Validation client : `commentaire` longueur min/max dans `AvisSection`

## Étape 3 — Robustesse & qualité
- [ ] Wrapper `safeQuery()` dans `src/lib/` pour remplacer les `try/catch { return [] }` silencieux et logguer
- [ ] Helper `mapAccessibilites(rows: { type: string }[]): TypeAccessibilite[]` dans `src/lib/utils.ts` ; supprimer les 4 `as any` :
  - `src/app/page.tsx:34`
  - `src/app/recherche/page.tsx:54`
  - `src/app/plage/[slug]/page.tsx:105`
  - `src/components/map/CarteDetailPlage.tsx:36`
- [ ] Remplacer `<img>` par `next/image` dans `src/components/features/PlageCard.tsx:21` et `src/app/plage/[slug]/page.tsx:56`
- [ ] Nettoyer imports non-utilisés : `Star` ([slug]/page.tsx:11), `formatNote` (AvisSection:5), `useEffect`/`useMap`/`Link` (CarteLeaflet)
- [ ] Échapper apostrophes/guillemets : `src/app/accessibilite/page.tsx:44`
- [ ] Remplacer `<a href="/">` par `<Link>` dans `src/app/contribuer/page.tsx:46`
- [ ] Ajouter Vitest + tests sur `slugify()`, `formatNote()` et un test API `GET /api/plages`
- [ ] Activer règles ESLint custom : `no-console` (warn), `@typescript-eslint/no-explicit-any` (déjà error via `next/typescript`)

## Étape 4 — Accessibilité (RGAA AA)
- [ ] `aria-required="true"` sur les champs requis de `/contribuer`
- [ ] Vue alternative tableau HTML pour les plages (toggle « carte / liste ») au-dessus de `<CarteLeaflet>`
- [ ] `aria-live="polite"` sur la zone d'envoi d'avis (`AvisSection`)
- [ ] Audit contraste palette (`ocean`/`sable`/`ardoise`/`vert`) avec axe-core

## Étape 5 — Migrations majeures (PR séparées, ordre strict)
1. [ ] Next 14 → 15 (`npx @next/codemod@latest upgrade`, `params`/`searchParams` deviennent `Promise`)
2. [ ] React 18 → 19 + react-leaflet 4 → 5 (couplés, breaking)
3. [ ] Next 15 → 16 (résout le dernier HIGH `npm audit`)
4. [ ] Zod 3 → 4 (`z.email()`, refactor schémas API)
5. [ ] Tailwind 3 → 4 (config CSS `@theme`, tailwind-merge v3)
6. [ ] Prisma 5 → 7 (nouveau moteur, vérifier compat Supabase pooler)
7. [ ] TypeScript 5 → 6

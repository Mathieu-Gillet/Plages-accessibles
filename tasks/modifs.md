# Modifications — Plages Accessibles

## 2026-04-16 — Étape 1 : Sécurité immédiate

### Contexte
Audit complet du dépôt + mise à jour ciblée des dépendances. Plan détaillé : `~/.claude/plans/temporal-toasting-lamport.md`.

### Changements

**`package.json`**
- Bump patch/minor sûrs (caret resolutions) : `@prisma/client`, `prisma` 5.16 → 5.22 ; `@tanstack/react-query` 5.51 → 5.99 ; `lucide-react` 0.400 → 0.544 ; `zod` 3.23 → 3.25 ; `tailwindcss` 3.4.6 → 3.4.19 ; `tailwind-merge` 2.4 → 2.6 ; `autoprefixer`, `postcss`, `@types/node`, `@types/leaflet`.
- Bump sécurité Next : `next` 14.2.5 → `^14.2.35` (élimine 16 advisories CRITICAL sur la ligne 14.2).
- Migration ESLint : `eslint` 8 → 9, `eslint-config-next` 14.2.5 → ^15.5.0, ajout `@eslint/eslintrc` (FlatCompat) → élimine 4 vulnérabilités HIGH `glob` (CWE-78).
- Script `lint` : `next lint` → `eslint .` (Next 14 ne lit pas la flat config).

**`eslint.config.mjs` (NEW)**
- Flat config minimale étendant `next/core-web-vitals` + `next/typescript` via FlatCompat.

**`next.config.js`**
- `images.remotePatterns` : remplacement de `hostname: '**'` (permissif) par allowlist `*.supabase.co`, `upload.wikimedia.org`, `images.unsplash.com`. Mitige GHSA-9g9p-9gw9-jx7f.

**`src/app/recherche/page.tsx`**
- Ajout d'une signature d'index `[key: string]: string | undefined` à l'interface `SearchParams` pour conserver la compatibilité avec la prop `searchParams: Record<string, string | undefined>` de `<ListePlages>` après le resserrement de typage de `@types/react` 18.3.28.

### Vérification
- `npm audit` : 4 HIGH `glob` éliminées ; reste 1 HIGH Next (résolution en Next 16, planifié Étape 5).
- `npx tsc --noEmit` : OK.
- `npm run build` : OK (9/9 pages générées ; les erreurs Prisma à la prerender sont attendues — DB inaccessible depuis l'env de build, fallbacks vides via `try/catch` existants).
- `npm run lint` : 8 erreurs et 9 warnings **pré-existants** (révélés par la nouvelle config stricte). Ils correspondent aux items Étape 3 du `tasks/todo.md` (casts `as any`, `<img>`, imports non-utilisés). Pas de régression.

### Hors scope (volontaire)
- Migrations majeures (Next 15/16, React 19, Tailwind 4, Zod 4, Prisma 7, TS 6) → Étape 5.
- Correction des erreurs lint pré-existantes → Étape 3.
- Fonctionnalités manquantes (formulaire `/contribuer`, pages footer, rate-limit avis) → Étape 2.

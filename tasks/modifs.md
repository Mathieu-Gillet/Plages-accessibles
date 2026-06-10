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

## 2026-06-09 — Revue de code complète + correctifs

### Contexte
Tour complet du code demandé par l'utilisateur : identifier les problèmes et livrer les correctifs pour rendre le site pleinement fonctionnel.

### Changements

**Bugs critiques**
- `src/app/api/contribuer/route.ts` : le JSON généré contenait `verifiedAt: null` / `verifiedBy: null`, rejetés par le schéma Zod (`.optional()` ≠ `.nullable()`). Conséquence : merger une contribution cassait le build du site entier. Les champs sont désormais omis.
- `src/lib/content-schema.ts` : tolérance `null` sur `verifiedAt`/`verifiedBy` (défense en profondeur) + refine « plage active ⇒ coordonnées ≠ (0,0) » (placeholder GPS des contributions).
- `public/leaflet/*.png` : le dossier `public/` n'existait pas → marqueurs POI Leaflet en images cassées. Assets copiés depuis node_modules ; `scripts/download-leaflet-assets.mjs` réécrit en copie locale (plus de dépendance à unpkg).
- `src/components/features/Footer.tsx` : liens 404 (`/mentions-legales`, `/contact`) → pages créées ; URL GitHub placeholder `votre-orga` corrigée.

**Recherche**
- `src/lib/content.ts` : la recherche texte ignorait la région (le placeholder la promettait) ; ajout + normalisation des accents (« cote d'azur » matche « Côte d'Azur »).

**SEO**
- `src/app/robots.ts`, `src/app/sitemap.ts`, `src/lib/site.ts` (SITE_URL canonique) : créés.
- `src/app/layout.tsx` : `metadataBase`.
- `src/app/plage/[slug]/page.tsx` : JSON-LD schema.org `Beach` (note agrégée, géo, adresse) + URL canonique.

**Anti-spam**
- `src/lib/anti-spam.ts` : honeypot + rate-limit en mémoire par IP.
- `/api/avis` (5 req/h) et `/api/contribuer` (3 req/h — chaque appel crée une branche + PR GitHub) protégés ; champ honeypot caché ajouté aux deux formulaires.

**Divers**
- `src/components/map/CarteLeaflet.tsx` + CSP : URL de tuiles OSM canonique (sous-domaines `{s}` dépréciés).
- `README.md` : enum corrigés (`SABLE_COMPACT`, `BOUCLE_MAGNETIQUE`).

### Vérification
- `npm run build` : OK — 50 pages générées, nouvelles routes `/contact`, `/mentions-legales`, `/robots.txt`, `/sitemap.xml` présentes.
- `npm run lint` : 0 erreur (2 warnings pré-existants hors périmètre).
- Schéma testé via tsx : draft (0,0) accepté, plage active (0,0) refusée, `verifiedAt: null` toléré.
- JSON-LD vérifié dans le HTML généré de `/plage/plage-la-baule`.

## 2026-06-10 — Avis publiés automatiquement via PR GitHub

### Contexte
Demande utilisateur : fermer la boucle des avis. Avant, un avis partait en simple email et exigeait une édition manuelle du JSON. Désormais le flux est identique aux contributions : PR automatique.

### Changements
- `src/lib/github.ts` (NEW) : helpers GitHub REST partagés (`getBaseSha`, `createBranch`, `getFile`, `putFile`, `createPullRequest`, `GitHubApiError`) — déduplique ~70 lignes entre les deux routes.
- `src/app/api/avis/route.ts` : réécrit. Lit `content/plages/{slug}.json` sur GitHub (valide l'existence du slug → 404 sinon), ajoute l'avis au tableau `avis`, incrémente `nombreAvis`, laisse `noteGlobale` intacte (elle mesure l'équipement, pas la moyenne des avis), crée branche `avis/{slug}-{ts}` + PR. L'email Resend devient une notification optionnelle best-effort (avec lien vers la PR). Rate-limit resserré à 3/h (chaque appel crée une PR). Le `nom` n'est plus accepté du client : il est lu depuis le fichier (source de confiance).
- `src/app/api/contribuer/route.ts` : refactor sur `src/lib/github.ts` (comportement identique).
- `src/components/features/AvisForm.tsx` + `AvisSection.tsx` : prop `nom` supprimée, affichage du lien « Suivre la proposition sur GitHub » au succès.
- `.env.example` : `GITHUB_PAT` requis pour les deux flux ; Resend documenté comme optionnel.

### Vérification
- `npm run build` (50 pages) + `npm run lint` : OK (2 warnings pré-existants).
- Test d'intégration avec GitHub mocké (tsx) : happy path 201 + prUrl ; avis ajouté + `nombreAvis` 65→66 + `noteGlobale` inchangée ; slug inconnu → 404 ; honeypot → faux 201 sans appel GitHub ; 4e appel même IP → 429.

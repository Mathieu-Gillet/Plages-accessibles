# Audit complet & mise à jour des dépendances — Plages Accessibles

> Plan créé le 2026-04-16. Étape 1 livrée le même jour (commit `8f45d79`). Étapes 2 à 5 en attente.

## Context

Le projet `Plages Accessibles` est un site Next.js 14 (App Router) référençant les plages françaises accessibles aux personnes en situation de handicap. Le `package.json` n'a pas été touché depuis l'init (juillet 2024), et `npm audit` remonte **4 vulnérabilités HIGH** (chaîne `glob` via `eslint-config-next`). Plusieurs dépendances majeures (Next 14 → 16, React 18 → 19, Tailwind 3 → 4, Zod 3 → 4, Prisma 5 → 7) ont publié des releases breaking depuis.

L'utilisateur demande : (1) mises à jour des dépendances, (2) audit complet du code, (3) marche à suivre pour améliorer.

L'objectif de ce plan est d'établir une stratégie sûre, par étapes — sécurité d'abord (vulnérabilités), puis fonctionnalités manquantes (formulaire de contribution non fonctionnel, pages absentes), puis améliorations qualité (a11y, tests, type safety).

---

## 1. Audit synthétique du code

### 1.1 Points forts
- Stack moderne et cohérente (Next 14 App Router, TS strict, Zod, Prisma).
- Schéma Prisma propre avec relations cascades et index sur `departement`/`region`/`noteGlobale`.
- Singleton Prisma correct ([src/lib/prisma.ts](src/lib/prisma.ts)).
- Effort d'accessibilité visible (skip-link, ARIA, sémantique HTML, page `/accessibilite`).
- README et `misenprod.md` détaillés.

### 1.2 Problèmes — par sévérité

| Sévérité | Problème | Fichier(s) |
|----------|----------|------------|
| **CRITIQUE** | 4 vulnérabilités `npm audit` HIGH (`glob` command injection via `eslint-config-next`) — *résolu Étape 1* | `package.json` |
| **HAUTE** | Formulaire « Contribuer » est un mock (`setTimeout`, TODO non résolu) | [src/app/contribuer/page.tsx:31](src/app/contribuer/page.tsx) |
| **HAUTE** | Liens cassés dans le footer : `/mentions-legales`, `/contact` n'existent pas | [src/components/features/Footer.tsx](src/components/features/Footer.tsx) |
| **HAUTE** | API `POST /api/plages/[slug]/avis` sans authentification ni rate-limit → spam | [src/app/api/plages/[slug]/avis/route.ts](src/app/api/plages/%5Bslug%5D/avis/route.ts) |
| **HAUTE** | `next.config.js` autorise toutes les images HTTPS (`hostname: '**'`) — *résolu Étape 1* | [next.config.js:7](next.config.js) |
| MOYENNE | 7 casts `as any` (mapping enum `TypeAccessibilite`) | [src/app/page.tsx:34](src/app/page.tsx), [src/app/recherche/page.tsx:54](src/app/recherche/page.tsx), [src/app/plage/[slug]/page.tsx:105](src/app/plage/%5Bslug%5D/page.tsx) |
| MOYENNE | `try/catch` silencieux qui retournent des fallbacks sans log | mêmes fichiers (lignes 36-38, 48-50, 35-58) |
| MOYENNE | Aucun test (Jest/Vitest non configurés) | — |
| MOYENNE | Pas de fichier ESLint custom (config par défaut) — *résolu Étape 1* | — |
| MOYENNE | Carte Leaflet non navigable au clavier (popups), contredit la conformité RGAA AA annoncée | [src/components/map/CarteLeaflet.tsx](src/components/map/CarteLeaflet.tsx) |
| MOYENNE | `<img>` natif au lieu de `<Image>` Next sur les photos plages | [src/components/features/PlageCard.tsx:22](src/components/features/PlageCard.tsx) |
| BASSE | Variables `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` et `ADMIN_SECRET_KEY` déclarées mais inutilisées | `.env.example` |
| BASSE | `scripts/download-leaflet-assets.mjs` sans gestion d'erreur | [scripts/download-leaflet-assets.mjs](scripts/download-leaflet-assets.mjs) |
| BASSE | Dossier `docs/` vide | `docs/` |

---

## 2. Mise à jour des dépendances — stratégie par lots

`npm outdated` montre que l'arbre installé est déjà légèrement en avance sur les contraintes du `package.json` (caret resolution). On distingue trois lots, du moins risqué au plus risqué.

### Lot A — Patch & minor sûrs (LIVRÉ Étape 1)
Aucun changement breaking attendu. Met à jour `package.json` puis `npm install`.

| Paquet | Avant | Après |
|--------|-------|-------|
| `@tanstack/react-query` | `^5.51.15` | `^5.99.0` |
| `@types/node` | `^20.19.37` | `^20.19.39` |
| `autoprefixer` | `^10` | `^10.5.0` |
| `postcss` | `^8` | `^8.5.10` |
| `tailwindcss` | `^3.4.6` | `^3.4.19` (rester en v3) |
| `tailwind-merge` | `^2.4.0` | `^2.6.1` (rester en v2) |
| `lucide-react` | `^0.400.0` | `^0.544.0` (rester < 1.0) |
| `@types/leaflet` | `^1.9.12` | `^1.9.20` |
| `@prisma/client` + `prisma` | `^5.16.0` | `^5.22.0` (rester en v5) |
| `zod` | `^3.23.8` | `^3.25.76` (rester en v3) |
| `next` (sécurité) | `14.2.5` | `^14.2.35` |

**Vérif** : `npm run build && npm run lint && npx tsc --noEmit`.

### Lot B — Correction des vulnérabilités HIGH (LIVRÉ Étape 1)
Le seul chemin propre pour purger la chaîne `glob >=10.2.0 <10.5.0` est de **passer à ESLint 9 + flat config + `eslint-config-next` 15** (le saut direct vers 16 implique aussi Next 16, à éviter ici).

Étapes :
1. `eslint` `^8.57.1` → `^9.18.0`
2. `eslint-config-next` `14.2.5` → `^15.5.0` (compatible avec Next 14)
3. Migrer `.eslintrc` → `eslint.config.mjs` (flat config requis par ESLint 9). Si aucun `.eslintrc` n'existe encore, créer directement `eslint.config.mjs` minimal qui étend `next/core-web-vitals` + `next/typescript`.
4. Re-lancer `npm audit` — les 4 HIGH doivent disparaître.

**Vérif** : `npm audit` propre (4 HIGH `glob` éliminées ; reste 1 HIGH Next < 16, planifié Lot C).

### Lot C — Majeurs risqués (À PLANIFIER EN ITÉRATIONS SÉPARÉES, NE PAS GROUPER)
Chacun mérite sa propre PR, tests ciblés, et entrée dans `tasks/modifs.md`. **Ne pas exécuter sans validation explicite.**

1. **Next 14 → 15** (puis 15 → 16 séparément) : `params`/`searchParams` deviennent `Promise`, caching par défaut change (`fetch` n'est plus auto-cached), à propager sur toutes les pages dynamiques (`/plage/[slug]`, `/recherche`, API routes). Outil : `npx @next/codemod@latest upgrade`.
2. **React 18 → 19** : retrait de `forwardRef`, `useFormState` → `useActionState`, types JSX déplacés. Impacte `react-leaflet` qui exige React 19 à partir de v5 — ces deux upgrades doivent être faits ensemble.
3. **react-leaflet 4 → 5** : couplé à React 19, API hooks revue.
4. **Tailwind 3 → 4** : nouvelle syntaxe `@theme`, `tailwind.config.ts` remplacé par `@theme` dans CSS, reconfigurer la palette `ocean`/`sable`/`ardoise`/`vert` ([tailwind.config.ts](tailwind.config.ts)). `tailwind-merge` doit suivre en v3.
5. **Zod 3 → 4** : `z.string().email()` → `z.email()`, refactor des schémas API ([src/app/api/plages/route.ts](src/app/api/plages/route.ts), [.../[slug]/avis/route.ts](src/app/api/plages/%5Bslug%5D/avis/route.ts)).
6. **Prisma 5 → 7** : nouveau moteur Rust `query-compiler`, vérifier compat Supabase pooler.
7. **TypeScript 5 → 6** : nouvelles règles strictes, refactor des `as any`.

**Recommandation** : ne pas faire le Lot C dans cette PR. Le proposer comme roadmap.

---

## 3. Roadmap d'améliorations (ordre suggéré)

Numéroté par ordre d'exécution recommandé. Chaque étape = une PR distincte avec entrée `tasks/todo.md` + `tasks/modifs.md` (cf. [Claude.md](Claude.md)).

### Étape 1 — Sécurité immédiate (LIVRÉE 2026-04-16)
- [x] Lot A (patch/minor sûrs)
- [x] Lot B (purge vulnérabilités via ESLint 9 + eslint-config-next 15)
- [x] Restreindre `next.config.js` à un allowlist d'hôtes images (Supabase storage, Wikimedia, Unsplash si utilisé) au lieu de `'**'`.
- [x] Vérifier `git log --all -- .env` que le `.env` n'a jamais été commité.

### Étape 2 — Fonctionnalités manquantes
- [ ] Créer la table Prisma `Suggestion` + endpoint `POST /api/suggestions` + brancher [src/app/contribuer/page.tsx:31](src/app/contribuer/page.tsx) dessus (supprimer le `setTimeout`).
- [ ] Créer pages `/mentions-legales` et `/contact` (référencées dans le footer).
- [ ] Rate-limit sur `POST /api/plages/[slug]/avis` (par IP, en-tête `x-forwarded-for`) — option simple : `@upstash/ratelimit` côté Vercel ou middleware mémoire local.
- [ ] Ajouter une validation côté client pour `commentaire` (longueur min/max).

### Étape 3 — Robustesse & qualité
- [ ] Remplacer les `try/catch { return [] }` silencieux par un wrapper `safeQuery()` dans [src/lib/](src/lib/) qui log via `console.error` (et plus tard Sentry).
- [ ] Supprimer les `as any` : créer un helper `mapAccessibilites(rows: { type: string }[]): TypeAccessibilite[]` dans [src/lib/utils.ts](src/lib/utils.ts) et l'utiliser dans les 3 pages concernées.
- [ ] Remplacer `<img>` par `next/image` dans [PlageCard.tsx](src/components/features/PlageCard.tsx).
- [ ] Ajouter Vitest + un premier test sur `slugify()` et `formatNote()` ([src/lib/utils.ts](src/lib/utils.ts)) + un test d'API route `GET /api/plages`.
- [ ] Configurer ESLint flat-config avec `@next/eslint-plugin-next` + règle `no-console` (warn) + `@typescript-eslint/no-explicit-any` (error).

### Étape 4 — Accessibilité (cohérence avec la mission du projet)
- [ ] Ajouter `aria-required="true"` sur les champs requis du formulaire `/contribuer`.
- [ ] Fournir un fallback **non-carte** : tableau HTML accessible des plages, accessible via un toggle `Vue carte / Vue liste` au-dessus de `<CarteLeaflet>`.
- [ ] Ajouter `aria-live="polite"` sur la zone d'envoi d'avis ([AvisSection.tsx](src/components/features/AvisSection.tsx)) pour annoncer succès/erreur.
- [ ] Vérifier les contrastes des couleurs `ocean`/`sable` ([tailwind.config.ts](tailwind.config.ts)) avec un outil RGAA (axe-core).

### Étape 5 — Roadmap majeure (Lot C)
À planifier dans des sessions dédiées, dans cet ordre :
1. Next 14 → 15
2. React 18 → 19 + react-leaflet 5 (couplés)
3. Next 15 → 16
4. Zod 3 → 4
5. Tailwind 3 → 4
6. Prisma 5 → 7
7. TypeScript 5 → 6

---

## 4. Fichiers critiques modifiés (Étape 1, commit `8f45d79`)

- [package.json](package.json) — bumps Lot A + Lot B
- [package-lock.json](package-lock.json) — régénéré par `npm install`
- **NEW** [eslint.config.mjs](eslint.config.mjs) — flat config minimale
- [next.config.js](next.config.js) — `remotePatterns` restreint
- [src/app/recherche/page.tsx](src/app/recherche/page.tsx) — fix régression typing (signature d'index `SearchParams`)
- **NEW** [tasks/todo.md](tasks/todo.md), [tasks/modifs.md](tasks/modifs.md), [tasks/lessons.md](tasks/lessons.md) — protocole [Claude.md](Claude.md)

---

## 5. Vérification end-to-end

À exécuter après chaque lot :

```bash
# 1. Installation propre
rm -rf node_modules package-lock.json
npm install

# 2. Sécurité
npm audit                  # cible : 0 vulnérabilité HIGH/CRITICAL

# 3. Type-check
npx tsc --noEmit

# 4. Lint
npm run lint

# 5. Build prod
npm run build

# 6. Smoke test runtime
npm run dev
# Naviguer manuellement :
#  - http://localhost:3000/                (carte + top 6)
#  - http://localhost:3000/recherche       (filtres région/dept)
#  - http://localhost:3000/plage/<slug>    (depuis seed)
#  - http://localhost:3000/contribuer      (formulaire)
#  - http://localhost:3000/accessibilite

# 7. Base de données
npm run db:generate
npm run db:push
npm run db:seed
```

**Critères d'acceptation pour cette PR (Étape 1) :**
- `npm audit` retourne 0 vulnérabilité HIGH/CRITICAL
- `npm run build` passe
- `npm run lint` passe (0 erreur)
- Toutes les pages chargent sans erreur console en `npm run dev`
- Aucun comportement existant régressé (carte affichée, recherche fonctionnelle, plage détail OK)

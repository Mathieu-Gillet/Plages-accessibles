# Audit & roadmap — Plages Accessibles

> Audit du 2026-06-10. Remplace l'audit du 2026-04-16 (architecture Prisma abandonnée depuis ; le projet est désormais file-based JSON + GitHub-as-back-office). Historique des livraisons : `tasks/modifs.md`.

## Contexte

Site Next.js 15 (App Router, SSG) en production sur https://plages-accessibles.fr. ~35 plages en JSON dans `content/plages/`, validées par Zod au build. Deux workflows GitHub Actions quotidiens alimentent le contenu par PRs automatiques ; les formulaires du site créent aussi des PRs via l'API GitHub.

État vérifié le 2026-06-10 : `npm run build` ✅ (35 pages plages SSG) · `npx tsc --noEmit` ✅ · `npm run lint` ✅ (2 warnings mineurs) · `npm audit` : **1 HIGH + 3 moderate**.

---

## 1. Critique — à traiter en priorité

### C1. Aucune CI sur les Pull Requests
Le repo n'a **aucun workflow de validation** (`build`/`lint`/`tsc`) sur les PRs. Or tout le modèle du site repose sur le merge de PRs (auto-import, auto-enrich, contributions, avis) et **un JSON invalide casse le build Vercel de production au merge** (comportement voulu du schéma Zod, mais découvert trop tard). C'est déjà arrivé (cf. `tasks/modifs.md` 2026-06-09 : `verifiedAt: null` cassait le build après merge d'une contribution).
**Action** : créer `.github/workflows/ci.yml` déclenché sur `pull_request` : `npm ci && npm run lint && npx tsc --noEmit && npm run build`. C'est le filet de sécurité qui manque à tout le système éditorial.

### C2. Vulnérabilités npm : 1 HIGH (Next.js) + 3 moderate
- `next@15.5.15` : chaîne d'advisories HIGH (DoS Server Components, cache poisoning, middleware bypass…). **Fix sans breaking** : `npm audit fix` → `next@15.5.19` (+ postcss transitif). Certains advisories ne sont définitivement clos qu'en Next 16 (migration majeure, à planifier — voir §3).
- `@anthropic-ai/sdk@0.91.0` (moderate) : bump 0.91.1.
- `brace-expansion` (moderate, transitif dev) : `npm audit fix`.
**Action** : `npm audit fix` + bump `@anthropic-ai/sdk` (touche `package.json` — demande explicite requise par `Claude.md`).

### C3. Anti-spam best-effort sur une API qui écrit dans le repo
`POST /api/contribuer` et `POST /api/avis` créent branche + PR GitHub. Le rate-limit est en mémoire **par instance serverless** : un attaquant distribué (ou simplement plusieurs cold starts) peut créer des dizaines de branches/PRs et polluer le dépôt. Le honeypot n'arrête que les bots naïfs.
**Action** (au choix, du plus simple au plus robuste) :
1. Cloudflare Turnstile (gratuit, sans cookie, compatible a11y) sur les deux formulaires ;
2. rate-limit persistant (`@upstash/ratelimit` + KV Vercel) ;
3. plafond global côté route (ex. refuser si > N branches `contribution/*` ouvertes).

---

## 2. Important — non bloquant

| # | Sujet | Détail |
|---|---|---|
| I1 | **Aucun test** | Pas de Vitest/Jest. Cibles à fort ROI : `validate-candidate.ts` (porte d'entrée du contenu auto), `anti-spam.ts`, `searchPlages()`/`normalize()` dans `content.ts`, schémas `content-schema.ts`. |
| I2 | **Collision de slug dans /api/contribuer** | Si la plage proposée existe déjà, `putFile` sans `sha` → 422 GitHub → erreur 502 opaque pour l'utilisateur. Détecter le doublon en amont (`getFile`) et répondre 409 avec message clair. |
| I3 | **`tasks/todo.md` obsolète** | Les items Étape 3 (casts `as any`, `<img>`, imports inutilisés) sont en réalité déjà corrigés (lint = 0 erreur). Le nettoyer pour qu'il reflète le reste à faire réel. |
| I4 | **CSP avec `unsafe-inline` scripts** | Requis par l'hydratation Next aujourd'hui ; migrer vers CSP à nonce (middleware) pour la durcir. `X-XSS-Protection` est obsolète (inoffensif, à retirer). |
| I5 | **2 warnings lint** | `eslint.config.mjs` (export default anonyme) et variable `mental` inutilisée dans `tourisme-handicap.ts`. |
| I6 | **`.claude/settings.local.json` versionné** | Fichier de permissions locales — devrait être dans `.gitignore` (comme son nom l'indique). |
| I7 | **`.gitignore` mentionne encore Prisma** | Trace de l'ancienne architecture, à nettoyer. |
| I8 | **Accessibilité (Étape 4 todo)** | Toujours pertinent vu la mission : vue liste alternative à la carte Leaflet, `aria-live` sur l'envoi d'avis, audit contraste axe-core. |
| I9 | **Email Resend en best-effort silencieux** | OK par design, mais sans monitoring (Sentry/log drain) un PAT expiré ou une erreur GitHub répétée passerait inaperçue. Vérifier les logs Vercel régulièrement ou brancher une alerte. |

---

## 3. Workflows GitHub Actions — analyse & améliorations

### Ce qui marche bien
- Modèle « bot → PR → review humaine → merge » : aucune donnée ne part en prod sans validation, l'historique Git fait office d'audit trail.
- Idempotence soignée : force-push sur branche `auto/*` datée, détection de PR déjà ouverte, labels auto-créés, job `cleanup` qui supprime la branche après merge.
- Corps de PR riches : checklist de review, procédure de correction, sources citées.
- Dédup robuste côté script (slug + cellule GPS ~200 m + photo).

### À améliorer (par ordre d'impact)

1. **Ajouter la CI manquante (= C1)** — c'est le chaînon absent du système : les PRs auto sont mergées sur la seule foi de la checklist manuelle. Un job `validate` (build) sur `pull_request` rendrait le merge sans risque. Bonus : un script `scripts/validate-content.ts` qui ne valide *que* les JSON (rapide, ~5 s) en plus du build complet.
2. **Décaler les deux crons** — `import-plages` et `enrich-pois` tournent tous deux à `0 6 * * *`. Si l'import merge de nouvelles plages, l'enrich du même jour ne les voit pas (il a checkout avant) ; et deux PRs simultanées touchant `content/plages/` peuvent entrer en conflit. Proposer : import à 05:00, enrich à 07:00 (l'enrich profite alors des plages importées et mergées tôt).
3. **Empêcher l'empilement de PRs d'import** — chaque jour crée une branche `auto/import-<date>` distincte : si les PRs ne sont pas reviewées, elles s'accumulent et peuvent se contredire (même plage candidate re-proposée). Avant de créer une PR, vérifier s'il existe déjà une PR `auto-import` ouverte (label) et dans ce cas pousser sur sa branche ou s'abstenir.
4. **`concurrency` group** — ajouter `concurrency: { group: import-plages, cancel-in-progress: false }` à chaque workflow pour éviter le chevauchement cron + `workflow_dispatch`.
5. **`timeout-minutes`** — aucun job n'a de timeout ; un Overpass qui ne répond pas peut bloquer le job 6 h (facturé). Mettre `timeout-minutes: 15`.
6. **Simplifier le job `cleanup`** — activer l'option du repo GitHub « Automatically delete head branches » et supprimer les deux jobs `cleanup` + le déclencheur `pull_request: closed` (qui lance aujourd'hui un run inutile à chaque PR fermée, y compris les PRs humaines).
7. **Surveiller la désactivation des crons** — GitHub désactive les workflows planifiés après 60 jours sans activité sur le repo. Les merges réguliers suffisent aujourd'hui, mais le savoir évite une panne silencieuse du pipeline.
8. **Épingler les actions par SHA** (durcissement supply-chain, optionnel) : `actions/checkout@v4` → `@<sha>`.

---

## 4. Migrations majeures (à planifier, une par session)

Dans l'ordre recommandé, chacune dans sa propre PR avec validation explicite (`Claude.md` interdit de toucher `package.json` sans demande) :

1. **React 18 → 19 + react-leaflet 4 → 5** (couplés : react-leaflet 5 exige React 19)
2. **Next 15 → 16** (clôt les advisories HIGH restants ; codemod officiel `npx @next/codemod@latest upgrade`)
3. **Zod 3 → 4** (`z.string().email()` → `z.email()`, schémas dans `content-schema.ts` + routes API)
4. **Tailwind 3 → 4** (`@theme` CSS, migrer la palette `ocean`/`sable`/`ardoise`/`vert` ; `tailwind-merge` → v3)

---

## 5. Vérification end-to-end (à exécuter après chaque lot)

```bash
npm ci
npm audit                  # cible : 0 HIGH/CRITICAL
npx tsc --noEmit
npm run lint
npm run build              # valide aussi tout content/plages/ via Zod
npx tsx scripts/import-plages.ts --dry-run   # smoke test pipeline
npm run dev                # vérifier : /, /recherche, /plage/<slug>, /contribuer, /contact
```

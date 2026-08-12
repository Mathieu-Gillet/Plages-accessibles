# TODO — Plages Accessibles

> Mis à jour le 2026-08-12. Voir `tasks/modifs.md` pour l'historique des livraisons.

---

## ✅ Livré — Mode communautaire (branche `feat/mode-communautaire`)

Fin des notes importées : la note d'une plage appartient désormais aux visiteurs.

### Suppression des notes fabriquées
- [x] **`noteGlobale` / `nombreAvis` / `avis` retirés du schéma de contenu** et des 268 fiches. Constat qui a motivé le chantier : 209 fiches sur 268 portaient exactement `4.2` et 53 portaient `4.0` (valeurs codées en dur par source), avec des `nombreAvis` inventés (66, 43, 37…) pour 2 avis réels.
- [x] Les 6 sources d'import (`handiplage-live`, `handiplage-sample`, `openstreetmap`, `datatourisme`, `acceslibre`, `tourisme-handicap`, `claude-research`) n'émettent plus aucune note ; `validate-candidate` n'en fabrique plus par défaut.
- [x] `/api/contribuer` n'écrit plus de note dans le JSON ; le ressenti du contributeur reste dans le corps de la PR comme signal de relecture.
- [x] Tri du loader de contenu : plus de tri par note (par nom), la mise en avant est calculée depuis les votes.

### Votes communautaires
- [x] **Table Supabase `votes`** + vues `plage_stats` / `plage_equipements` (`supabase/migrations/0001_votes_communautaires.sql`), avec reprise des 2 avis réels existants.
- [x] Un vote = **note 1-5 + validation des équipements annoncés** (« vu sur place » / « absent » / « je ne sais pas »). La liste validable est bornée côté serveur par la fiche : impossible de confirmer un équipement non annoncé.
- [x] **Seuil de publication `SEUIL_VOTES = 5`** : en dessous, aucune moyenne n'est affichée (fiche, carte, cartes de résultats, `aggregateRating` JSON-LD) — seule la progression « 3/5 votes ».
- [x] Déduplication : cookie anonyme `pa_votant` (index unique en base) + plafond souple de 3 votes par IP et par plage. Empreintes SHA-256 salées, aucune IP en clair.
- [x] Commentaires modérés (`statut = 'en_attente'` → `'publie'`) ; la note compte immédiatement. Notification Resend optionnelle.
- [x] `/api/avis` (1 PR GitHub par avis) **supprimée**, remplacée par `/api/vote`. Préfixe `avis/` retiré de l'auto-merge CI.
- [x] Confirmations affichées sur la fiche (« Tiralo — confirmé par 4 visiteurs », équipement contesté signalé).
- [x] Dégradation propre : sans les 3 variables Supabase, les pages s'affichent sans note et `/api/vote` répond `503`. Le build ne casse pas (vérifié).
- [x] Accès serveur uniquement (*service role key*) : le navigateur ne contacte jamais Supabase, la CSP `connect-src` reste inchangée.

### Carte d'accueil
- [x] **Plafond de 5 plages par région** (268 → 65 marqueurs sur 15 régions). Classement déterministe : plages notées d'abord (note puis nombre de votes), puis les mieux équipées et vérifiées le plus récemment.
- [x] Filtres par tranche de note (★ 4-5, ★ 3-4…) remplacés par « Toutes / Notées par les visiteurs / En attente de votes » — les tranches n'avaient plus de sens avec le seuil.
- [x] Mention explicite « sélection de 5 plages par région » + lien vers les 268 plages de `/recherche`.
- [x] ISR 5 min sur accueil / fiches / recherche, purgé immédiatement après un vote.
- [x] 29 tests supplémentaires (`votes-core`, `carte-accueil`) → 75 au total.

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

- [ ] **Projet Supabase (bloquant pour les votes)** :
  1. Créer un projet sur https://supabase.com (free tier suffisant).
  2. SQL Editor → exécuter `supabase/migrations/0001_votes_communautaires.sql`.
  3. Project Settings → API : relever l'URL et la `service_role` key.
  4. Renseigner `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` et `VOTE_SALT` (`openssl rand -hex 32`) dans Vercel **et** `.env.local`.
  Tant que ce n'est pas fait, le site tourne normalement mais aucun vote n'est enregistrable.
- [ ] **Modération des commentaires** : Supabase → Table editor → `votes`, passer `statut` de `en_attente` à `publie`. Une interface d'admin dédiée reste à écrire (voir plus bas).
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

- [ ] **Interface de modération** des commentaires de vote (aujourd'hui : Table editor Supabase à la main).
- [ ] **Amorcer les votes** : aucune plage n'atteindra 5 votes sans trafic. Prévoir un appel à contribution (bandeau, réseaux, associations) sinon la carte restera durablement sans note.
- [ ] Tests d'intégration de `/api/vote` avec Supabase mocké (déduplication, plafond IP, 409, 503).

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

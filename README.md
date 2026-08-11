# Plages Accessibles

Annuaire collaboratif et gratuit des plages françaises accessibles aux personnes en situation de handicap.

**En ligne : https://plages-accessibles.fr** — ~35 plages référencées, enrichies automatiquement chaque jour.

---

## Stack technique

- **Next.js 15** (App Router, SSG — pages plages générées statiquement)
- **TypeScript 5** (strict)
- **Tailwind CSS 3** (palette personnalisée `ocean`/`sable`/`ardoise`/`vert`)
- **Leaflet + React-Leaflet** (carte interactive OpenStreetMap)
- **Zod** (validation du contenu au build : un fichier invalide = build cassé, jamais de données corrompues en prod)
- **Aucune base de données** — chaque plage est un fichier JSON dans `content/plages/`, versionné dans Git
- **GitHub comme back-office** — pipeline autonome : l'import quotidien valide et commite directement sur `master` ; les contributions/avis du site ouvrent des Pull Requests mergées automatiquement dès que la CI est verte (aucun merge manuel)
- **Vercel** (hébergement, Analytics, Speed Insights)

---

## Démarrage rapide

```bash
npm install
npm run dev
```

Le site est accessible sur **http://localhost:3000**. Aucune variable d'environnement n'est requise pour consulter le site en local (seuls les formulaires de contribution/avis nécessitent `GITHUB_PAT`, voir `.env.example`).

---

## Architecture

```
content/
├── plages/                   ← Données des plages (un fichier JSON par plage)
└── exclusions.json           ← Liste noire éditoriale (plages définitivement écartées de l'import)

src/
├── app/
│   ├── page.tsx              ← Accueil : hero, carte France, top plages
│   ├── recherche/            ← Recherche par région, département ou texte libre
│   ├── plage/[slug]/         ← Page détail (SSG + JSON-LD schema.org Beach)
│   ├── contribuer/           ← Formulaire de proposition de plage
│   ├── contact/              ← Page contact
│   ├── mentions-legales/     ← Mentions légales
│   ├── a-propos/             ← Présentation du projet et des équipements
│   ├── accessibilite/        ← Déclaration d'accessibilité RGAA
│   ├── api/contribuer/       ← POST → crée une branche + PR GitHub (nouvelle plage)
│   ├── api/avis/             ← POST → crée une branche + PR GitHub (nouvel avis)
│   ├── robots.ts / sitemap.ts ← SEO
├── components/
│   ├── features/             ← Composants métier (cartes, filtres, formulaires…)
│   └── map/                  ← Composants Leaflet (carte accueil, carte détail)
├── lib/
│   ├── content.ts            ← Chargeur de contenu JSON (cache mémoire, filtres, recherche)
│   ├── content-schema.ts     ← Schémas Zod de validation du contenu
│   ├── github.ts             ← Helpers API GitHub (branche, commit, PR)
│   ├── anti-spam.ts          ← Honeypot + rate-limit par IP des routes publiques
│   ├── site.ts               ← URL canonique du site
│   └── utils.ts              ← Utilitaires (formatNote, slugify, cn…)
└── types/index.ts            ← Interfaces TypeScript partagées

scripts/
├── import-plages.ts          ← Orchestrateur d'import quotidien (CI)
├── enrich-pois.ts            ← Enrichissement hébergements + offres culturelles (OSM)
├── enrich-photos.ts          ← Enrichissement photos Wikimedia Commons
├── sources/                  ← Connecteurs de sources de données
│   ├── handiplage-live.ts    ← handiplage.fr (label Handiplage)
│   ├── tourisme-handicap.ts  ← data.economie.gouv.fr (label Tourisme & Handicap)
│   ├── acceslibre.ts         ← acceslibre.beta.gouv.fr (clé API requise)
│   ├── datatourisme.ts       ← flux DataTourisme (clé API requise)
│   ├── openstreetmap.ts      ← Overpass API (plages taguées wheelchair)
│   ├── claude-research.ts    ← API Claude en dernier recours (clé requise)
│   └── handiplage-sample.ts  ← liste curatée de secours
└── lib/
    ├── validate-candidate.ts ← Contrôles qualité avant import
    ├── ai-description.ts     ← Réécriture des descriptions via Claude Haiku
    ├── wikimedia.ts          ← Résolution de photos libres de droits
    └── geo.ts                ← Helpers géographiques (slug, région, département)

.github/workflows/
├── import-plages.yml         ← Cron quotidien : nouvelles plages → commit direct master
├── enrich-pois.yml           ← Cron quotidien : POIs accessibles → commit direct master
└── ci.yml                    ← Validation + auto-merge des PR publiques (contribution/avis)
```

---

## Commandes utiles

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production (SSG — valide aussi tout le contenu via Zod) |
| `npm run lint` | Vérification ESLint (flat config, ESLint 9) |
| `npx tsx scripts/import-plages.ts --dry-run` | Tester l'import sans écrire de fichiers |
| `npx tsx scripts/enrich-pois.ts` | Enrichir les POIs des plages existantes |

---

## Comment le contenu arrive sur le site

Le site est **autonome** : aucun merge manuel n'est requis. Tout contenu est validé
automatiquement (lint + types + tests + build Zod) avant publication, puis arrive
sur `master` ; Vercel redéploie. Il n'y a plus de branches `auto/*` ni de PR à
reviewer pour le contenu généré.

### 1. Pipeline d'import automatique (quotidien)

`.github/workflows/import-plages.yml` exécute chaque jour `scripts/import-plages.ts` :

1. Déduplique les plages existantes (photo identique, GPS à ~100 m)
2. Interroge les sources par ordre de fiabilité (labels officiels → OSM → IA)
3. Écarte les candidats inscrits dans `content/exclusions.json` (voir ci-dessous)
4. Valide chaque candidat (GPS en France, ≥ 1 équipement, description ≥ 120 car.)
5. Réécrit la description via Claude Haiku (si `ANTHROPIC_API_KEY` présent)
6. Cherche une vraie photo sur Wikimedia Commons
7. Écrit les JSON (max 25/jour), **valide le tout puis commite directement sur `master`**

#### Retirer une plage pour de bon

Supprimer le fichier de `content/plages/` **ne suffit pas** : les sources sont
réinterrogées chaque matin et la fiche revient le lendemain. Il faut aussi
ajouter une entrée dans `content/exclusions.json` :

```json
{
  "slug": "plage-du-lac-dauron-bourges",
  "commune": "Bourges",
  "latitude": 47.0552775,
  "longitude": 2.397583,
  "date": "2026-08-11",
  "raison": "Fiche construite sur un seul tag wheelchair=limited, photo hors-sujet."
}
```

`latitude`/`longitude` sont facultatives mais recommandées : elles bloquent aussi
la réimportation du même lieu sous un autre nom (nœud OSM renommé, autre source).

`.github/workflows/enrich-pois.yml` complète de la même façon les hébergements et offres culturelles accessibles (source OSM, tags `wheelchair=yes/designated`, rayon 10 km), validés puis commités directement sur `master`.

### 2. Formulaires du site (visiteurs)

- **/contribuer** → `POST /api/contribuer` → PR `contribution/*` (plage créée avec `actif: false`, activée par l'admin)
- **Avis sur une page plage** → `POST /api/avis` → PR `avis/*` (+ notification email optionnelle via Resend)

Ces PR publiques sont **mergées automatiquement dès que la CI est verte** (job `auto-merge` de `.github/workflows/ci.yml`, limité aux préfixes `contribution/` et `avis/`). Les plages contribuées restent `actif: false` jusqu'à activation par l'admin ; les avis sont publiés au merge.

Protection anti-spam : honeypot + rate-limit par IP. Le `GITHUB_PAT` côté serveur est requis.

### 3. Fichier JSON direct (contributeurs Git)

Créez `content/plages/nom-de-la-plage.json` :

```json
{
  "slug": "grande-plage-exemple",
  "nom": "Grande Plage d'Exemple",
  "description": "Au moins 150 caractères décrivant la plage et ses équipements d'accessibilité…",
  "commune": "Exemple-sur-Mer",
  "codePostal": "12345",
  "departement": "Exemple",
  "region": "Ma Région",
  "latitude": 47.1234,
  "longitude": -1.5678,
  "photo": "https://upload.wikimedia.org/...",
  "photos": [],
  "noteGlobale": 4.2,
  "nombreAvis": 0,
  "actif": true,
  "verifiedAt": "2026-01-01",
  "verifiedBy": "handiplage.fr",
  "accessibilites": ["FAUTEUIL_ROULANT", "TIRALO", "CHEMIN_ACCES"],
  "hebergements": [],
  "offresCulturelles": [],
  "avis": []
}
```

Types d'accessibilité disponibles : `FAUTEUIL_ROULANT`, `TIRALO`, `HIPPOCAMPE`, `HANDISURF`, `CHEMIN_ACCES`, `RAMPE_ACCES`, `SABLE_COMPACT`, `DOUCHES_ACCESSIBLES`, `SANITAIRES_ADAPTES`, `PARKINGS_PMR`, `PERSONNEL_FORME`, `LOCATION_MATERIEL`, `SIGNALISATION_BRAILLE`, `BOUCLE_MAGNETIQUE`

Règles validées au build : une plage `actif: true` doit avoir des coordonnées GPS ≠ (0,0) ; toutes les URLs doivent être en HTTPS.

---

## Déploiement

Le site est déployé sur **Vercel** : chaque merge sur `master` déclenche un rebuild (~2 min).

Variables d'environnement (voir `.env.example`) :

| Variable | Requis | Usage |
|---|---|---|
| `GITHUB_PAT` | Oui (formulaires) | Fine-grained PAT, scopes Contents + Pull requests, restreint à ce dépôt |
| `NEXT_PUBLIC_SITE_URL` | Recommandé | URL canonique (SEO, sitemap) |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` / `ADMIN_EMAIL` | Non | Notification email à l'admin lors d'un nouvel avis |

Secrets GitHub Actions (workflows d'import) :

| Secret | Requis | Usage |
|---|---|---|
| `ANTHROPIC_API_KEY` | Non | Descriptions IA + source claude-research |
| `ACCESLIBRE_API_KEY` | Non | Source acceslibre.beta.gouv.fr |
| `DATATOURISME_API_KEY` | Non | Source DataTourisme |

---

## Contribuer (code)

1. Forkez le dépôt
2. Créez une branche : `git checkout -b feat/ma-contribution`
3. Vérifiez : `npm run build && npm run lint`
4. Ouvrez une Pull Request

### Ce que nous cherchons

- Nouvelles plages avec coordonnées GPS précises et description détaillée
- Correction ou mise à jour des équipements d'accessibilité
- Photos libres de droits (Wikimedia Commons de préférence)
- Améliorations UI/UX, accessibilité (RGAA) et corrections de bugs

---

## Accessibilité du site

Ce site vise le niveau **RGAA AA** :

- Navigation clavier complète (skip link, focus visible)
- ARIA labels sur tous les éléments interactifs
- Contraste minimum 4.5:1
- Textes redimensionnables jusqu'à 200%
- Compatibilité lecteurs d'écran (VoiceOver, NVDA)
- Balisage sémantique HTML5 (nav, main, section, article, hiérarchie de titres)

---

## Licence

MIT — Contributions bienvenues

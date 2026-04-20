# Plages Accessibles

Annuaire collaboratif et gratuit des plages françaises accessibles aux personnes en situation de handicap.

---

## Stack technique

- **Next.js 14** (App Router, SSG/SSR)
- **TypeScript 5**
- **Tailwind CSS 3** (palette personnalisée)
- **Leaflet + React-Leaflet** (carte interactive OpenStreetMap)
- **Zod** (validation des données à la compilation)
- Aucune base de données — les plages sont des fichiers JSON dans `content/plages/`

---

## Démarrage rapide

```bash
npm install
npm run dev
```

Le site est accessible sur **http://localhost:3000**

---

## Structure du projet

```
content/
└── plages/               ← Données des plages (un fichier JSON par plage)

src/
├── app/
│   ├── page.tsx          ← Accueil : hero, carte France, top plages
│   ├── recherche/        ← Recherche par région, département ou nom
│   ├── plage/[slug]/     ← Page détail d'une plage (générée statiquement)
│   ├── a-propos/         ← Présentation du projet et des équipements
│   ├── contribuer/       ← Formulaire de contribution (via GitHub Issues)
│   └── accessibilite/    ← Déclaration d'accessibilité RGAA
├── components/
│   ├── features/         ← Composants métier (cartes, filtres, badges…)
│   └── map/              ← Composants Leaflet (carte accueil, carte détail)
├── lib/
│   ├── content.ts        ← Chargeur de données JSON (cache mémoire)
│   ├── content-schema.ts ← Schémas Zod de validation
│   └── utils.ts          ← Utilitaires (formatNote, slugify, cn…)
└── types/index.ts        ← Interfaces TypeScript partagées

scripts/
├── import-plages.ts      ← Orchestrateur d'import quotidien (CI)
├── enrich-photos.ts      ← Enrichissement photos Wikimedia Commons
└── lib/
    ├── validate-candidate.ts ← Contrôles qualité avant import
    └── wikimedia.ts          ← Résolution de photos libres de droits
```

---

## Commandes utiles

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production (SSG) |
| `npm run lint` | Vérification ESLint |

---

## Ajouter une plage

### Via un fichier JSON (méthode directe)

Créez `content/plages/nom-de-la-plage.json` en respectant le schéma :

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

Types d'accessibilité disponibles : `FAUTEUIL_ROULANT`, `TIRALO`, `HIPPOCAMPE`, `HANDISURF`, `CHEMIN_ACCES`, `RAMPE_ACCES`, `SABLE_COMPACTE`, `DOUCHES_ACCESSIBLES`, `SANITAIRES_ADAPTES`, `PARKINGS_PMR`, `PERSONNEL_FORME`, `LOCATION_MATERIEL`, `SIGNALISATION_BRAILLE`, `BOUCLE_INDUCTIVE`

### Via GitHub Issues (méthode collaborative)

Ouvrez une issue avec le template « Proposer une plage » sur le dépôt. Le pipeline d'import quotidien prend en charge la validation et l'intégration automatique.

### Via le pipeline d'import (CI)

Le script `scripts/import-plages.ts` s'exécute automatiquement chaque jour. Il :
1. Récupère les candidats depuis les sources de données enregistrées
2. Valide chaque candidat (source autorisée, GPS dans les limites de la France, description >= 150 car., >= 2 équipements)
3. Enrichit les photos via Wikimedia Commons
4. Écrit les fichiers JSON validés dans `content/plages/`
5. Ouvre une Pull Request automatique

---

## Déploiement

### Vercel (recommandé)

```bash
npm i -g vercel
vercel
```

Aucune variable d'environnement n'est requise pour le fonctionnement de base — le site est entièrement statique. Pour activer l'analytics :

```
NEXT_PUBLIC_SITE_URL=https://votre-domaine.fr
```

---

## Contribuer

1. Forkez le dépôt
2. Créez une branche : `git checkout -b feat/ma-contribution`
3. Committez vos changements avec un message clair
4. Ouvrez une Pull Request

### Ce que nous cherchons

- Nouvelles plages avec coordonnées GPS précises et description détaillée
- Correction ou mise à jour des équipements d'accessibilité
- Photos libres de droits (Wikimedia Commons de préférence)
- Hébergements et offres culturelles à proximité des plages existantes
- Améliorations UI/UX et corrections de bugs

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

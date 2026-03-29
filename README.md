# 🌊 Plages Accessibles

Annuaire collaboratif des plages françaises accessibles aux personnes en situation de handicap.

## Stack technique

- **Next.js 14** (App Router, SSR)
- **TypeScript**
- **Tailwind CSS**
- **Prisma** + **PostgreSQL**
- **Leaflet** (carte interactive OpenStreetMap)

---

## Démarrage en 3 commandes

```bash
# 1. Installer les dépendances
npm install

# 2. Démarrer la base de données (Docker requis)
docker compose up -d

# 3. Initialiser la base et lancer le serveur
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

Le site est accessible sur **http://localhost:3000**

---

## Structure du projet

```
src/
├── app/                    ← Pages (Next.js App Router)
│   ├── page.tsx            ← Accueil avec carte + top plages
│   ├── recherche/          ← Recherche par région/département
│   ├── plage/[slug]/       ← Page détail d'une plage
│   └── api/                ← Routes API REST
├── components/
│   ├── features/           ← Composants métier
│   └── map/                ← Composants carte Leaflet
├── lib/                    ← Prisma, utilitaires
└── types/                  ← Types TypeScript partagés
prisma/
├── schema.prisma           ← Modèle de données
└── seed.ts                 ← Données d'exemple
```

---

## Commandes utiles

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run db:migrate` | Appliquer les migrations |
| `npm run db:seed` | Insérer les données d'exemple |
| `npm run db:studio` | Interface Prisma Studio |

---

## Ajouter une plage

Deux méthodes :

**1. Via Prisma Studio** (développement)
```bash
npm run db:studio
```

**2. Via le seed** (`prisma/seed.ts`)  
Ajoutez votre plage dans le tableau `plagesData` et relancez `npm run db:seed`.

**3. Interface admin** *(à développer)*  
Une interface `/admin` protégée par `ADMIN_SECRET_KEY` est prévue.

---

## Déploiement

### Vercel (recommandé)

```bash
npm i -g vercel
vercel
```

Configurez la variable `DATABASE_URL` dans les settings Vercel avec votre PostgreSQL hébergé (ex: [Neon](https://neon.tech), Supabase, Railway).

### Variables d'environnement requises en production

```
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SITE_URL=https://votre-domaine.fr
```

---

## Contribuer

1. Forkez le repo
2. Créez une branche : `git checkout -b feat/nouvelle-plage`
3. Committez vos changements
4. Ouvrez une Pull Request

### Données recherchées

Pour chaque plage :
- Coordonnées GPS précises
- Types d'équipements d'accessibilité disponibles
- Photos libres de droits
- Hébergements et offres culturelles à proximité

---

## Accessibilité du site lui-même

Ce site vise le niveau **RGAA AA** :
- Navigation clavier complète (skip link, focus visible)
- ARIA labels sur tous les éléments interactifs
- Contraste minimum 4.5:1
- Textes redimensionnables jusqu'à 200%
- Compatibilité lecteurs d'écran (VoiceOver, NVDA)

---

## Licence

MIT — Contributions bienvenues 🤝

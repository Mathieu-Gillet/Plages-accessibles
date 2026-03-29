# Mise en production — Plages Accessibles

## 1. Hébergement de la base de données PostgreSQL

### Option recommandée : Neon (gratuit, serverless)
1. Créer un compte sur https://neon.tech
2. Créer un nouveau projet → copier la **Connection string**
3. Elle ressemble à : `postgresql://user:password@ep-xxx.eu-west-2.aws.neon.tech/plages_accessibles?sslmode=require`

### Alternatives
| Service | Gratuit | Notes |
|---------|---------|-------|
| Neon | 500 Mo | Meilleur choix pour Next.js |
| Supabase | 500 Mo | Inclut dashboard admin |
| Railway | 1 Go (trial) | Très simple à configurer |
| Render | 90 jours | Expire après 3 mois |

---

## 2. Déploiement du site Next.js

### Option recommandée : Vercel (gratuit, optimisé Next.js)
1. Créer un compte sur https://vercel.com
2. Pousser le projet sur GitHub :
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   # Créer un repo sur github.com puis :
   git remote add origin https://github.com/TON_USER/plages-accessibles.git
   git push -u origin main
   ```
3. Sur Vercel : **New Project** → importer le repo GitHub
4. Dans **Environment Variables**, ajouter :
   - `DATABASE_URL` → ta connection string Neon
   - `NEXT_PUBLIC_SITE_URL` → `https://ton-projet.vercel.app`
5. Cliquer **Deploy**

### Après déploiement : initialiser la base
```bash
# Depuis ton poste local, pointer vers la DB de prod
DATABASE_URL="postgresql://..." npx prisma db push
DATABASE_URL="postgresql://..." npx prisma db seed
```

---

## 3. Domaine personnalisé (optionnel)
1. Acheter un domaine sur OVH, Namecheap, etc.
2. Dans Vercel → **Domains** → ajouter ton domaine
3. Configurer les DNS chez ton registrar (Vercel fournit les valeurs A/CNAME)

---

## 4. Ajout automatique de plages via Claude (tâches planifiées)

Claude Code permet de créer des **agents planifiés** qui s'exécutent automatiquement selon un calendrier cron.

### Principe
Un agent Claude tourne chaque nuit, scrape des sources officielles, et insère les nouvelles plages en base via Prisma.

### Sources à scraper
| Source | Données disponibles |
|--------|---------------------|
| https://www.data.gouv.fr/fr/datasets/plages-de-france | Inventaire officiel des plages |
| https://www.handiplage.fr | Équipements handicap certifiés |
| https://www.spl-tourisme.fr | Offres tourisme accessible |
| https://opendata.lillemetropole.fr | Données locales accessibilité |
| Géoportail IGN (API) | Coordonnées GPS officielles |

### Créer la tâche planifiée dans Claude Code

Dans le terminal Claude Code, lancer :
```
/schedule
```

Puis configurer un agent avec ce prompt (exemple pour un scraping quotidien à 3h du matin) :

```
Cron: 0 3 * * *
Prompt:
Tu es un agent de collecte de données pour le site Plages Accessibles.

Chaque nuit, tu dois :
1. Consulter les sources suivantes pour trouver de nouvelles plages accessibles françaises :
   - https://www.handiplage.fr (liste des plages labellisées)
   - https://www.data.gouv.fr (datasets plages de France)
2. Pour chaque plage trouvée non encore présente en base :
   - Récupérer : nom, commune, département, région, latitude, longitude, description, photo, équipements accessibilité
   - Générer un slug unique (kebab-case du nom + commune)
   - Insérer via le script scripts/add-plage.ts
3. Logger le nombre de plages ajoutées dans scripts/logs/import.log
4. Ne pas dupliquer les plages déjà existantes (vérifier par slug ou nom+commune)

Répertoire de travail : C:\Claude\Plages
```

### Script d'insertion à créer

Créer le fichier `scripts/add-plage.ts` pour que l'agent puisse insérer proprement :

```typescript
// scripts/add-plage.ts
// Usage: tsx scripts/add-plage.ts --json '{"nom":"...","commune":"...",...}'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addPlage(data: {
  nom: string
  slug: string
  commune: string
  departement: string
  region: string
  latitude: number
  longitude: number
  description?: string
  photo?: string
  accessibilites?: string[] // ex: ["PMR", "MALVOYANT", "MALENTENDANT"]
}) {
  const existing = await prisma.plage.findUnique({ where: { slug: data.slug } })
  if (existing) {
    console.log(`⏭ Déjà existante : ${data.nom}`)
    return
  }

  await prisma.plage.create({
    data: {
      nom: data.nom,
      slug: data.slug,
      commune: data.commune,
      departement: data.departement,
      region: data.region,
      latitude: data.latitude,
      longitude: data.longitude,
      description: data.description,
      photo: data.photo,
      actif: true,
      accessibilites: {
        create: (data.accessibilites ?? []).map((type) => ({ type })),
      },
    },
  })
  console.log(`✅ Ajoutée : ${data.nom} (${data.commune})`)
}

const arg = process.argv.find((a) => a.startsWith('--json'))
if (arg) {
  const json = arg.split('=')[1] ?? process.argv[process.argv.indexOf('--json') + 1]
  addPlage(JSON.parse(json)).finally(() => prisma.$disconnect())
}
```

### Exemple de planification alternative (hebdomadaire)

Pour un scraping plus approfondi le dimanche :
```
Cron: 0 2 * * 0
Prompt:
Agent scraping approfondi — cherche les plages mal référencées,
enrichit les descriptions manquantes, ajoute les photos depuis
Wikimedia Commons, met à jour les notes depuis les avis Google Places.
```

---

## 5. Variables d'environnement en production

Fichier `.env.local` (jamais commité sur Git) :
```env
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SITE_URL="https://ton-domaine.fr"
ADMIN_SECRET_KEY="une-clé-secrète-longue-et-aléatoire"
```

Ajouter `.env` et `.env.local` au `.gitignore` :
```
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

---

## 6. Checklist avant mise en ligne

- [ ] Base de données PostgreSQL créée (Neon ou autre)
- [ ] `prisma db push` exécuté sur la DB de prod
- [ ] `prisma db seed` exécuté (données initiales)
- [ ] Variables d'environnement configurées sur Vercel
- [ ] Site déployé et accessible via l'URL Vercel
- [ ] Domaine personnalisé configuré (optionnel)
- [ ] Tâche planifiée Claude créée (`/schedule`)
- [ ] Script `scripts/add-plage.ts` créé et testé
- [ ] `.gitignore` contient `.env*`

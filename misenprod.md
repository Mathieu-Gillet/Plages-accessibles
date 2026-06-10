# Mise en production — Plages Accessibles

> Mis à jour le 2026-06-10. Le site est en production sur **https://plages-accessibles.fr** (Vercel).
> L'ancienne version de ce document décrivait une architecture Prisma + PostgreSQL abandonnée — le site est désormais **entièrement statique**, sans base de données.

## 1. Architecture de production

- **Hébergement** : Vercel, connecté au repo GitHub `Mathieu-Gillet/Plages-accessibles`.
- **Déploiement** : chaque merge sur `master` déclenche un build (~2 min). Le contenu (`content/plages/*.json`) est validé par Zod pendant le build — un fichier invalide fait échouer le déploiement (la version précédente reste en ligne).
- **Pas de base de données** : tout le contenu est versionné dans Git.
- **Back-office = GitHub** : les contributions et avis soumis sur le site, ainsi que les imports automatiques quotidiens, arrivent sous forme de Pull Requests à reviewer puis merger.

## 2. Variables d'environnement (Vercel → Settings → Environment Variables)

| Variable | Requis | Usage |
|---|---|---|
| `GITHUB_PAT` | **Oui** | Fine-grained PAT (https://github.com/settings/tokens), scopes **Contents** + **Pull requests** (read & write), restreint au seul dépôt. Utilisé par `/api/contribuer` et `/api/avis` pour créer branches + PRs. ⚠️ Penser à la **date d'expiration** du token : la renouveler avant échéance sinon les formulaires renvoient des erreurs 502. |
| `NEXT_PUBLIC_SITE_URL` | Recommandé | URL canonique (`https://plages-accessibles.fr`) — SEO, sitemap, JSON-LD. |
| `RESEND_API_KEY` | Non | Notification email à l'admin quand un avis est soumis. Sans elle, le flux PR fonctionne quand même. |
| `RESEND_FROM_EMAIL` | Non | Expéditeur vérifié sur resend.com. |
| `ADMIN_EMAIL` | Non | Destinataire des notifications. |

## 3. Secrets GitHub Actions (repo → Settings → Secrets → Actions)

Utilisés par les workflows quotidiens (`import-plages.yml`, `enrich-pois.yml`) :

| Secret | Requis | Usage |
|---|---|---|
| `ANTHROPIC_API_KEY` | Non | Descriptions IA (Claude Haiku) + source `claude-research`. Sans clé : descriptions template conservées, source ignorée. |
| `ACCESLIBRE_API_KEY` | Non | Source acceslibre.beta.gouv.fr. |
| `DATATOURISME_API_KEY` | Non | Source DataTourisme. |

`GITHUB_TOKEN` est fourni automatiquement par Actions (permissions `contents: write` + `pull-requests: write` déclarées dans les workflows).

## 4. Routine d'exploitation

### Quotidien (~5 min)
1. Reviewer les PRs `auto-import` / `auto-enrich` du matin (checklist incluse dans chaque PR).
2. Reviewer les PRs `contribution/*` et `avis/*` issues des formulaires du site (vérifier ton, spam, doublons ; compléter les GPS manquants et passer `actif: true` pour publier une contribution).
3. Merger → Vercel redéploie automatiquement.

### En cas de build Vercel cassé après un merge
Le fautif est presque toujours un JSON de `content/plages/` invalide. Le log de build Vercel affiche le fichier et le champ rejeté par Zod. Corriger le fichier (ou révert le merge) et pousser.

### Points de vigilance
- **Expiration du `GITHUB_PAT`** : les formulaires du site tombent en 502 silencieusement. Vérifier les logs Vercel (`[api/avis]`, `[api/contribuer]`) en cas de doute.
- **Crons GitHub** : désactivés automatiquement après 60 jours sans activité sur le repo. Réactiver dans l'onglet Actions le cas échéant.
- **PRs auto non reviewées** : elles s'accumulent (une branche datée par jour). Les traiter régulièrement évite les conflits entre elles.

## 5. Checklist de (re)mise en ligne

- [ ] Repo connecté à Vercel, branche de production = `master`
- [ ] `GITHUB_PAT` configuré et non expiré (tester un avis sur une plage en préprod/prod)
- [ ] `NEXT_PUBLIC_SITE_URL` = domaine de production
- [ ] Domaine personnalisé configuré (Vercel → Domains)
- [ ] Secrets Actions posés si on veut l'enrichissement IA / sources à clé
- [ ] Workflows actifs dans l'onglet Actions (pas désactivés pour inactivité)
- [ ] `npm run build` local OK avant tout merge de PR de code

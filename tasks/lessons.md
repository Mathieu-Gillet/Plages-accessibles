# Leçons — Plages Accessibles

## 2026-04-16 — Migrations de dépendances

### L1 — `next lint` (Next 14) ne lit pas la flat config ESLint 9
**Symptôme** : `npm run lint` lance un prompt interactif demandant le mode de config.
**Cause** : `next lint` (Next ≤ 15) suppose un `.eslintrc` legacy. Il ne détecte pas `eslint.config.mjs`.
**Solution** : changer le script `lint` en `eslint .` pour appeler le binaire ESLint 9 directement. La migration `next lint` → `eslint .` est officielle depuis Next 15.
**À retenir** : tant qu'on reste en Next 14, ne pas écrire `next lint` dans le script `lint` après être passé en flat config.

### L2 — `@types/react` 18.3.28 resserre les contraintes d'index signature
**Symptôme** : build échoue avec `Type 'X' is not assignable to type 'Record<string, string | undefined>'. Index signature for type 'string' is missing`.
**Cause** : passer une interface aux clés explicites (`{ region?: string; q?: string }`) à un composant qui attend un `Record<string, string | undefined>` exigeait déjà une signature d'index, mais c'est désormais strictement vérifié.
**Solution** : ajouter `[key: string]: string | undefined` à l'interface du parent OU resserrer le type côté enfant.
**À retenir** : pour les Next.js `searchParams`, préférer typer comme `Record<string, string | string[] | undefined>` partout par cohérence (et ce sera le type natif obligatoire en Next 15+).

### L3 — Vulnérabilités transitives via `eslint-config-next`
**Symptôme** : `npm audit` remonte des HIGH dans `glob`, mais `glob` n'est pas une dépendance directe.
**Cause** : `eslint-config-next` 14 dépend de `@next/eslint-plugin-next` qui dépend de `glob` >=10.2 <10.5 (vulnérable à GHSA-5j98-mcp5-4vw2).
**Solution** : la chaîne ne se débloque qu'en bumpant `eslint-config-next` ≥ 15. ESLint 9 est requis en parallèle car `eslint-config-next@15` ne supporte plus ESLint 8.
**À retenir** : avant un audit, toujours vérifier la chaîne transitive avec `npm ls <paquet-vulnérable>` pour identifier le parent à bumper plutôt que tenter `npm audit fix` (qui peut casser des paquets non-vulnérables).

### L4 — Le user a dérogé à l'interdiction CLAUDE.md « ne pas modifier package.json »
**Contexte** : CLAUDE.md liste « Ne jamais modifier `package.json` sans demande explicite » dans les interdictions absolues.
**Décision** : la requête utilisateur du 2026-04-16 (« fait les modifications pour que toutes les dépendances soient à jours ») constitue la demande explicite requise. Modifications `package.json` autorisées dans le périmètre de cette session uniquement.
**À retenir** : dans une session future, ne pas re-modifier `package.json` sans nouvelle demande explicite. La dérogation n'est pas reconductible.

# Exception — Les statuts CI ne sont pas encore requis pour fusionner

- **Objet** : la protection de `main` est active, mais elle n'exige pas encore que la CI soit verte, ni une revue CODEOWNERS.
- **Date d'acceptation** : 2026-08-20
- **Date de réexamen** : 2026-09-20
- **Portée** : dépôt `Bricestepahene/kofra`, branche `main`.
- **Remplace** : l'exception « protection de branche non appliquée » du même jour, devenue sans objet après le passage du dépôt en public.

## Ce qui est désormais réellement appliqué

Le dépôt est passé **public** le 2026-08-20, ce qui a débloqué les protections. Vérifié par l'API après configuration :

| Contrôle | État |
|---|---|
| Pull Request obligatoire | ✅ actif |
| Push direct sur `main` | ✅ bloqué |
| `enforce_admins` (aucun contournement, y compris propriétaire) | ✅ actif |
| Historique linéaire requis | ✅ actif |
| Force-push / suppression de branche | ✅ interdits |
| Résolution des conversations avant fusion | ✅ requise |
| Secret scanning | ✅ activé |
| Push protection (blocage d'un secret à la volée) | ✅ activée |
| Alertes et mises à jour de sécurité Dependabot | ✅ actives |

## Ce qui reste non appliqué — l'objet de cette exception

1. **Aucun statut CI n'est requis pour fusionner** (`required_status_checks: null`). Un job `security` ou `control-plane` rouge **n'empêche pas** la fusion d'une PR. C'est exactement l'écart que `CLAUDE.md` §5 et `docs/SECURITY_POLICY.md` décrivent comme un gate : il ne se referme réellement qu'ici.
2. **La revue CODEOWNERS n'est pas exigée** (`require_code_owner_reviews: false`). `.github/CODEOWNERS` reste une cartographie du risque, pas un garde-fou technique.
3. **Aucune approbation n'est requise** (`required_approving_review_count: 0`).

## Pourquoi ce n'est pas simplement « oublié »

Ces trois réglages sont volontaires, et chacun a une raison précise :

- **Statuts CI** : exiger un contexte dont le nom est mal orthographié bloque **définitivement** toute fusion, sans recours évident. Or les workflows n'ont encore jamais produit de run sur une PR : les noms exacts des checks (`codeql (go)`, `trivy (CRITICAL — bloquant)`, etc.) ne sont pas confirmés, seulement déduits des champs `name:` des workflows. Les exiger à l'aveugle serait précisément le type de faux-vert que ce projet refuse. La première PR révélera les noms réels.
- **CODEOWNERS et approbations** : l'unique CODEOWNER est aujourd'hui l'unique auteur. GitHub interdisant d'approuver sa propre PR, exiger une approbation ou une revue CODEOWNERS rendrait toute fusion impossible en solo.

## Compensation en vigueur

1. Le push direct étant bloqué, **tout changement passe désormais réellement par une PR** — ce n'est plus une règle de discipline, c'est appliqué par la plateforme.
2. **Le relecteur constate le vert de la CI à la main** avant de fusionner, tant que les statuts ne sont pas requis.
3. Push protection intercepte un secret **avant** qu'il n'entre dans l'historique, ce qui couvre le risque le plus grave indépendamment de la CI.
4. Les exigences renforcées de `docs/DEFINITION_OF_DONE.md` pour `vault`, `recovery`, `policy`, `proof`, `identity` et `extension` restent vérifiées manuellement.

## Action requise pour lever l'exception

1. Ouvrir la **première Pull Request** (celle du LOT PRÉ-0 fait l'affaire) et laisser les workflows s'exécuter.
2. Relever les **noms exacts** des checks produits.
3. Les déclarer en `required_status_checks` sur `main`, au minimum : le job bloquant Trivy CRITICAL, `npm-audit`, `dependency-review`, et — dès que `control-plane/` existe — `lint` et `test`.
4. Dès qu'un **second développeur** rejoint le projet : passer `required_approving_review_count` à `1` et `require_code_owner_reviews` à `true`, puis mettre à jour `.github/CODEOWNERS` et `docs/RELEASE_POLICY.md`.

## Condition de levée

L'exception est levée lorsque `required_status_checks` sur `main` contient au moins les checks de sécurité bloquants et que ceux-ci ont été observés en état vert sur une PR réelle. Ce fichier est alors **supprimé**, pas laissé en place comme trace périmée.

## Acceptation

Acceptée par Brice, responsable final de la validation produit et sécurité (`docs/SECURITY_POLICY.md`, §Responsabilité). Exception **expirée** si la date de réexamen est dépassée sans reconduction explicite.

# Runbook — Rollback

> Ce runbook sera complété avec les commandes réelles quand EP-10.04 (déploiement control plane/worker/migrations sécurisées) sera livré — la procédure et les principes ci-dessous sont déjà normatifs.

## État actuel

Aucun mécanisme de déploiement de production n'existe encore (programme P10, backlog). Il n'y a donc rien à "rollback" aujourd'hui au sens infrastructure — mais la politique ci-dessous s'applique dès le premier déploiement réel et doit être respectée par la conception de chaque migration écrite dès maintenant, y compris en local.

## Principe fondateur : un chemin de rollback existe avant, pas après

Ne jamais déployer un changement dont le rollback n'a pas été pensé au moment de l'écrire. C'est une exigence de `docs/DEFINITION_OF_DONE.md` : "Les migrations SQL sont versionnées, réversibles ou accompagnées d'une procédure de rollback explicite." Un rollback improvisé sous pression, en pleine incident, est le moment le plus dangereux pour KOFRA — le système gère des secrets de tiers, une erreur de rollback (perte de données, réapplication partielle) a un coût disproportionné.

## Deux catégories de rollback à ne jamais confondre

### 1. Rollback applicatif (code)

Revenir à la version précédente du binaire/du build déployé, sans toucher au schéma de base de données.

- Ne pose problème que si la version précédente du code est incompatible avec l'état de données déjà écrit par la nouvelle version (ex. nouvelle colonne déjà utilisée). D'où la règle : déployer les changements de schéma en avance et de façon rétrocompatible ("expand/contract"), jamais dans le même déploiement qu'un changement de code qui en dépend strictement.
- Procédure attendue : redéployer l'artefact du commit précédent connu-sain via le mécanisme choisi par EP-10.04 (à documenter ici une fois choisi).

### 2. Rollback de migration (base de données)

**Une migration déjà exécutée en production n'est pas toujours réversible sans perte.** `make migrate-down` existe pour l'usage local (voir `docs/RUNBOOKS/local-development.md`), mais son équivalent en production doit être traité avec une prudence bien supérieure :

- Une migration qui a supprimé une colonne, tronqué une table, ou transformé des données de façon non bijective ne peut pas être "annulée" par un simple `down` — les données perdues entre les deux exécutions ne reviennent pas.
- `docs/DEFINITION_OF_DONE.md` exige que toute migration soit "réversible, ou accompagnée d'une procédure de rollback explicite" — cette seconde option (procédure explicite, pas un simple `down` automatique) est la norme pour toute migration destructive sur les tables sensibles listées au design V1 §4.3 (`vault_key_envelopes`, `vault_data_keys`, `secrets`, `proof_events`).
- `proof_events` est append-only et hash-chained (CLAUDE.md §4) : une migration touchant cette table ne peut structurellement jamais être un rollback destructif — toute correction s'y fait par un nouvel événement, jamais par une suppression ou une réécriture.

## Procédure attendue (squelette, à instancier avec les commandes réelles)

1. Détecter l'anomalie justifiant le rollback (alerte, métrique, remontée manuelle — EP-10.07 pour l'outillage complet).
2. Déterminer si le déploiement inclut une migration de schéma. Si oui, consulter la procédure de rollback explicite documentée pour cette migration (écrite au moment de la migration, pas improvisée ici).
3. Si aucune migration destructive n'est en jeu : rollback applicatif simple, redéployer le commit précédent connu-sain.
4. Si une migration destructive est en jeu : ne jamais exécuter un `down` automatique en production sans avoir vérifié qu'aucune perte de données non anticipée n'en résulte — privilégier une restauration ciblée (`docs/RUNBOOKS/restore-database.md`) si le doute persiste.
5. Vérifier la santé du service après rollback.
6. Documenter l'incident et le rollback (cause, actions, durée) — entrée dans le post-mortem si l'incident relève de `docs/RUNBOOKS/security-incident.md`.

## Références

- `docs/DEFINITION_OF_DONE.md` — exigence de réversibilité des migrations.
- `docs/execution/kofra-v1-backlog.yaml` — EP-10.04.
- `docs/RUNBOOKS/deploy.md`, `docs/RUNBOOKS/restore-database.md`.
- CLAUDE.md §4 — `internal/proof` append-only, aucune mutation ni suppression d'un événement existant.

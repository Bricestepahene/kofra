# Runbook — Déploiement en production

> Ce runbook sera complété avec les commandes réelles quand EP-10.04 (déploiement control plane/worker/migrations) et EP-10.05 (déploiement web/API gateway/TLS) seront livrés — la procédure et les principes ci-dessous sont déjà normatifs.

## État actuel

Aucune infrastructure de production n'existe (`docs/execution/kofra-v1-backlog.yaml`, programme P10, tout à faire). Le fournisseur d'hébergement n'est pas choisi : EP-10.01 (ADR de déploiement) est un préalable bloquant à toute commande d'infrastructure réelle (design V1 §8). Il n'y a donc, aujourd'hui, ni environnement à déployer ni commande de déploiement à documenter — inventer l'un ou l'autre créerait une fausse confiance dangereuse pour un système qui gère des secrets de tiers.

## Principes normatifs (applicables dès maintenant, quel que soit le fournisseur retenu)

1. **Jamais de déploiement sans CI verte.** Tous les workflows du composant concerné (`control-plane.yml`, `web.yml`, `extension.yml`) et `security.yml` doivent être verts. Un CRITICAL exploitable bloque immédiatement (CLAUDE.md §5) — aucune dérogation manuelle en production.
2. **Jamais de migration sans test préalable sur base non vide.** Toute migration `golang-migrate` déployée en production doit d'abord avoir été exercée sur un jeu de données représentatif (pas une base vide), conformément à `docs/DEFINITION_OF_DONE.md` ("migrations SQL versionnées, réversibles ou accompagnées d'une procédure de rollback explicite"). Voir `docs/RUNBOOKS/rollback.md` pour la politique de réversibilité.
3. **Definition of Done complète avant tout déploiement** (`docs/DEFINITION_OF_DONE.md`) : pour les modules vault/recovery/policy/proof/identity/extension, revue sécurité humaine obligatoire et vecteurs cryptographiques exécutés en plus du socle commun.
4. **Aucun accès réseau direct entre l'infra KOFRA et l'infra SynkriaOps** (critère d'acceptation EP-10.02) — l'isolation est un invariant du design, pas une option de configuration.
5. **Toute mutation métier avec effet asynchrone insère son job River dans la même transaction PostgreSQL** (ADR 0002) — un déploiement ne doit jamais introduire de fenêtre où ce n'est plus vrai.
6. **Un chemin de rollback documenté existe avant chaque déploiement**, pas après un incident. Voir `docs/RUNBOOKS/rollback.md`.
7. **TLS strict dès l'exposition publique** (critère d'acceptation EP-10.05) : TLS 1.2+ uniquement, aucune redirection HTTP non sécurisée persistante.
8. **Zero-knowledge préservé par le déploiement lui-même** : aucune configuration de déploiement (variables d'environnement, logs de plateforme, outils de support du fournisseur) ne doit exposer un secret, une clé privée ou un ciphertext en clair.

## Procédure attendue (squelette, à instancier avec les commandes réelles)

1. Vérifier que la CI du commit à déployer est verte sur tous les workflows concernés.
2. Vérifier que `docs/DEFINITION_OF_DONE.md` est coché pour chaque changement inclus dans ce déploiement.
3. Si le déploiement inclut une migration : confirmer qu'elle a été testée sur une base non vide (référence `docs/RUNBOOKS/restore-database.md` pour la procédure de test sur copie de données).
4. Déclencher le déploiement via le mécanisme choisi par EP-10.04/10.05 (à documenter ici une fois choisi — pipeline CI/CD, commande d'infrastructure-as-code, etc.).
5. Vérifier la santé du service déployé (health checks, métriques de base — EP-10.07 pour l'observabilité complète).
6. Documenter le déploiement (commit, heure, périmètre) dans le canal de suivi retenu par l'équipe.
7. En cas d'anomalie détectée post-déploiement : exécuter `docs/RUNBOOKS/rollback.md` sans attendre une confirmation supplémentaire au-delà du seuil défini par l'astreinte.

## Références

- `docs/execution/kofra-v1-backlog.yaml` — EP-10.01 à EP-10.10 (programme P10, infrastructure de production).
- `docs/DEFINITION_OF_DONE.md` — checklist complète de "terminé".
- `docs/superpowers/specs/2026-08-20-kofra-v1-design.md` §8 — critères non négociables du choix de fournisseur.
- `docs/RUNBOOKS/rollback.md`, `docs/RUNBOOKS/restore-database.md`.

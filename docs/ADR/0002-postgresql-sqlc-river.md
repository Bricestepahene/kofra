# ADR 0002 — PostgreSQL, sqlc et River comme socle de persistance et de jobs

- **Statut** : accepté
- **Date** : 2026-08-20

## Contexte

KOFRA V1 a besoin d'une base transactionnelle et d'un mécanisme de jobs asynchrones (expiration de mandats, notifications, relances de rotation, vérification de la chaîne de preuve, alertes de sécurité). L'ajout d'un système distinct (ex. Redis + Bull, comme sur SynkriaOps) introduirait une dépendance d'infrastructure supplémentaire, un rayon de blast additionnel et un système de plus à sécuriser, sauvegarder et opérer.

## Décision

- **PostgreSQL** est l'unique source transactionnelle de KOFRA.
- **River** (queue de jobs Go, PostgreSQL-native) est l'unique mécanisme de jobs en V1. Redis est absent de KOFRA V1.
- **sqlc** génère du Go typé à partir de SQL explicite versionné (`control-plane/db/queries/`) — pas d'ORM.
- **golang-migrate** gère les migrations SQL, immuables et ordonnées.

Règle d'architecture : toute mutation métier qui exige une action asynchrone insère son job River dans la **même transaction PostgreSQL** que la mutation (un job n'est traité qu'après commit, et n'est jamais perdu si l'écriture métier réussit).

## Alternatives considérées

- **Redis + Bull** (cohérence avec SynkriaOps, throughput supérieur) — écarté pour V1 : la charge attendue ne justifie pas la dette opérationnelle d'un second système. Redis pourra être réintroduit face à un besoin réel mesuré (cache haute charge, rate limiting distribué à très haut débit, pub/sub temps réel massif, pression mesurée sur PostgreSQL) — jamais par anticipation.
- **ORM Go** (GORM, ent) — écarté : un produit manipulant des données sensibles (RLS, ciphertexts, enveloppes de clés) bénéficie du contrôle total qu'offre du SQL explicite et revu, plutôt que d'une couche d'abstraction qui peut masquer la requête réellement exécutée.

## Conséquences

- Un seul système à opérer, sauvegarder et restaurer en V1.
- Les jobs sont transactionnellement cohérents avec les mutations métier par construction.
- Réintroduire Redis plus tard est un changement d'infrastructure isolé (le code applicatif ne dépend pas directement de Redis), pas une réécriture.

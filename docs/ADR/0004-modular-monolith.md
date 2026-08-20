# ADR 0004 — Monolithe modulaire pour le control plane V1

- **Statut** : accepté
- **Date** : 2026-08-20

## Contexte

Le control plane V1 comprend plusieurs domaines (identité, coffre, accès, politique, preuve, notification, audit) qui doivent évoluer indépendamment sans imposer, dès le premier jour, la complexité opérationnelle d'un système distribué (déploiement, observabilité et débogage inter-services, cohérence transactionnelle entre services).

## Décision

Le control plane V1 est un **monolithe modulaire** : un unique binaire déployable (`cmd/kofra-api`) plus un worker de jobs (`cmd/kofra-worker`), organisés en modules de domaine strictement séparés sous `internal/` (`identity`, `vault`, `access`, `policy`, `proof`, `notification`, `audit`, `platform`). Chaque module communique via des interfaces internes explicites, pas par accès direct aux tables d'un autre domaine.

`policy` est un évaluateur pur et déterministe, délibérément séparé d'`access` (qui gère la délégation elle-même). `audit` (lecture/export de preuves) est délibérément séparé de `proof` (écriture de la chaîne d'événements) pour ne jamais mélanger le chemin d'écriture immuable et le chemin de lecture/export.

## Alternatives considérées

- **Microservices dès V1** — écarté : la charge et l'équipe ne justifient pas le coût opérationnel (déploiement, observabilité distribuée, cohérence transactionnelle entre services) ; un monolithe modulaire bien découpé peut être extrait en services plus tard si un domaine (ex. `proof`) justifie une isolation de scaling ou de sécurité propre.

## Conséquences

- Une seule transaction PostgreSQL peut couvrir une mutation métier + son événement de preuve + son job asynchrone (cf. ADR 0002), ce qui serait beaucoup plus coûteux à garantir entre plusieurs services.
- La discipline de séparation des modules (pas d'accès direct inter-domaine aux tables) est ce qui rend une extraction future en service indépendant possible sans réécriture complète — elle doit être maintenue rigoureusement en revue de code.
- Un seul artefact à déployer et surveiller en V1.

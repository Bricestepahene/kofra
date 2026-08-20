# ADR 0001 — Go comme langage du control plane

- **Statut** : accepté
- **Date** : 2026-08-20

## Contexte

KOFRA construit une infrastructure de confiance destinée à fonctionner pendant dix à quinze ans, indépendamment des interfaces, intégrations et produits qui s'y connecteront. Le control plane (identité, organisations, politiques d'accès, mandats, journaux de preuve, intégrations, API) doit rester sobre, performant et maintenable sur cet horizon, plutôt qu'optimisé pour la vélocité initiale.

## Décision

Le noyau backend et les services de confiance de KOFRA (`control-plane/`) sont écrits en **Go**. Les interfaces clientes (application web, extension navigateur, futur portail mobile) restent en **TypeScript**.

## Alternatives considérées

- **TypeScript/NestJS partout** (cohérence avec SynkriaOps, vélocité immédiate, réutilisation d'outillage) — écarté : le zero-knowledge repose sur le chiffrement côté client, donc le langage backend n'apporte aucune garantie cryptographique supplémentaire ; mais un backend de sécurité critique bénéficie du typage strict, de la gestion explicite de la concurrence et de la sobriété d'exécution de Go, dans la ligne de produits de référence du secteur (HashiCorp Vault).

## Conséquences

- Deux écosystèmes de tooling à maintenir (Go + TypeScript) plutôt qu'un seul.
- L'intégration future avec SynkriaOps (Phase 2) passe par un contrat API explicite (OpenAPI, voir ADR 0006), pas par un partage de code natif.
- Le repository est polyglotte dès la structure initiale (`go.work` + pnpm workspaces), orchestré par un `Makefile` racine.

## Amendement du 2026-08-20 (LOT PRÉ-0)

La mention de `go.work` ci-dessus est **caduque**. KOFRA n'a qu'un seul module Go et n'en prévoit qu'un pour la V1 : [ADR 0013](0013-single-go-module-no-go-work.md) décide qu'**aucun `go.work` n'est créé**, la racine du module unique étant `control-plane/`. Le reste de la présente ADR — le choix de Go pour le control plane, TypeScript pour les interfaces, et le contrat API explicite comme frontière entre les deux — demeure inchangé.

Conformément à la convention du projet, cette ADR n'est pas réécrite : l'amendement est daté et la décision qui la corrige est référencée.

# ADR 0006 — Contrat API OpenAPI comme source de vérité

- **Statut** : accepté
- **Date** : 2026-08-20

## Contexte

Le control plane Go (`control-plane/`) et les interfaces clientes TypeScript (`web/`, `extension/`, futur mobile) sont deux écosystèmes distincts (ADR 0001). Sans contrat explicite, la dérive entre l'API réelle et ce que les clients TypeScript en attendent est un risque permanent — critique pour un produit qui manipule des enveloppes de clés et des mandats, où une désérialisation incorrecte a des conséquences de sécurité, pas seulement fonctionnelles.

## Décision

L'API publique du control plane est spécifiée dans **`control-plane/api/openapi/v1.yaml`**, source de vérité versionnée. Un client TypeScript est généré (codegen) à partir de ce contrat vers **`packages/kofra-contracts`**, validé par des schémas **Zod**. Aucun endpoint public n'est ajouté ou modifié sans mise à jour du contrat OpenAPI en amont.

## Alternatives considérées

- **Contrat implicite** (types TypeScript maintenus manuellement en miroir de l'API Go) — écarté : dérive garantie à moyen terme, sans détection automatisée.
- **gRPC/Protobuf** — écarté pour V1 : REST + OpenAPI reste plus adapté à un produit consommé aussi par des intégrateurs tiers futurs (Phase 4, SDK), avec un tooling de documentation et de test plus accessible ; rien n'empêche d'introduire gRPC en interne plus tard si un besoin de performance inter-services apparaît (cf. ADR 0004 sur l'extraction future de services).

## Conséquences

- Le contrat OpenAPI fait partie de la revue de code de tout changement d'API — pas un artefact généré après-coup.
- `kofra-contracts` devient la dépendance partagée entre `web` et `extension` pour tout ce qui touche à la forme des données API, garantissant qu'un changement de contrat casse la compilation TypeScript plutôt qu'un comportement silencieux en production.
- Ce contrat est aussi ce qui rendra possible, en Phase 2, l'exposition d'un SDK KOFRA pour SynkriaOps sans réécriture.

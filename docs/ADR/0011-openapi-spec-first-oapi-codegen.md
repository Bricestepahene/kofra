# ADR 0011 — OpenAPI spec-first avec `oapi-codegen`

- **Statut** : accepté
- **Date** : 2026-08-20
- **Décision de référence** : D8 (`docs/DECISIONS_NEEDED.md`)
- **Précise** : ADR 0006 (contrat OpenAPI comme source de vérité)

## Contexte

L'ADR 0006 fait de `control-plane/api/openapi/v1.yaml` la source de vérité de l'API et prévoit un client TypeScript généré vers `packages/kofra-contracts`. Elle emploie toutefois la formule « généré/maintenu dans `v1.yaml` », qui laisse ouverte la question la plus structurante : **dans quel sens circule l'information ?**

- **Spec-first** : on écrit le contrat, on en dérive le code.
- **Code-first** : on écrit les handlers, on en extrait le contrat.

Ce point détermine toute la couche API et la nature du test de contrat. Il devait être tranché avant le premier endpoint.

## Décision

KOFRA est **spec-first**. `control-plane/api/openapi/v1.yaml` est écrit et revu en premier ; **`oapi-codegen`** en dérive les interfaces et types Go côté serveur, ainsi que le client TypeScript de `packages/kofra-contracts`.

## Alternatives considérées

- **Code-first (annotations dans le code Go, spec extraite au build)** — écarté. En code-first, la spécification est un sous-produit : elle n'existe qu'après l'implémentation, donc elle ne peut pas être relue *avant* que le travail soit fait. Une rupture de contrat se découvre alors en aval, quand elle coûte le plus cher. Surtout, elle affaiblit précisément ce que l'ADR 0006 cherchait à obtenir : un artefact que le relecteur d'une PR examine comme un engagement, et non comme un fichier régénéré automatiquement dont personne ne lit le diff.

## Conséquences

- **Tout nouvel endpoint commence par une modification de `v1.yaml`.** Un handler sans entrée correspondante dans le contrat est un motif de rejet en revue.
- Le code généré (côté Go et côté `kofra-contracts`) est **commité**, et la CI vérifie sa fraîcheur : régénérer puis `git diff --exit-code`. Un généré périmé signifie que le contrat et l'implémentation ont divergé.
- Le client TypeScript de `kofra-contracts` est **généré, jamais écrit à la main** — c'est ce qui garantit qu'un changement de contrat casse la compilation TypeScript plutôt que de produire un comportement silencieusement faux à l'exécution (ADR 0006, « Conséquences »).
- Le test de contrat exigé par `docs/TESTING_STRATEGY.md` (niveau « Contrat API ») compare le comportement réel de l'API Go au schéma déclaré. Ce test doit être **démontré rouge** au moins une fois sur une divergence volontaire, sans quoi il ne prouve rien.
- La cible `api-codegen` du `Makefile` matérialise cette chaîne ; elle reste un stub documenté tant que `v1.yaml` n'existe pas (LOT 0).

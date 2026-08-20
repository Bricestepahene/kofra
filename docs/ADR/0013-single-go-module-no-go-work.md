# ADR 0013 — Module Go unique dans `control-plane/`, pas de `go.work`

- **Statut** : accepté
- **Date** : 2026-08-20
- **Décision de référence** : décision supplémentaire du LOT PRÉ-0 (`docs/DECISIONS_NEEDED.md`)

## Contexte

Le plan LOT 1 (`docs/superpowers/plans/2026-08-20-lot1-protocol-foundations.md`, Task 1) prévoyait la création d'un `go.work` à la racine en plus de `control-plane/go.mod`, et le design V1 §3 décrivait le dépôt comme utilisant « le système natif de Go (`go work`, `go build`, `go test`) ».

Or il n'existe **qu'un seul module Go** dans KOFRA, et un seul est prévu pour la V1 : `control-plane/`. Le monolithe modulaire d'ADR 0004 est un module unique découpé en paquets `internal/`, pas un ensemble de modules.

Un second point, distinct mais lié, devait être corrigé : plusieurs documents affirmaient que `control-plane/go.mod` « fige la version exacte » de Go. C'est inexact — la directive `go` d'un `go.mod` exprime une **version minimale**, pas un verrou.

## Décision

- **Un seul module Go**, racine `control-plane/`. **Aucun `go.work` n'est créé.**
- Le verrouillage de la toolchain Go est assuré **par la CI** (version exacte déclarée dans le workflow) et, lorsque la toolchain sera effectivement installée, par les mécanismes Go appropriés à cet effet — pas par la seule directive `go` de `go.mod`.
- Toute documentation affirmant un verrouillage local absolu via `go.mod` est corrigée.

## Alternatives considérées

- **Créer `go.work` malgré le module unique** — écarté pour deux raisons. D'abord il n'apporte rien : `go.work` sert à développer plusieurs modules ensemble. Ensuite il ajoute un risque réel de chaîne d'approvisionnement : un `go.work` (ou son `go.work.sum`) commité par mégarde avec une directive `replace` pointant vers un chemin local modifie silencieusement ce qui est compilé, sans que `go.mod` ni la revue de PR ne le montrent. Pour un produit qui manipule des secrets de tiers, une redirection invisible de dépendance est exactement la classe de risque que `docs/DEPENDENCY_POLICY.md` cherche à contenir.

## Conséquences

- Les commandes Go s'exécutent avec `control-plane/` comme répertoire de travail (`Makefile`, workflows CI).
- `go.work` et `go.work.sum` restent hors du dépôt.
- **Si un second module Go devait apparaître un jour**, l'introduction de `go.work` fera l'objet d'une nouvelle ADR — ce n'est pas une commodité d'outillage à ajouter au fil de l'eau.
- Les documents suivants ont été corrigés en conséquence : design V1 §3, plan LOT 1 (contraintes globales), `docs/RUNBOOKS/local-development.md`.

# KOFRA — Politique de gestion des dépendances

Ce document fixe comment KOFRA introduit, met à jour et surveille ses dépendances, sur les quatre écosystèmes présents dans le dépôt : modules Go, packages npm/pnpm, actions GitHub, images Docker. Il opérationnalise CLAUDE.md §5 et le design V1 §8 (Tooling, CI et sécurité), et est chapeauté par `docs/SECURITY_POLICY.md`.

## Les quatre écosystèmes

| Écosystème | Localisation | Gestionnaire |
|---|---|---|
| Modules Go | `control-plane/go.mod`, `go.sum` | `go mod` |
| Packages npm | `web/`, `extension/`, `packages/*` | `pnpm`, verrouillé par `pnpm-lock.yaml` |
| Actions GitHub | `.github/workflows/*.yml` | références d'action (SHA ou tag) |
| Images Docker | `infra/docker/*` (Dockerfiles multi-stage, `compose.dev.yml`) | tag **et digest** d'image de base |

Aucun de ces quatre écosystèmes n'est traité comme secondaire : une action GitHub compromise ou une image de base vulnérable a le même potentiel de dégât qu'une dépendance applicative directe.

## Surveillance automatisée

- **Dependabot** est actif sur les quatre écosystèmes (`.github/dependabot.yml`), pas seulement sur Go et npm. Il ouvre les PR de mise à jour et signale les avis de sécurité connus.
- **GitHub Dependency Review** est obligatoire sur chaque PR qui modifie une manifestation de dépendances (`go.sum`, `pnpm-lock.yaml`, un workflow, un Dockerfile). Une PR qui introduit une dépendance à vulnérabilité connue est bloquée avant même la revue humaine.
- Un **SBOM** (Software Bill of Materials, `syft` ou équivalent) est généré en CI à chaque build (design V1 §8, `security.yml`) — il couvre les quatre écosystèmes, pas seulement l'un d'eux, et sert de base à toute investigation ultérieure sur une dépendance devenue vulnérable après coup.

## Politique de sévérité

Reprise de CLAUDE.md §5, appliquée identiquement aux quatre écosystèmes. **Réserve importante, valable pour les trois niveaux ci-dessous** : « bloque la fusion » décrit la politique, pas encore l'état de la plateforme. `main` est bien protégée (push direct bloqué depuis le 2026-08-20), mais `required_status_checks` est vide : **aucun statut CI n'est requis pour fusionner**, donc le gate repose encore sur une vérification manuelle du relecteur ([`security-exceptions/2026-08-20-statuts-ci-non-requis.md`](security-exceptions/2026-08-20-statuts-ci-non-requis.md)).

- **CRITICAL exploitable** détecté par le scan de sécurité (gosec, govulncheck, Trivy, CodeQL, npm audit, ou l'équivalent Dependency Review) **bloque immédiatement la fusion**. Aucune exception.
- **HIGH** : soit corrigé (mise à jour, contournement du composant vulnérable), soit couvert par une **exception documentée, datée et révisable** dans `docs/security-exceptions/`. Un HIGH silencieux — ni corrigé ni documenté — bloque la fusion au même titre qu'un CRITICAL. À l'inverse, un HIGH sur un transitif sans correctif disponible ne doit pas être bloqué mécaniquement sans analyse : l'exception écrite est l'outil pour tracer ce jugement, pas un contournement du gate.
- **MEDIUM/LOW** : visibles dans le rapport CI, ne bloquent pas la fusion, mais alimentent la cadence de mise à jour non-sécurité ci-dessous plutôt que d'être ignorés indéfiniment.

## Ajouter une nouvelle dépendance

Toute nouvelle dépendance — sur n'importe lequel des quatre écosystèmes — exige une justification explicite dans la PR qui l'introduit : pourquoi cette dépendance, pourquoi pas une alternative déjà en usage, quelle est sa surface de maintenance (dernière release, nombre de mainteneurs, historique de vulnérabilités).

Règle renforcée pour tout ce qui touche à la cryptographie ou à l'identité : **préférence stricte pour les bibliothèques auditées déjà en usage** dans le dépôt plutôt que pour une nouvelle bibliothèque non vérifiée. Concrètement, `@noble/curves` (X25519/Ed25519) et `hash-wasm` (Argon2id) sont les bibliothèques de référence de `packages/kofra-crypto` (cf. `docs/superpowers/plans/2026-08-20-lot1-protocol-foundations.md`) : une nouvelle primitive cryptographique doit d'abord chercher sa place dans ces bibliothèques déjà auditées et déjà testées par vecteurs de test connus, avant d'envisager une dépendance supplémentaire. Introduire une bibliothèque crypto alternative sans revue de sécurité indépendante est un motif de rejet en revue (cf. `docs/SECURITY_POLICY.md`, « Validation d'un changement cryptographique »).

Pour les dépendances non-cryptographiques, la barre est plus basse mais pas absente : une dépendance qui duplique une capacité déjà couverte par une dépendance existante (ex. une deuxième bibliothèque de validation de schéma alors que Zod est déjà le standard `kofra-contracts`, ADR 0006) doit être justifiée par un besoin réel, pas par préférence personnelle.

## Cadence de mise à jour non-sécurité

En dehors des correctifs de sécurité (traités immédiatement selon la politique de sévérité ci-dessus), les mises à jour de dépendances non-sécurité suivent une cadence régulière plutôt qu'ad hoc :

- **Go** : revue mensuelle des PR Dependabot ouvertes, fusion groupée après vérification que `go test ./...` et `make lint` restent verts.
- **npm/pnpm** : revue mensuelle également, avec attention particulière à `web/` (Next.js verrouillé, mise à jour trimestrielle ou semestrielle décidée séparément, cf. design V1 §2) et aux packages crypto (`kofra-crypto`, `kofra-protocol`) où une mise à jour de `@noble/curves` ou `hash-wasm` déclenche systématiquement une exécution complète de `make test-crypto` avant fusion, jamais une confiance aveugle au changelog amont.
- **Actions GitHub et images Docker de base** : revue mensuelle, avec préférence pour l'épinglage par SHA plutôt que par tag mobile sur les actions tierces critiques (celles qui s'exécutent avec des permissions élevées).

## Versions épinglées à ne pas laisser dériver

Un tag mobile fait changer une dépendance sans qu'aucun commit ne le trace. Trois épinglages sont traités comme des décisions, pas comme des détails de configuration :

- **PostgreSQL `16.9`**, épinglé par **tag et digest** (ADR 0009). Une montée de version **majeure** exige une ADR ; une version mineure suit la cadence ordinaire ci-dessus.
- **Go `1.23.4`** — verrouillé par la CI, la directive `go` de `go.mod` n'étant qu'une version minimale (ADR 0013).
- **`golangci-lint` et son ruleset**, par version exacte : **`latest` est proscrit** (D14, `docs/DECISIONS_NEEDED.md`). Un linter qui change de règles entre deux exécutions peut faire passer au vert un code qu'il refusait la veille, y compris sur une règle de sécurité — c'est la dérive silencieuse que l'épinglage de Go visait déjà à éviter.

Une mise à jour non-sécurité qui casse un test n'est jamais fusionnée « pour rattraper plus tard » — elle reste en PR ouverte jusqu'à résolution ou abandon documenté.

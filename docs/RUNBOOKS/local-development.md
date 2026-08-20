# Runbook — Environnement de développement local

Guide pas-à-pas pour lancer KOFRA en local. Toutes les commandes ci-dessous sont vérifiées contre le `Makefile` racine du dépôt à la date de rédaction (2026-08-20) — ne pas en inventer une qui n'y figure pas (`CLAUDE.md` §3).

## État actuel du dépôt (important)

À ce stade du projet, `control-plane/`, `web/` et `infra/docker/` **n'existent pas encore** dans le dépôt (EP-02.02, EP-02.03, EP-02.04 du backlog ne sont pas terminés). Concrètement aujourd'hui :

- `pnpm install` et le lint sur `packages/kofra-ui` fonctionnent.
- `make dev-api`, `make dev-web`, `make docker-up` échoueront (répertoire cible absent) jusqu'à ce que ces epics soient livrés.
- `make dev` affiche volontairement un message d'attente plutôt que d'échouer silencieusement — ne pas le remplacer par une fausse implémentation.

Ce runbook documente la procédure cible, valide dès que les répertoires existeront. Revenir le vérifier après chaque LOT touchant EP-02.02/03/04.

## 1. Prérequis

1. Go `1.23.4` (version exacte figée par `control-plane/go.mod` une fois créé — CLAUDE.md §2). Vérifier : `go version`.
2. Node.js `>= 20` (`package.json` → `engines.node`). Vérifier : `node -v`.
3. pnpm `9.15.0` exact (`package.json` → `packageManager`). Installer via corepack : `corepack enable && corepack prepare pnpm@9.15.0 --activate`.
4. Docker + Docker Compose v2 (pour PostgreSQL local une fois `infra/docker/compose.dev.yml` livré par EP-02.04).
5. `golangci-lint` et `gofumpt` installés localement pour `make lint` (une fois `control-plane/` livré).

## 2. Premier lancement

1. Cloner le dépôt, se placer à la racine.
2. Copier l'environnement : `cp .env.example .env`, ne jamais committer `.env`.
3. Installer les dépendances TypeScript du monorepo : `pnpm install` (fonctionne dès maintenant).
4. Démarrer PostgreSQL local : `make docker-up` (nécessite `infra/docker/compose.dev.yml`, EP-02.04).
5. Appliquer les migrations : `make migrate-up` (nécessite `control-plane/db/migrations`, EP-03.01 et suivants).
6. Générer le code : `make sqlc-generate` puis `make api-codegen` une fois `control-plane/api/openapi/v1.yaml` livré (`api-codegen` reste un stub en attendant, cf. Makefile).
7. Lancer l'ensemble : `make dev` (api + worker + web en parallèle), ou séparément `make dev-api` et `make dev-web` dans deux terminaux.
8. Arrêter proprement : `make docker-down`.

## 3. Lancer les tests

1. Suite complète : `make test` (`go test ./...` + Vitest sur `packages/*`, `web/`, `extension/`).
2. Vecteurs crypto uniquement (jamais de crypto non testée par vecteur, CLAUDE.md §0) : `make test-crypto`.
3. Avant toute PR touchant au protocole cryptographique, exécuter `make test-crypto` en isolation et vérifier qu'aucun vecteur connu (RFC 7748, RFC 8032) n'échoue.

## 4. Lancer le linter

1. `make lint` — exécute `golangci-lint run ./...` + `gofumpt -l .` côté Go, puis `pnpm -r lint` côté TypeScript.
2. Un `gofumpt -l .` non vide signale un fichier mal formaté : corriger avec `gofumpt -w <fichier>`, ne jamais désactiver la règle.

## 5. Pièges connus

`CLAUDE.md` §6 est explicitement vide à ce jour ("section à enrichir au fil de l'implémentation — ne pas préremplir avec des pièges hypothétiques"). Ce runbook sera mis à jour avec les pièges réels dès qu'ils seront rencontrés et documentés dans `CLAUDE.md` §6 — ne pas anticiper de piège qui n'a pas été vécu.

## 6. Références

- `Makefile` (racine) — liste faisant foi des cibles disponibles.
- `docs/execution/kofra-v1-backlog.yaml` — EP-02.02, EP-02.03, EP-02.04 pour l'état d'avancement du socle local.
- `docs/superpowers/specs/2026-08-20-kofra-v1-design.md` §3 (structure du dépôt) et §8 (tooling).

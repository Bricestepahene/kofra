.PHONY: dev dev-api dev-web build test test-crypto lint \
	migrate migrate-generate migrate-up migrate-down migrate-river migrate-verify \
	sqlc-generate api-codegen docker-up docker-down

# Cibles orchestrant le monorepo polyglotte (control-plane Go + web/extension/packages TypeScript).
# Implémentées progressivement au fil des lots — voir docs/superpowers/specs/2026-08-20-kofra-v1-design.md.
# Ne pas supposer qu'une cible fonctionne avant que le code qu'elle référence existe.
#
# Module Go unique, racine control-plane/ — pas de go.work (ADR 0013).
# Les versions d'outillage sont épinglées explicitement : un outil de qualité ou de
# sécurité à version flottante peut changer de verdict d'un jour à l'autre (D14).

GOLANGCI_LINT_VERSION ?= v1.62.2
GOFUMPT_VERSION       ?= v0.7.0

dev:
	@echo "make dev: nécessite control-plane/cmd/kofra-api, cmd/kofra-worker et web/ — pas encore implémentés"

dev-api:
	cd control-plane && go run ./cmd/kofra-api

dev-web:
	cd web && pnpm dev

build:
	cd control-plane && go build ./...
	cd web && pnpm build

test:
	cd control-plane && go test -race -shuffle=on ./...
	pnpm -r --filter='./packages/*' --filter='./web' --filter='./extension' test

test-crypto:
	pnpm --filter ./packages/kofra-crypto test

lint:
	cd control-plane && go vet ./... \
		&& go run github.com/golangci/golangci-lint/cmd/golangci-lint@$(GOLANGCI_LINT_VERSION) run ./... \
		&& go run mvdan.cc/gofumpt@$(GOFUMPT_VERSION) -l .
	pnpm -r lint

# --------------------------------------------------------------------------
# Migrations — ADR 0010.
#
# `make migrate` est le POINT D'ENTRÉE OPÉRATIONNEL UNIQUE. Il exécute une
# séquence figée et non négociable :
#
#     1. migrations applicatives  (golang-migrate)
#     2. migrations River         (mécanisme natif de River)
#     3. vérification             (les deux jeux sont à jour)
#
# River possède ses propres migrations : son DDL interne n'est JAMAIS recopié
# dans control-plane/db/migrations/. Recopier reviendrait à forker
# silencieusement la bibliothèque, et à diverger de son schéma attendu à la
# première montée de version.
#
# Les migrations s'exécutent sous kofra_migrator (ADR 0009), jamais sous
# kofra_app — d'où MIGRATE_DATABASE_URL, distinct de DATABASE_URL.
# --------------------------------------------------------------------------
migrate:
	@echo "make migrate : séquence applicatif -> River -> vérification (ADR 0010)."
	@echo "Nécessite control-plane/ et le binaire de migration River — pas encore implémentés (LOT 0)."

migrate-river:
	@echo "make migrate-river : migrations internes de River, via son mécanisme natif."
	@echo "Pas encore implémenté (LOT 0). Ne jamais recopier ce DDL dans golang-migrate."

migrate-verify:
	@echo "make migrate-verify : vérifie que migrations applicatives ET River sont à jour."
	@echo "Alimente la readiness de l'API (D7). Pas encore implémenté (LOT 0)."

migrate-generate:
	cd control-plane && go run github.com/golang-migrate/migrate/v4/cmd/migrate create -ext sql -dir db/migrations -seq $(NAME)

# migrate-up / migrate-down ne couvrent QUE les migrations applicatives.
# Pour une application complète, utiliser `make migrate`.
migrate-up:
	cd control-plane && go run github.com/golang-migrate/migrate/v4/cmd/migrate -path db/migrations -database $(MIGRATE_DATABASE_URL) up

migrate-down:
	cd control-plane && go run github.com/golang-migrate/migrate/v4/cmd/migrate -path db/migrations -database $(MIGRATE_DATABASE_URL) down 1

# sqlc est DIFFÉRÉ au Lot A (décision D6, docs/DECISIONS_NEEDED.md) : il sera
# introduit quand une première table multi-tenant et une requête métier réelle
# existeront. Le LOT 0 ne crée aucune table artificielle pour l'alimenter.
sqlc-generate:
	@echo "make sqlc-generate : sqlc est différé au Lot A (D6) — aucune table métier n'existe encore."
	@echo "Voir docs/DECISIONS_NEEDED.md. Ne pas créer de table jetable pour faire tourner la génération."

# Chaîne spec-first (ADR 0011) : v1.yaml est la source de vérité, oapi-codegen
# en dérive les types Go et le client TypeScript de packages/kofra-contracts.
api-codegen:
	@echo "make api-codegen : oapi-codegen depuis control-plane/api/openapi/v1.yaml (spec-first, ADR 0011)."
	@echo "Pas encore implémenté (LOT 0) — v1.yaml n'existe pas."

# PostgreSQL 16.9, épinglé par tag ET digest dans compose.dev.yml (ADR 0009).
docker-up:
	docker compose -f infra/docker/compose.dev.yml up -d

docker-down:
	docker compose -f infra/docker/compose.dev.yml down

.PHONY: dev dev-api dev-web build test test-crypto lint migrate-generate migrate-up migrate-down sqlc-generate api-codegen docker-up docker-down

# Cibles orchestrant le monorepo polyglotte (control-plane Go + web/extension/packages TypeScript).
# Implémentées progressivement au fil des lots — voir docs/superpowers/specs/2026-08-20-kofra-v1-design.md.
# Ne pas supposer qu'une cible fonctionne avant que le code qu'elle référence existe.

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
	cd control-plane && go test ./...
	pnpm -r --filter='./packages/*' --filter='./web' --filter='./extension' test

test-crypto:
	pnpm --filter ./packages/kofra-crypto test

lint:
	cd control-plane && golangci-lint run ./... && gofumpt -l .
	pnpm -r lint

migrate-generate:
	cd control-plane && go run github.com/golang-migrate/migrate/v4/cmd/migrate create -ext sql -dir db/migrations -seq $(NAME)

migrate-up:
	cd control-plane && go run github.com/golang-migrate/migrate/v4/cmd/migrate -path db/migrations -database $(DATABASE_URL) up

migrate-down:
	cd control-plane && go run github.com/golang-migrate/migrate/v4/cmd/migrate -path db/migrations -database $(DATABASE_URL) down 1

sqlc-generate:
	cd control-plane && sqlc generate

api-codegen:
	@echo "OpenAPI (control-plane/api/openapi/v1.yaml) -> packages/kofra-contracts — pas encore implémenté"

docker-up:
	docker compose -f infra/docker/compose.dev.yml up -d

docker-down:
	docker compose -f infra/docker/compose.dev.yml down

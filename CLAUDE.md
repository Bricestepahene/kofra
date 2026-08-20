# KOFRA — Contexte projet pour Claude Code

## 0. Directive suprême

KOFRA gère des secrets appartenant à des tiers (cabinets d'expertise comptable et leurs clients). La barre de sécurité est celle des systèmes les plus critiques qui existent — gestion de secrets, infrastructure de confiance — et elle **ne baisse jamais** : aucun compromis n'est acceptable pour aller plus vite ou préserver une commodité.

Avant tout LOT (feature, refactor, migration), relire la demande avec une lentille sécurité/cryptographie senior. Si la spec présente un angle mort sur la confidentialité, l'intégrité, la révocation, la preuve, la migration de protocole ou la conformité, **ne pas implémenter mécaniquement** : arrêter, signaler le risque à Brice, proposer un LOT-bis.

Toute question qui touche au protocole cryptographique (formats de ciphertext, hiérarchie de clés, algorithmes, chaîne de preuve) doit être tranchée par référence à `docs/superpowers/specs/2026-08-20-kofra-v1-design.md` et aux ADR (`docs/ADR/`), jamais improvisée en cours d'implémentation. Si le besoin ne rentre pas dans ce qui est déjà spécifié, c'est un signal d'arrêt — pas une invitation à inventer une extension du protocole.

## 1. Produit et positionnement

- **Vision** (`docs/MANIFESTO.md`) : KOFRA construit l'infrastructure de confiance numérique de l'Afrique. Ce n'est pas un gestionnaire de mots de passe — c'est une couche de confiance (secrets, mandats, preuve, identité, signature) dont le coffre-fort n'est que le premier point d'entrée.
- **Trajectoire** (`docs/VISION.md`) : Phase 1 (coffre-fort des cabinets, en cours) → Phase 2 (identité opérationnelle, API SynkriaOps) → Phase 3 (preuve et signature) → Phase 4 (Trust Layer africain).
- **Point d'entrée commercial** : cabinets d'expertise comptable de la CEMAC — multiplicité de clients, accès sensibles, équipes variables, responsabilité professionnelle.
- **Design V1 figé** : `docs/superpowers/specs/2026-08-20-kofra-v1-design.md`. Toute décision structurante y est référencée ou fait l'objet d'un nouvel ADR.
- Rôles : **Brice = fondateur / validateur produit et sécurité** ; **Claude Code = développeur principal**.

## 2. Stack figée

Ne jamais changer sans nouvel ADR (`docs/ADR/`).

| Couche | Stack |
|---|---|
| Control plane | Go `1.23.x` (version exacte dans `go.mod`), monolithe modulaire (`control-plane/`) |
| Accès données | `sqlc` (SQL explicite versionné → Go typé), pas d'ORM |
| Migrations | `golang-migrate` |
| DB | PostgreSQL, source transactionnelle unique |
| Queue de jobs | River (PostgreSQL-native). Pas de Redis en V1 (ADR 0002) |
| Auth serveur | Sessions/appareils gérés par `internal/identity`, MFA TOTP en V1, fondations WebAuthn/passkeys posées |
| Crypto | Côté client exclusivement — Web Crypto API, wrapper unique `packages/kofra-crypto`, jamais de primitive réimplémentée |
| Web | Next.js `15.x` verrouillé dans `pnpm-lock.yaml`, TypeScript strict |
| Extension | WebExtension Manifest V3, TypeScript strict (`extension/`) |
| Contrat API | OpenAPI v1 (`control-plane/api/openapi/v1.yaml`) → codegen vers `packages/kofra-contracts` (Zod) |
| CI | GitHub Actions par composant + `security.yml` (gosec, govulncheck, Trivy, CodeQL, npm audit, Dependabot, Dependency Review, SBOM) |
| Infra | Docker multi-stage non-root, infra isolée de SynkriaOps, fournisseur choisi par ADR de déploiement avant prod |

## 3. Commandes de base

Le repo est polyglotte : Go natif pour `control-plane/`, pnpm workspaces pour `web/`, `extension/`, `packages/*`. Un `Makefile` racine orchestre les deux mondes.

```bash
# Développement
make dev              # api + worker + web en parallèle
make dev-api          # control-plane/cmd/kofra-api uniquement
make dev-web          # web/ uniquement

# Build
make build

# Tests
make test             # go test ./... + vitest
make test-crypto      # vecteurs de test kofra-crypto — jamais de crypto non testée par vecteur

# Lint
make lint             # golangci-lint + gofumpt + eslint

# Migrations
make migrate-generate NAME=...
make migrate-up
make migrate-down

# Codegen
make sqlc-generate    # SQL -> Go typé
make api-codegen      # OpenAPI -> kofra-contracts

# Docker
make docker-up / make docker-down
```

Ces cibles seront implémentées au fil des lots — ne pas supposer qu'une cible existe avant de l'avoir vue dans le `Makefile` du repo.

## 4. Invariants non négociables

Ces règles sont extraites de `docs/superpowers/specs/2026-08-20-kofra-v1-design.md` — en cas de doute, la spec fait foi, ce CLAUDE.md n'en est qu'un résumé opérationnel.

### Zero-knowledge

- Le control plane Go ne stocke **jamais** un secret en clair, une clé privée en clair, ni un mot de passe. Toute donnée sensible qui transite côté serveur doit être un ciphertext, une enveloppe de clé, ou une métadonnée non sensible.
- Aucun secret ni clé privée dans les logs, les messages d'erreur, les traces d'observabilité ou les outils de support.
- Toute primitive cryptographique vient d'une bibliothèque standard éprouvée (Web Crypto API côté client). Ne jamais écrire de code cryptographique "maison".

### Hiérarchie de clés

- Les clés X25519/Ed25519 utilisateur sont **générées aléatoirement côté client**, jamais dérivées déterministiquement du mot de passe (ADR 0003).
- Hiérarchie à trois niveaux : Vault Key → Data Encryption Key (par secret) → ciphertext. Ne jamais faire chiffrer directement un secret par la Vault Key.
- Le partage d'un coffre ajoute une enveloppe, il ne rechiffre jamais les secrets existants.

### Révocation

- Ne jamais présenter une "révocation" comme complète si elle n'est que logique. Respecter la distinction à trois niveaux (logique / renforcée / critique — spec V1 §4.4) dans le code, les messages utilisateur et la documentation.

### Preuve

- `internal/proof` est append-only et hash-chained. Aucune mutation ni suppression d'un événement existant, jamais.
- `internal/audit` (lecture/export) ne doit jamais écrire dans la chaîne de preuve — la séparation d'écriture/lecture est structurelle, pas une convention.

### Queue

- Tout job River déclenché par une mutation métier est inséré **dans la même transaction PostgreSQL** que cette mutation (ADR 0002). Un job orphelin (inséré hors transaction, ou après coup) est un bug.

### Extension

- Le remplissage de champ est local, sous mandat valide, à l'initiative explicite de l'utilisateur. Jamais d'affichage, d'export ou de copie du secret par défaut. Jamais de contournement d'OTP, de CAPTCHA ou d'authentification tierce (ADR 0005).
- La session de l'extension est éphémère (service worker Manifest V3 non persistant) — ne jamais concevoir une fonctionnalité qui suppose un état mémoire durable en arrière-plan.

## 5. Sécurité CI

- **CRITICAL exploitable** détecté par le scan de sécurité bloque immédiatement la fusion.
- **HIGH** : corriger, ou documenter une exception datée et révisable dans `docs/security-exceptions/`. Ne jamais bloquer mécaniquement sans discernement sur un transitif sans correctif disponible, mais ne jamais fusionner un HIGH silencieux sans exception écrite non plus.
- Dependabot et GitHub Dependency Review actifs sur chaque PR. SBOM généré en CI.

## 6. Pièges connus

_Section à enrichir au fil de l'implémentation — ne pas préremplir avec des pièges hypothétiques._

## 7. Processus

- Toute nouvelle fonctionnalité touchant au protocole cryptographique, au modèle d'autorisation ou à la chaîne de preuve passe par le cycle `superpowers:brainstorming` → spec → ADR si structurant → `superpowers:writing-plans`, avant tout code.
- Les Phases 2 à 4 du manifeste (`docs/VISION.md`) ne sont pas conçues en détail tant que la Phase 1 n'a pas de socle implémenté et testé.

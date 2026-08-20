# KOFRA V1 — Design d'architecture (Phase 1 : le coffre-fort des cabinets)

- **Date** : 2026-08-20
- **Statut** : validé, prêt pour `writing-plans`
- **Périmètre** : fondations complètes de la Phase 1 du manifeste (`docs/MANIFESTO.md`). Les Phases 2-4 (`docs/VISION.md`) sont hors périmètre de ce document.

## 1. Contexte et objectif

KOFRA V1 doit permettre à un cabinet d'expertise comptable de la CEMAC de stocker les secrets numériques de ses clients (identifiants de portails fiscaux, sociaux, bancaires, clés API, documents sensibles), de déléguer leur usage à des collaborateurs par mandat plutôt que par partage de mot de passe, et de produire une preuve infalsifiable de chaque action, sans que KOFRA (l'opérateur) puisse jamais lire le contenu en clair de ces secrets.

Ce document fige les décisions structurantes. Il ne découpe pas l'implémentation en lots — c'est le rôle du plan produit par `writing-plans` à partir de ce document.

## 2. Décisions fondatrices

| Décision | Choix | Ne pas changer sans |
|---|---|---|
| Langage du control plane | Go `1.23.4`, **module unique** `control-plane/`, pas de `go.work` (ADR 0013). La directive `go` de `go.mod` est une version **minimale**, pas un verrou : la toolchain est verrouillée en CI | ADR |
| Interfaces clientes | TypeScript strict (web, extension, futur mobile) | ADR |
| Base transactionnelle | PostgreSQL **16.9**, épinglé par tag et digest, source de vérité unique (ADR 0009) | ADR |
| Driver PostgreSQL | `pgx/v5` natif, pas `database/sql` (ADR 0008) | ADR |
| Rôles de base de données | `kofra_owner` (init infra), `kofra_migrator` (DDL), `kofra_app` (runtime, jamais superutilisateur ni `BYPASSRLS`) — ADR 0009 | ADR |
| Queue de jobs | River (PostgreSQL-native), pas de Redis en V1 | Preuve d'un besoin réel : cache haute charge, rate limiting distribué à très haut débit, pub/sub temps réel massif, ou pression mesurée sur PostgreSQL |
| Accès SQL | `sqlc` (SQL explicite → Go typé), pas d'ORM. **Introduction différée au Lot A**, quand une première table multi-tenant et une requête métier réelle existeront (D6) | ADR |
| Migrations | `golang-migrate` pour l'applicatif ; **River gère les siennes** (ADR 0010). Séquence unique : applicatif → River → vérification | ADR |
| Observabilité | `log/slog` JSON + fondation OpenTelemetry, **aucun exporteur SaaS distant** (ADR 0012) | ADR |
| Chiffrement | Côté client exclusivement (Web Crypto API), zero-knowledge serveur | Revue de sécurité indépendante |
| Web | Next.js `15.x`, verrouillé dans `pnpm-lock.yaml`, mise à jour trimestrielle ou semestrielle | — |
| Extension | WebExtension Manifest V3, TypeScript strict | ADR |
| Contrat API | OpenAPI v1 versionné, **spec-first** via `oapi-codegen` → types Go + client TS `kofra-contracts` (ADR 0011) | ADR |
| Hébergement | Infra isolée de SynkriaOps dès le départ ; fournisseur choisi via un ADR de déploiement avant mise en production | ADR de déploiement (pas figé ici) |
| Organisation GitHub | Dépôt **public** `kofra` sous le compte personnel `Bricestepahene` (depuis le 2026-08-20). Protection de `main` active, secret scanning et push protection activés ; statuts CI pas encore requis — voir `docs/security-exceptions/` | — |
| Licence | **BUSL-1.1**, bascule automatique en MPL-2.0 le 2030-08-20 (D15). Code auditable publiquement, offre commerciale concurrente non accordée | — |

Les lignes portant une référence `ADR 0008` à `ADR 0013` ont été ajoutées ou précisées lors du **LOT PRÉ-0** (2026-08-20), qui a tranché quinze décisions restées ouvertes après la rédaction initiale de ce document. Le registre complet, y compris les sujets encore ouverts, est dans [`docs/DECISIONS_NEEDED.md`](../../DECISIONS_NEEDED.md).

## 3. Structure du dépôt

```text
kofra/
├── Makefile
├── README.md
├── CLAUDE.md
├── .gitignore
├── .editorconfig
├── .env.example
├── .github/
│   └── workflows/
│       ├── control-plane.yml
│       ├── web.yml
│       ├── extension.yml
│       ├── security.yml
│       └── release.yml
│
├── control-plane/
│   ├── cmd/
│   │   ├── kofra-api/                 # API REST publique
│   │   └── kofra-worker/              # Jobs River : alertes, expirations, preuve
│   ├── internal/
│   │   ├── identity/                   # Org, utilisateurs, MFA, appareils
│   │   ├── vault/                      # Métadonnées et ciphertexts, jamais secrets clairs
│   │   ├── access/                     # Mandats, délégation, règles d'accès
│   │   ├── policy/                     # Évaluateur d'autorisation pur et déterministe
│   │   ├── proof/                      # Événements, hash chain, vérification
│   │   ├── notification/               # E-mail, push, alertes de sécurité
│   │   ├── audit/                      # Lecture/export de preuves, séparé de proof
│   │   └── platform/
│   │       ├── config/
│   │       ├── database/
│   │       ├── http/
│   │       ├── auth/
│   │       ├── observability/
│   │       └── queue/
│   ├── db/
│   │   ├── migrations/                 # SQL immuable et ordonné
│   │   ├── queries/                    # SQL versionné, par domaine
│   │   └── sqlc.yaml
│   ├── api/
│   │   └── openapi/
│   │       └── v1.yaml                 # Contrat public versionné
│   ├── go.mod
│   └── go.sum
│
├── web/                                 # Next.js — dashboard cabinet + espace client (PWA)
│   ├── app/
│   ├── src/
│   └── public/
│
├── extension/                            # WebExtension MV3, TypeScript strict
│   ├── src/
│   │   ├── background/                   # Service worker MV3 (non persistant)
│   │   ├── content/                      # Interaction avec les portails
│   │   ├── popup/
│   │   ├── vault-session/                # Session cryptographique éphémère
│   │   └── permissions/
│   └── manifest.json
│
├── packages/
│   ├── kofra-crypto/                    # Chiffrement : pur, déterministe, sans UI/API
│   ├── kofra-protocol/                  # Enveloppes, formats ciphertext, versions
│   ├── kofra-contracts/                 # Types API, schémas Zod, événements
│   └── kofra-ui/                        # Optionnel : design system sans logique de sécurité
│
├── docs/
│   ├── MANIFESTO.md
│   ├── VISION.md
│   ├── SECURITY_THREAT_MODEL.md
│   ├── TRUST_PROTOCOL.md
│   ├── AUTHORIZATION_MODEL.md
│   ├── AUDIT_AND_PROOF.md
│   ├── ADR/
│   ├── security-exceptions/
│   └── superpowers/specs/
│
└── infra/
    ├── docker/
    │   ├── compose.dev.yml
    │   └── compose.prod.yml
    ├── terraform/
    ├── scripts/
    └── monitoring/
```

Pas de monorepo tool unique : Go utilise son système natif (`go build`, `go test`) sur un **module unique** dont la racine est `control-plane/` — **aucun `go.work`** (ADR 0013) ; `web/`, `extension/` et `packages/*` sont gérés par pnpm workspaces. Un `Makefile` racine orchestre les deux mondes (`make dev`, `make test`, `make lint`).

`control-plane/db/sqlc.yaml` figure dans l'arborescence cible ci-dessus mais **n'est pas créé au LOT 0** : l'introduction de `sqlc` est différée au Lot A, quand une première table multi-tenant et une requête métier réelle existeront (D6, `docs/DECISIONS_NEEDED.md`). Le LOT 0 ne fabrique aucune table artificielle pour alimenter la génération.

`SECURITY_THREAT_MODEL.md` (rédigé le 2026-08-20, voir `docs/SECURITY_THREAT_MODEL.md`), `TRUST_PROTOCOL.md`, `AUTHORIZATION_MODEL.md` et `AUDIT_AND_PROOF.md` seront rédigés lot par lot pendant l'implémentation — ce document de design en pose les fondations mais ne les rédige pas intégralement pour éviter la dérive entre spec et réalité du code.

## 4. Architecture cryptographique et modèle de données

### 4.1 Principe

Le control plane Go ne voit jamais un secret en clair. Tout chiffrement/déchiffrement a lieu côté client (web/extension) via Web Crypto API, à travers le wrapper unique `kofra-crypto` (aucune réimplémentation de primitive, testé par vecteurs de test connus).

### 4.2 Hiérarchie de clés (trois niveaux)

```text
Mot de passe utilisateur
       │
 Argon2id(salt, paramètres versionnés)
       │
KEK locale, jamais transmise au serveur
       │
 ┌─────┴───────────────────────┐
 │                              │
Private key X25519 chiffrée     Private key Ed25519 chiffrée
 │                              │
Public key X25519               Public key Ed25519
       │
       └─── chiffre / déchiffre les enveloppes de clés de coffre
                          │
                   Vault Key (VK) — 32 octets aléatoires, clé de gouvernance du coffre
                          │
       chiffre les Data Encryption Keys (DEK), une par secret/document
                          │
              chaque DEK chiffre son élément via AEAD (AES-256-GCM)
```

Points non négociables :

1. **Les clés X25519 et Ed25519 sont générées aléatoirement côté client à l'inscription — jamais dérivées déterministiquement du mot de passe.** Le mot de passe, via Argon2id, ne fait que chiffrer localement (KEK) ces clés privées avant leur envoi au serveur sous forme chiffrée.
2. **Hiérarchie à trois niveaux (VK → DEK → ciphertext), pas deux.** Faire pivoter la clé de coffre ne réclame que le ré-enveloppement des DEK, pas le rechiffrement de tout le contenu ; le rayon d'impact d'une erreur ou d'une corruption de clé reste limité à un élément.
3. **Argon2id** est la fonction de dérivation de référence (paramètres a minima conformes aux recommandations OWASP : mémoire, itérations et parallélisme documentés et versionnés dans `kdf_version`). scrypt reste un repli documenté si Argon2id est indisponible sur une plateforme cliente.
4. Le partage d'un coffre = ajout d'une nouvelle enveloppe de VK pour le destinataire, jamais un rechiffrement des secrets.

### 4.3 Tables (métadonnées et ciphertexts uniquement, jamais de contenu en clair)

```text
organizations
users
devices
mfa_credentials

user_public_keys
- user_id, key_id
- purpose: x25519_exchange | ed25519_signature
- public_key
- status: active | retired | revoked
- created_at | retired_at

encrypted_private_key_bundles
- user_id, bundle_version
- argon2_salt, argon2_parameters, kdf_version
- ciphertext, nonce
- created_at

vaults

vault_key_envelopes
- vault_id, vault_key_version
- recipient_type: user | recovery_group
- recipient_key_id
- ciphertext, nonce, algorithm_version
- created_at | revoked_at

vault_data_keys
- vault_id, secret_id
- dek_ciphertext, dek_nonce
- wrapped_by_vault_key_version
- created_at

secrets
- ciphertext + métadonnées (type, portail, dernière rotation) — jamais le contenu

mandates
- délégation : qui, quoi, durée, conditions, appareils de confiance

policies
- règles déterministes évaluées par internal/policy

proof_events
- append-only, hash-chained (voir §4.5)

recovery_groups
recovery_group_members
recovery_requests
```

### 4.4 Révocation à trois niveaux

Sur-promettre une révocation "gratuite" serait malhonnête (cf. §"Limite de promesse" du manifeste). La politique distingue explicitement :

| Niveau | Action | Ce que cela garantit |
|---|---|---|
| Logique | Suppression/invalidation de l'enveloppe + blocage de session/appareil | Bloque l'accès futur via KOFRA |
| Renforcée | Nouvelle clé de coffre, ré-enveloppement et rechiffrement des DEK | Empêche l'ancien détenteur de déchiffrer les versions nouvelles |
| Critique | Rotation des identifiants sur les portails externes | Neutralise les secrets éventuellement déjà copiés hors de KOFRA |

Cette distinction doit apparaître dans `docs/TRUST_PROTOCOL.md` et dans toute documentation commerciale — ne jamais promettre plus que le niveau réellement déclenché.

### 4.5 Chaîne de preuve

```text
event_hash = SHA-256(
  canonical_event_payload
  || previous_event_hash
  || organization_id
  || sequence_number
)

signature = Ed25519.sign(event_hash, actor_private_key)   # quand l'événement est un consentement/une approbation
```

Exigences :

- Encodage canonique stable et déterministe (JSON canonique ou CBOR déterministe) — figé par ADR avant le premier événement écrit.
- Une chaîne par organisation, potentiellement subdivisée par coffre.
- Numéro de séquence transactionnel strict, hash précédent et hash courant stockés pour chaque événement.
- Signature du client (Ed25519) pour les événements de consentement/approbation.
- Signature serveur distincte attestant réception et ordonnancement — sans jamais prétendre que le serveur connaissait le secret sous-jacent.
- Le journal ne contient jamais de secret : seulement intégrité, horodatage, identité du demandeur, contexte, et preuve que la politique appliquée l'autorisait.

### 4.6 Récupération multi-administrateur

Un modèle zero-knowledge pur sans récupération est un risque opérationnel (perte du seul mot de passe administrateur = coffre définitivement perdu). La récupération n'est jamais une porte dérobée KOFRA :

1. Un groupe de récupération est défini par l'organisation (ex. 3 administrateurs, seuil 2/3).
2. La clé de récupération est divisée en parts cryptographiques par un schéma à seuil (bibliothèque auditée, pas d'implémentation Shamir maison — vecteurs de test fixés).
3. Deux administrateurs (ou le seuil défini) approuvent une demande de récupération.
4. Le client reconstruit localement la clé nécessaire.
5. Les clés de l'utilisateur perdu sont ré-enveloppées ou remplacées ; une nouvelle racine de récupération est créée.
6. Un événement de preuve irréversible est ajouté à la chaîne.

**KOFRA ne détient jamais, seule, une part suffisante pour reconstruire une clé.**

### 4.7 Queue de jobs

PostgreSQL est l'unique système transactionnel et de jobs en V1 (River). Règle d'architecture non négociable :

> Toute mutation métier qui exige une action asynchrone insère son job River dans la **même transaction PostgreSQL** que la mutation.

Exemple : révocation d'un mandat → écriture du mandat révoqué + événement de preuve + job de notification + job de rotation éventuelle, dans une seule transaction. River est utilisé pour : expiration des mandats, notifications, relances de rotation de secret, vérification asynchrone de la chaîne de preuve, alertes de sécurité, livraison e-mail/push/webhook, nettoyage de sessions/appareils expirés, recalculs non critiques.

Redis n'est pas introduit en V1. Il ne sera réintroduit que face à un besoin réel mesuré (cache haute charge, rate limiting distribué à très haut débit, pub/sub temps réel massif, pression mesurée sur PostgreSQL) — pas par anticipation.

## 5. Authentification

- **TOTP est obligatoire ou fortement recommandé selon le niveau de risque du rôle** (universel, compatible avec des parcs d'appareils hétérogènes) — mécanisme d'authentification V1.
- **Passkeys/WebAuthn sont la cible prioritaire**, introduites après stabilisation du modèle device/session, et deviennent progressivement le mécanisme privilégié pour les rôles sensibles. Les fondations (modèle de données, contrats) sont posées en V1 ; l'activation effective peut suivre.

## 6. Extension navigateur

> L'extension V1 permet un remplissage local contrôlé des champs autorisés, à l'initiative explicite de l'utilisateur, sous mandat valide. Elle ne contourne ni OTP, ni CAPTCHA, ni les règles d'authentification des portails tiers. Aucun affichage volontaire, export ou copie du secret n'est permis par défaut.

Manifest V3 impose un service worker non persistant : la session et les secrets déchiffrés côté extension sont conçus comme **éphémères et recréables**, jamais dépendants d'un état mémoire durable dans le background script.

Cette formulation est celle qui doit apparaître dans toute documentation commerciale ou juridique — elle correspond à la section "Limite de promesse" du manifeste et ne doit jamais être élargie sans revue de sécurité et juridique.

## 7. Périmètre V1 (figé)

```text
IN SCOPE — V1

Identity
- Organisations, utilisateurs, appareils, sessions
- MFA TOTP
- Fondations WebAuthn/passkeys : modèle de données et contrats, activation ultérieure

Vault
- Coffres cabinet, client et équipe
- Hiérarchie VK / DEK
- Chiffrement local et stockage exclusif de ciphertexts
- Import contrôlé de portefeuilles existants

Access & Policy
- Mandats de délégation
- Évaluateur déterministe
- Révocation logique, renforcée et critique

Proof
- Événements append-only
- Chaînage cryptographique
- Signatures des actions de consentement lorsque applicables
- Vérification et export de preuves

Recovery
- Groupe de récupération
- Politique à seuil multi-administrateur
- Journalisation irréversible des procédures de récupération

Extension
- Manifest V3
- Session cryptographique éphémère
- Remplissage local sous mandat
- Aucun affichage volontaire, export ou copie de secret
- Aucun contournement OTP, CAPTCHA ou contrôle tiers

Platform
- PostgreSQL, River, SQL explicite, sqlc
- API REST OpenAPI v1
- Alertes et notifications critiques
- CI, analyse de dépendances, SAST, SBOM, sauvegardes et restauration testée

OUT OF SCOPE — V1 (voir docs/VISION.md, Phases 2-4)
- KOFRA Sign (signature électronique)
- Application mobile dédiée (le portail client V1 est web progressif)
- SDK tiers / fédération / SSO
- Trust Layer public, standard sectoriel
```

## 8. Tooling, CI et sécurité

| Domaine | Choix |
|---|---|
| Go | `1.23.4`, module unique `control-plane/`, pas de `go.work` (ADR 0013). Verrouillage de la toolchain **par la CI** — la directive `go` de `go.mod` est une version minimale, pas un verrou. Outillage : `golang-migrate`, `river`, `oapi-codegen` ; `sqlc` différé au Lot A (D6) |
| Lint/format Go | `golangci-lint` et son ruleset épinglés **par version exacte** — `latest` proscrit (D14) ; `gofumpt` |
| Web | Next.js `15.x` verrouillé dans `pnpm-lock.yaml`, TypeScript strict, Zod (`kofra-contracts`) |
| Crypto client | Web Crypto API native, wrapper unique `kofra-crypto`, testé par vecteurs de test connus |
| Extension | WebExtension Polyfill, Manifest V3, TypeScript strict |
| Contrat API | OpenAPI v1 (`control-plane/api/openapi/v1.yaml`), codegen client TS vers `kofra-contracts` |
| CI | GitHub Actions par composant (`control-plane.yml`, `web.yml`, `extension.yml`) + `security.yml` dédié : gosec, govulncheck, Trivy, CodeQL (Go + TypeScript), npm audit, **Dependabot**, **GitHub Dependency Review** sur chaque PR, **génération SBOM** (`syft` ou équivalent) |
| Sévérité CI | **CRITICAL exploitable bloque immédiatement.** Pour **HIGH** : correctif requis, ou exception documentée, datée et révisable dans `docs/security-exceptions/` — ne pas bloquer mécaniquement dès le premier commit sur des transitifs sans correctif disponible. **Réserve** : `main` est protégée (push direct bloqué) mais aucun statut CI n'est encore *requis* pour fusionner — le gate repose sur une vérification manuelle, cf. `docs/security-exceptions/` |
| Tests | Go : `testing` + vecteurs de test crypto fixes (jamais de crypto non testée par vecteur) ; TS : Vitest |
| Infra | Docker multi-stage non-root, `compose.dev.yml` / `compose.prod.yml`, infra isolée de SynkriaOps ; fournisseur choisi via ADR de déploiement avant mise en production (région, chiffrement, sauvegardes, restauration testée, accès privé, coût, SLA — critères non négociables, fournisseur remplaçable) |
| ADR | Chaque décision structurante de ce document devient un fichier `docs/ADR/000X-*.md` immuable |

## 9. Hors périmètre de ce document

- Le détail des lots d'implémentation (`writing-plans`).
- Le squelette de code complet (control-plane, web, extension) — le premier lot met en place les invariants de sécurité, les contrats et la testabilité du protocole, pas l'interface ni l'extension.
- Le choix définitif du fournisseur d'hébergement (ADR de déploiement séparé).
- Les Phases 2-4 du manifeste (`docs/VISION.md`).

# KOFRA

> KOFRA construit l'infrastructure de confiance numérique de l'Afrique.

KOFRA commence par protéger les accès numériques des cabinets d'expertise comptable de la CEMAC — coffre-fort chiffré, délégation d'accès sans divulgation de mot de passe, journal de preuve infalsifiable. Le coffre-fort n'est que le premier point d'entrée d'une infrastructure de confiance plus large (identité, mandats, preuve, signature).

- **Manifeste fondateur** : [`docs/MANIFESTO.md`](docs/MANIFESTO.md)
- **Trajectoire (Phases 1-4)** : [`docs/VISION.md`](docs/VISION.md)
- **Design d'architecture V1** : [`docs/superpowers/specs/2026-08-20-kofra-v1-design.md`](docs/superpowers/specs/2026-08-20-kofra-v1-design.md)
- **Décisions d'architecture** : [`docs/ADR/`](docs/ADR/)
- **Conventions du projet** : [`CLAUDE.md`](CLAUDE.md)

## Stack

Control plane en Go (PostgreSQL + River + sqlc), interfaces clientes en TypeScript (Next.js pour le web, WebExtension Manifest V3 pour l'extension navigateur). Chiffrement exclusivement côté client — KOFRA ne peut jamais lire le contenu des secrets qu'il stocke. Détail complet dans le design V1.

## Statut

Phase 1 en cours de spécification puis d'implémentation. Aucun code applicatif encore présent — voir `docs/superpowers/specs/2026-08-20-kofra-v1-design.md` pour l'état du design et le prochain plan d'implémentation.

## Licence

**Business Source License 1.1** (BUSL-1.1) — voir [`LICENSE`](LICENSE).

Le code est **public et auditable**. C'est délibéré : KOFRA promet qu'une compromission de son infrastructure ne révèle que du ciphertext inexploitable, et qu'aucune cryptographie n'y est improvisée. Ces promesses valent surtout si n'importe qui peut les vérifier.

En pratique :

- Vous pouvez **lire, auditer, modifier et exécuter** KOFRA, y compris en production, pour votre organisation et pour vos propres clients — c'est explicitement accordé.
- Vous ne pouvez pas en faire une **offre commerciale concurrente** (service hébergé, managé ou embarqué revendu à des tiers) avant la Change Date.
- Le **2030-08-20**, cette version bascule automatiquement sous **Mozilla Public License 2.0**.

Pour un autre arrangement de licence : `contact@kofra.io` (adresse à activer, cf. `docs/DECISIONS_NEEDED.md` O3).

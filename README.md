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

Propriétaire — tous droits réservés.

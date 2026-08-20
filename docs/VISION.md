# KOFRA — Trajectoire

Ce document fixe la trajectoire à long terme du manifeste (`docs/MANIFESTO.md`). C'est une roadmap, pas une spécification : chaque phase sera brainstormée et spécifiée séparément, en temps voulu, avant d'être implémentée. Seule la Phase 1 dispose aujourd'hui d'un design détaillé (`docs/superpowers/specs/2026-08-20-kofra-v1-design.md`).

## Phase 1 — Le coffre-fort des cabinets (en cours, design figé)

KOFRA devient le système de référence pour les accès numériques d'un cabinet.

- Coffres par cabinet, client, équipe et environnement.
- Saisie client chiffrée.
- Mandats d'utilisation sans divulgation volontaire du secret.
- Rôles, politiques, MFA, sessions et révocation.
- Extension navigateur pour l'usage contrôlé des accès.
- Journal d'audit et alertes.
- Import sécurisé des portefeuilles existants.

## Phase 2 — L'identité opérationnelle

KOFRA devient le registre vivant des identités et autorisations du cabinet.

- Identité des organisations, collaborateurs, clients et mandataires.
- Gestion de certificats, échéances et renouvellements.
- Coffre documentaire chiffré.
- Politiques d'approbation à plusieurs niveaux.
- Gestion des délégations temporaires.
- Registre des actifs numériques et des accès critiques.
- API sécurisée pour SynkriaOps.

## Phase 3 — La preuve et la signature

KOFRA devient le système de confiance pour les actes numériques.

- Signature électronique.
- Consentement et approbation multi-parties.
- Horodatage vérifiable.
- Piste d'audit infalsifiable.
- Archivage électronique chiffré.
- Vérification publique ou privée de preuve, selon le contexte.
- Connecteurs vers les outils de gestion, de finance et d'administration autorisés.

## Phase 4 — Le Trust Layer africain

KOFRA devient une infrastructure d'identité, de secret, de mandat, de preuve et de signature pour l'écosystème professionnel africain.

- API et SDK pour les éditeurs de logiciels.
- Authentification fédérée et SSO.
- Gestion de clés et de certificats pour les organisations.
- Politiques de conformité intégrables par les partenaires.
- Réseau de services de confiance interopérables.
- Standard sectoriel pour les cabinets, entreprises et institutions.

## Règle de séquencement

Une phase n'est brainstormée en détail (approches, design, spec) que lorsque la précédente a un design V1 implémentable. Ne pas anticiper l'architecture des phases 2-4 dans le code de la Phase 1 au-delà de ce que la spec V1 explicite (ex. `user_public_keys`, `recovery_groups`) — YAGNI au niveau du code, cartographie complète au niveau de la vision.

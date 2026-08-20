# KOFRA — Politique de sécurité

Ce document fixe la politique de sécurité globale du projet KOFRA. Il chapeaute deux documents plus spécifiques : `docs/SECURITY_THREAT_MODEL.md` (les menaces et leurs contre-mesures) et `docs/VULNERABILITY_DISCLOSURE.md` (comment nous traitons un signalement externe). Référence de gouvernance : EP-00.02 du backlog (`docs/execution/kofra-v1-backlog.yaml`).

## Posture générale

KOFRA gère des secrets qui n'appartiennent pas à KOFRA : identifiants fiscaux, sociaux, bancaires et métiers de cabinets d'expertise comptable et de leurs clients. CLAUDE.md §0 fixe la règle : *la barre de sécurité ne baisse jamais*, pour aucune raison de vitesse ou de commodité. Cette politique en découle directement, avec trois piliers non négociables :

- **Zero-knowledge par défaut.** Le control plane Go ne stocke, ne journalise et ne transporte jamais un secret en clair, une clé privée en clair, ni un mot de passe. Une fuite de la base de données ou de l'infrastructure doit se traduire par du ciphertext inexploitable, jamais par une donnée métier lisible (manifeste, §"Principes cryptographiques" ; design V1 §4).
- **Pas de cryptographie improvisée.** Aucune primitive n'est réécrite ou "inventée" : uniquement des bibliothèques standardisées et éprouvées (Web Crypto API, wrapper unique `packages/kofra-crypto`), testées par vecteurs de test connus (RFC 7748, RFC 8032). Toute crypto non testée par vecteur est un bug bloquant.
- **Moindre privilège.** Aucun rôle, humain ou machine, ne reçoit plus d'accès que ce que sa fonction exige — mandats côté produit (portée, durée, appareil) comme accès internes (dépôt, infra, secrets de production, cf. EP-00.02).

## Référentiels adoptés

KOFRA n'improvise pas son cadre de sécurité du cycle de développement. Trois référentiels sont adoptés explicitement, avec des conséquences concrètes :

- **NIST SSDF (SP 800-218)** structure notre cycle de développement sécurisé : modélisation des menaces avant d'écrire du code sensible (EP-01.03, et CLAUDE.md §0 — "relire la demande avec une lentille sécurité/cryptographie senior" avant tout LOT), revue de code obligatoire sur tout ce qui touche au protocole cryptographique, tests statiques et dynamiques en CI (`security.yml`), et une pratique formalisée de réponse aux vulnérabilités (EP-00.05) plutôt qu'un traitement ad hoc.
- **OWASP ASVS** fournit les exigences vérifiables pour la surface web et API (authentification, contrôle d'accès, gestion de session, communications). Le niveau cible et la table de correspondance exigence → epic sont définis par EP-01.10 ; tant que cette table n'existe pas, aucune fonctionnalité d'authentification ou d'autorisation ne peut être considérée comme "conforme ASVS" par défaut.
- **SLSA** encadre l'intégrité de notre chaîne de livraison : provenance des builds, SBOM généré en CI (`syft` ou équivalent), Dependabot et GitHub Dependency Review actifs sur chaque PR. L'objectif n'est pas la conformité à un badge mais la garantie qu'un artefact déployé est traçable jusqu'au commit source qui l'a produit, sans étape opaque.

## Niveaux de gravité en CI

Défini en détail en CLAUDE.md §5, rappelé ici comme politique : un **CRITICAL** exploitable détecté par le scan de sécurité (gosec, govulncheck, Trivy, CodeQL, npm audit) bloque immédiatement la fusion, sans exception possible. Un **HIGH** doit être corrigé, ou faire l'objet d'une exception écrite, datée et révisable dans `docs/security-exceptions/` — jamais fusionné silencieusement, jamais bloqué mécaniquement non plus sur un transitif sans correctif disponible si l'analyse de risque le justifie.

**Portée réelle de ce gate aujourd'hui.** Le mot « bloque » ci-dessus décrit la politique ; l'état de la plateforme, vérifié le 2026-08-20, est plus nuancé. Sont **réellement appliqués** : protection de `main` (push direct bloqué, `enforce_admins` actif, historique linéaire, force-push interdit), secret scanning, push protection, alertes et mises à jour de sécurité Dependabot. N'est **pas encore appliqué** : `required_status_checks` est vide, donc **aucun statut CI n'est requis pour fusionner** — un job rouge se voit, il n'interdit rien. Jusqu'à la levée de cet écart, le respect du gate repose sur une vérification manuelle du relecteur avant fusion. Constat, justification et marche à suivre : [`security-exceptions/2026-08-20-statuts-ci-non-requis.md`](security-exceptions/2026-08-20-statuts-ci-non-requis.md).

## Responsabilité

La gouvernance de sécurité (rôles, matrice d'accès dépôt/infra/secrets de production, principe de moindre privilège appliqué et vérifiable) est définie par EP-00.02. Tant que cette matrice n'est pas publiée, aucun accès de production ne doit être considéré comme acquis par défaut. Brice porte la responsabilité finale de validation produit et sécurité (CLAUDE.md §1) ; toute exception de sécurité (`docs/security-exceptions/`) engage cette validation.

## Validation d'un changement cryptographique

Aucune évolution du protocole cryptographique (nouvel algorithme, nouveau format d'enveloppe, changement de hiérarchie de clés) n'est acceptée sans : un ADR (`docs/ADR/`) documentant la décision et les alternatives écartées, une revue de sécurité indépendante avant déploiement, et un plan de migration compatible avec les coffres existants (manifeste, §"Pas de cryptographie improvisée" ; ADR 0003, section "Conséquences"). Un changement crypto sans ADR est un signal d'arrêt, pas une invitation à improviser (CLAUDE.md §0).

## Cycle de revue de cette politique

Cette politique n'est pas figée mais n'est pas non plus révisable à la légère. Elle est revue à chaque changement structurant de l'architecture de sécurité (nouvel ADR crypto, changement de référentiel de conformité, incident majeur) et, à défaut, au minimum une fois par jalon (`foundation`, `alpha-interne`, `pilote-ferme`). Toute révision est elle-même un commit daté et justifié — pas une édition silencieuse.

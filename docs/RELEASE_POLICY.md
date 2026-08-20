# KOFRA — Politique de release et de versionnement

Ce document fixe comment KOFRA versionne, branche et publie chaque composant. Il répond à EP-02.08 du backlog (`docs/execution/kofra-v1-backlog.yaml`) : « fixer le modèle de branches et la politique de versionnage sémantique par composant ». Référence de stack : CLAUDE.md §2. Référence d'architecture : ADR 0001 (séparation Go/TypeScript) et ADR 0006 (contrat OpenAPI comme source de vérité entre les deux mondes).

## Trois cycles de vie, pas un seul

KOFRA n'a pas un seul artefact à versionner mais trois, avec des rythmes différents (ADR 0001) :

- **`control-plane/`** (Go) — un binaire déployé côté serveur, sous contrôle total de KOFRA. Le rythme de release est celui de l'exploitation : aussi souvent que nécessaire, sans contrainte de store tiers.
- **`web/`** (Next.js) — une application déployée en continu, pas installée par l'utilisateur. Le « numéro de version » a surtout un rôle de traçabilité interne (corrélation avec un commit et une release control-plane compatible), pas un rôle contractuel vis-à-vis d'un tiers.
- **`extension/`** (WebExtension Manifest V3) — le seul composant soumis à un tiers (store d'extension). Son cycle de vie est le plus contraint : revue de store, délai de publication hors du contrôle de KOFRA, versionnage obligatoire dans `manifest.json`.
- **`packages/*`** (`kofra-crypto`, `kofra-protocol`, `kofra-contracts`, `kofra-ui`) — dépendances internes consommées par `web/` et `extension/`. En V1 elles ne sont pas publiées séparément (workspace `pnpm`), mais elles sont versionnées comme si elles l'étaient : un changement de format d'enveloppe ou de contrat est un changement de version, pas un détail interne, car `kofra-contracts` deviendra la base d'un SDK public en Phase 2 (ADR 0006).

## Versionnement sémantique

Chaque composant suit SemVer (`MAJOR.MINOR.PATCH`) de façon indépendante — il n'y a pas de numéro de version unique pour « KOFRA » :

- **`control-plane`** : `MAJOR` sur une rupture de contrat OpenAPI (`v1.yaml` → `v2.yaml`) ou de format de ciphertext/enveloppe (jamais sans ADR, cf. SECURITY_POLICY.md « Validation d'un changement cryptographique »). `MINOR` sur un nouvel endpoint ou une nouvelle capacité rétrocompatible. `PATCH` sur un correctif sans changement de contrat.
- **`web`** : suit la même logique mais son `MAJOR` est rare — il reflète un changement de compatibilité avec une version minimale de `control-plane`, pas une rupture d'interface publique (il n'y a pas de consommateur tiers de `web`).
- **`extension`** : `MAJOR`/`MINOR`/`PATCH` alignés sur `manifest.json`. Toute publication en store est une release, même `PATCH` — les stores n'ont pas de notion de déploiement continu.
- **`packages/*`** : `MAJOR` sur toute rupture de `algorithm_version` ou `kdf_version` (design V1 §4.2), ou tout changement de signature de fonction publique.

## Ce qui déclenche une release

Une release control-plane ou web est déclenchée par une fusion sur `main` accompagnée d'un tag, jamais par une échéance calendaire artificielle. Une release extension est déclenchée par l'accumulation de changements jugés prêts pour revue de store — le cycle de revue tiers impose de grouper les changements plutôt que de publier à chaque commit.

## Branches et releases

Modèle **trunk-based simple** :

- `main` est la seule branche longue vivante et la seule source de vérité déployable.
- **Règle du projet : aucune écriture directe sur `main`** — toute modification passe par une branche courte (`feat/…`, `fix/…`) et une Pull Request.
- **Règle du projet : une PR n'est fusionnable que si la CI est verte** (lint, tests, `security.yml` — EP-02.05/02.06/02.07) et qu'elle a été revue.
- Un tag (`control-plane/vX.Y.Z`, `web/vX.Y.Z`, `extension/vX.Y.Z`) est posé sur le commit de `main` qui correspond à une release, pas sur une branche de release séparée — pas de GitFlow, pas de branches `release/*` à maintenir en V1. Ce choix pourra être révisé si la cadence de release multi-composants l'exige, mais pas par anticipation.

### Ce que la plateforme applique réellement — et ce qu'elle n'applique pas encore

Une politique que rien n'applique induit en erreur. Voici donc l'état exact, vérifié par l'API le 2026-08-20 après le passage du dépôt en public :

**Appliqué par GitHub :**

- **Push direct sur `main` : bloqué.** La première règle ci-dessus n'est plus une discipline, elle est imposée.
- `enforce_admins` actif — **aucun contournement, y compris pour le propriétaire du dépôt**.
- Historique linéaire requis ; force-push et suppression de branche interdits.
- Résolution des conversations exigée avant fusion.
- Secret scanning et push protection actifs.

**Pas encore appliqué :**

- **Les statuts CI ne sont pas requis pour fusionner.** Un job rouge produit un statut rouge, il ne bloque pas. Le vert doit donc encore être **constaté manuellement** par le relecteur.
- La revue CODEOWNERS n'est pas exigée, et aucune approbation n'est requise (`required_approving_review_count: 0`) — GitHub interdisant d'approuver sa propre PR, exiger une approbation rendrait toute fusion impossible tant que l'équipe est d'une seule personne.

Cet écart résiduel est volontaire et daté : exiger un contexte de check dont le nom n'est pas confirmé bloquerait définitivement toute fusion, et aucun run de PR n'a encore révélé les noms réels. La marche à suivre pour le refermer dès la première PR est dans [`docs/security-exceptions/2026-08-20-statuts-ci-non-requis.md`](security-exceptions/2026-08-20-statuts-ci-non-requis.md). Ce document sera supprimé — et la présente section réécrite — le jour où les statuts seront requis.

## SLSA : où KOFRA en est réellement

SECURITY_POLICY.md adopte SLSA pour l'intégrité de la chaîne de livraison. Ce document précise l'état actuel, honnêtement, plutôt que de revendiquer un niveau non atteint :

- **Aujourd'hui (cible immédiate, niveau proche de SLSA 1)** : chaque artefact publié est traçable jusqu'à un commit source via CI (pas de build manuel non tracé), un SBOM est généré (`syft` ou équivalent, design V1 §8), et la provenance (qui a déclenché le build, à partir de quel commit) est documentée dans les logs CI.
- **Cible progressive (SLSA 2-3, à mesure que l'équipe grandit)** : builds exécutés sur une plateforme de build isolée et non falsifiable, provenance signée automatiquement, puis **revue à deux personnes obligatoire** avant toute fusion sur `main` — non revendiqué, et doublement hors de portée aujourd'hui : l'équipe d'ingénierie est réduite, et la plateforme ne permet de toute façon d'imposer aucune règle de fusion (voir la section « Ces deux règles ne sont pas appliquées par la plateforme » ci-dessus).
- **Builds reproductibles** : objectif à moyen terme pour `control-plane` (Go s'y prête nativement) et `packages/kofra-crypto`/`kofra-protocol` (crypto — la reproductibilité y a une valeur de confiance disproportionnée). Pas encore mis en œuvre.

Tant que la revue à deux personnes n'est pas structurellement imposée, KOFRA ne prétend pas être conforme à SLSA 2 ou 3 — seule la provenance documentée et le SBOM sont acquis aujourd'hui.

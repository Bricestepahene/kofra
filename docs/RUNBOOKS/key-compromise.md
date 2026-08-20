# Runbook — Compromission de clé

`internal/access` et `internal/vault` (programmes P05/P06 du backlog) ne sont pas encore codés — les commandes et endpoints exacts de ce runbook seront ajoutés une fois ces modules livrés. La procédure et la distinction des cas ci-dessous sont déjà normatives : elles découlent directement du design V1 §4.4 (révocation à trois niveaux) et §4.6 (récupération multi-administrateur), et doivent guider l'implémentation de ces modules, pas seulement leur usage a posteriori.

Ce runbook distingue trois cas — ne jamais les traiter de façon interchangeable, le niveau de révocation déclenché n'est pas le même (CLAUDE.md §4).

## Cas 1 — Clé privée utilisateur compromise (X25519/Ed25519)

Poste compromis, clé privée exfiltrée ou soupçonnée de l'être.

1. **Révocation renforcée immédiate**, pas seulement logique : ne pas se contenter d'invalider la session (`internal/identity`) — cela ne bloque que l'accès futur via KOFRA, pas un attaquant qui détient déjà la clé (design V1 §4.4, niveau "Logique").
2. Déclencher via `internal/access` une nouvelle Vault Key (VK) pour chaque coffre auquel l'utilisateur avait accès.
3. Ré-envelopper les Data Encryption Keys (DEK) de ces coffres sous la nouvelle VK — jamais un rechiffrement direct des secrets par la VK (hiérarchie à trois niveaux, CLAUDE.md §4).
4. Révoquer l'ancienne enveloppe VK de l'utilisateur compromis (`vault_key_envelopes.revoked_at`).
5. Forcer la génération d'une nouvelle paire de clés X25519/Ed25519 côté client pour l'utilisateur, aléatoire, jamais dérivée du mot de passe (ADR 0003).
6. Émettre un événement de preuve irréversible dans `internal/proof` documentant la révocation et son niveau exact (ne jamais afficher "révoqué" sans préciser "renforcée").
7. Évaluer si des secrets exposés via cette clé nécessitent en plus une révocation critique (cas 3 ci-dessous) — la révocation renforcée protège les futures versions, pas les secrets déjà copiés hors de KOFRA.

## Cas 2 — Compromission suspectée d'une part de récupération à seuil

Une part détenue par un administrateur du groupe de récupération (design V1 §4.6) est soupçonnée compromise.

1. Ne pas attendre confirmation certaine — le coût d'une fausse alerte est bien inférieur à celui d'une reconstruction de clé de récupération par un tiers.
2. Révoquer immédiatement la part suspecte au niveau du groupe de récupération (`recovery_groups` / `recovery_group_members`).
3. Vérifier qu'aucune demande de récupération (`recovery_requests`) n'a atteint le seuil requis avec la part compromise incluse pendant la fenêtre d'exposition.
4. Régénérer une nouvelle racine de récupération : redécouper la clé de récupération en nouvelles parts à seuil (bibliothèque auditée, jamais d'implémentation Shamir maison — design V1 §4.6) et les redistribuer aux administrateurs légitimes restants.
5. Rappel structurel : KOFRA ne détient jamais seule une part suffisante pour reconstruire une clé — cette propriété doit rester vraie après la régénération, pas seulement avant.
6. Émettre un événement de preuve irréversible documentant la révocation de la part et la régénération de la racine.

## Cas 3 — Compromission d'un secret externe déjà utilisé via un mandat

Le secret lui-même (identifiant sur un portail tiers) est soupçonné copié ou utilisé hors du mandat qui l'a délivré.

1. **Révocation critique immédiate** : le seul niveau qui neutralise réellement ce cas (design V1 §4.4) — révoquer logiquement et renforcer ne suffisent pas, l'attaquant a déjà le secret en clair hors de KOFRA.
2. Révoquer le mandat ayant servi à l'accès (`mandates`) sans attendre son expiration naturelle.
3. Déclencher la rotation du secret directement **sur le portail tiers** — KOFRA ne peut pas la faire à la place de l'utilisateur si le portail n'expose pas d'API de rotation ; documenter l'action manuelle effectuée par le cabinet.
4. Une fois le secret tourné côté portail, mettre à jour le secret chiffré dans KOFRA (nouveau ciphertext, nouvelle DEK) — ne jamais laisser un ciphertext obsolète correspondant à un secret déjà tourné.
5. Émettre un événement de preuve irréversible précisant que la révocation critique a bien été exécutée (pas seulement demandée) — ne jamais promettre ce niveau tant que la rotation externe n'est pas confirmée.

## Références

- `docs/superpowers/specs/2026-08-20-kofra-v1-design.md` §4.4 (révocation à trois niveaux), §4.6 (récupération multi-administrateur).
- `docs/execution/kofra-v1-backlog.yaml` — programmes P05 (`internal/access`) et P06 (`internal/vault`).
- CLAUDE.md §4 — invariants révocation, hiérarchie de clés, chaîne de preuve.
- `docs/RUNBOOKS/security-incident.md` pour la procédure générale d'incident (notification, capture de preuve, post-mortem) qui encadre chacun de ces trois cas.

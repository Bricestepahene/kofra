# ADR 0003 — Chiffrement côté client et hiérarchie de clés à trois niveaux

- **Statut** : accepté
- **Date** : 2026-08-20

## Contexte

Le manifeste KOFRA (§"Principes cryptographiques") exige un modèle zero-knowledge par défaut : l'opérateur de la plateforme ne doit jamais pouvoir lire les secrets métier de ses clients, même en cas de compromission de l'infrastructure. Ce modèle doit rester opérable (partage, révocation, récupération) sans devenir une contrainte commerciale insoutenable.

## Décision

- Tout chiffrement/déchiffrement a lieu **côté client** (Web Crypto API), via un wrapper unique et testé par vecteurs de test (`packages/kofra-crypto`). Aucune primitive cryptographique n'est réimplémentée.
- Les paires de clés utilisateur (**X25519** pour l'échange, **Ed25519** pour la signature) sont **générées aléatoirement côté client** à l'inscription — jamais dérivées déterministiquement du mot de passe.
- Le mot de passe, via **Argon2id**, dérive une Key Encryption Key (KEK) locale qui chiffre les clés privées avant leur envoi au serveur sous forme chiffrée. Le serveur ne reçoit jamais le mot de passe ni une clé privée en clair.
- La hiérarchie de chiffrement des secrets compte **trois niveaux** : Vault Key (VK, clé de gouvernance du coffre) → Data Encryption Key (DEK, une par secret/document) → ciphertext (AEAD, AES-256-GCM). Le partage d'un coffre ajoute une enveloppe de VK pour le destinataire ; il ne rechiffre jamais les secrets.
- La récupération est gérée par un **groupe de récupération à seuil multi-administrateur** (bibliothèque de partage de secret auditée, jamais une implémentation maison), documentée en détail dans la spec V1 (§4.6).

## Alternatives considérées

- **Hiérarchie à deux niveaux** (VK chiffrant directement chaque secret) — écartée : une rotation de VK forcerait le rechiffrement de tous les secrets du coffre, au lieu du seul ré-enveloppement des DEK ; le rayon d'impact d'une corruption de clé serait aussi plus large.
- **Dérivation déterministe des clés asymétriques depuis le mot de passe** — écartée : couple irréversiblement la sécurité des clés à la force du mot de passe et empêche une rotation de mot de passe sans changer les clés d'identité.
- **Zero-knowledge sans mécanisme de récupération** — écarté : un cabinet perdant l'unique mot de passe administrateur perdrait définitivement son coffre ; risque opérationnel jugé inacceptable commercialement.

## Conséquences

- Le control plane Go ne stocke que des métadonnées, ciphertexts et enveloppes — jamais de secret en clair, jamais de clé privée en clair.
- La révocation n'est pas un geste unique : elle se décline en trois niveaux (logique, renforcée, critique — spec V1 §4.4), chacun avec une garantie différente, qui doit être documentée sans ambiguïté dans toute communication produit.
- Toute évolution de ce protocole (nouvel algorithme, nouveau format d'enveloppe) est versionnée et migrable, et passe par une revue de sécurité indépendante avant déploiement.

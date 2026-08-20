# ADR 0005 — Extension navigateur Manifest V3, remplissage contrôlé sans exposition

- **Statut** : accepté
- **Date** : 2026-08-20

## Contexte

KOFRA Access doit permettre à un collaborateur d'utiliser un accès délégué sans jamais voir le mot de passe sous-jacent (manifeste, §"KOFRA Access" et §"Limite de promesse"). L'extension navigateur est le point d'usage réel de ce mandat.

## Décision

L'extension V1 (`extension/`) est une **WebExtension Manifest V3** en TypeScript strict, avec :

- un **service worker non persistant** (`background/`) — imposé par Manifest V3 — donc une session et des secrets déchiffrés conçus comme **éphémères et recréables**, jamais dépendants d'un état mémoire durable ;
- un module `vault-session/` dédié à cette session cryptographique éphémère ;
- un remplissage **local, contrôlé, à l'initiative explicite de l'utilisateur, sous mandat valide** — jamais d'affichage volontaire, d'export ou de copie du secret par défaut ;
- **aucun contournement** d'OTP, de CAPTCHA ou des règles d'authentification propres au portail tiers.

## Alternatives considérées

- **Manifest V2** (background page persistante, modèle de session plus simple) — écarté : obsolescence en cours sur les navigateurs cibles, et une page de fond persistante inciterait à garder des secrets déchiffrés en mémoire plus longtemps que nécessaire, à contre-courant du principe de moindre exposition.
- **Extension avec affichage/copie du secret assistée** — écarté explicitement par le manifeste : KOFRA promet une réduction radicale de l'exposition, pas une élimination totale (un navigateur qui authentifie réellement un utilisateur manipule nécessairement un secret) — mais l'exposition volontaire à l'utilisateur humain n'est pas la promesse V1.

## Conséquences

- Toute fonctionnalité d'extension qui impliquerait un affichage, un export ou une copie volontaire du secret est un changement de promesse produit et doit repasser par une revue explicite (sécurité + juridique), pas une décision d'implémentation.
- La conception "session éphémère" doit être testée activement (redémarrage du service worker en cours de mandat, expiration, révocation pendant une session active).

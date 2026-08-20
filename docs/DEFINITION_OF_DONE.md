# KOFRA — Définition de Done

Ce document fait autorité sur ce que signifie "terminé" pour tout changement de code dans KOFRA. `CLAUDE.md` §4 et `docs/execution/kofra-v1-backlog.yaml` en résument l'esprit ; ce fichier est la référence complète. Une PR qui ne coche pas ces cases n'est pas prête à être fusionnée, quelle que soit l'urgence.

## Minimum pour toute fonctionnalité

Une fonctionnalité est terminée seulement si :

- [ ] La spécification et les critères d'acceptation sont satisfaits.
- [ ] Les invariants de domaine sont écrits et testés.
- [ ] Les erreurs métier sont explicites et documentées.
- [ ] Les migrations SQL sont versionnées, réversibles ou accompagnées d'une procédure de rollback explicite.
- [ ] Les requêtes SQL sont revues pour l'isolation tenant/RLS.
- [ ] Les contrats OpenAPI et types générés sont à jour.
- [ ] Les tests unitaires, intégration et contrat sont verts.
- [ ] Les cas d'échec et d'autorisation refusée sont testés.
- [ ] Les secrets, tokens, données client et ciphertexts ne sont jamais loggés.
- [ ] Les événements de preuve/audit pertinents sont produits.
- [ ] Les métriques et logs structurés nécessaires existent.
- [ ] L'UI comporte états loading, empty, error, offline et success.
- [ ] L'accessibilité clavier, focus et contraste sont vérifiés.
- [ ] Le threat model (`docs/SECURITY_THREAT_MODEL.md`) est mis à jour si la frontière de confiance change.
- [ ] Les documents et ADR concernés sont mis à jour.
- [ ] CI, lint, SAST et scans de dépendances sont verts.

## Exigences supplémentaires — vault, recovery, policy, proof, identity, extension

Ces modules touchent directement la promesse zero-knowledge du manifeste (§"Principes cryptographiques"). En plus du minimum ci-dessus :

- [ ] Revue sécurité humaine obligatoire.
- [ ] Vecteurs cryptographiques connus exécutés.
- [ ] Aucun changement cryptographique sans ADR et validation explicite.
- [ ] Test de non-régression sur révocation, rotation ou récupération.

## Ce que cette liste n'est pas

Cette checklist ne remplace pas le jugement d'ingénierie senior exigé par `CLAUDE.md` §0 : une PR peut cocher toutes les cases et rester dangereuse si l'angle mort n'est pas dans la liste. Dans ce cas, arrêter et signaler — pas cocher mécaniquement.

## Application

- Chaque item non applicable à une PR donnée (ex. "aucune migration SQL dans ce changement") est explicitement marqué non applicable dans la description de PR, pas silencieusement omis.
- Le gabarit `.github/pull_request_template.md` reprend cette liste pour qu'elle soit visible au moment de la revue, pas seulement dans la documentation.

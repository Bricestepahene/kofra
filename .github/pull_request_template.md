<!--
Ce gabarit reprend intégralement docs/DEFINITION_OF_DONE.md pour que la
checklist soit visible au moment de la revue, pas seulement dans la
documentation (DEFINITION_OF_DONE.md §Application). Chaque case non
applicable à cette PR doit être explicitement marquée "N/A — <raison>" dans
le texte, jamais silencieusement supprimée ou laissée décochée sans
explication.
-->

## Contexte

<!-- Pourquoi ce changement ? Quel epic/issue du backlog (docs/execution/kofra-v1-backlog.yaml)
     ou quelle issue GitHub couvre-t-il ? Quel problème résout-il, ou quelle décision
     (ADR, spec) met-il en œuvre ? -->

## Comment tester

<!-- Étapes concrètes pour qu'un relecteur vérifie ce changement localement :
     commandes à lancer, données de test, comportement attendu. -->

## Definition of Done (docs/DEFINITION_OF_DONE.md)

### Minimum pour toute fonctionnalité

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

### Modules sensibles — cocher uniquement si cette PR touche vault, recovery, policy, proof, identity ou extension

Ces modules touchent directement la promesse zero-knowledge du manifeste. Si aucun de ces modules n'est concerné, indiquer **N/A** ci-dessous et passer à la section suivante.

- [ ] N/A — cette PR ne touche ni vault, ni recovery, ni policy, ni proof, ni identity, ni extension.
- [ ] Revue sécurité humaine obligatoire effectuée.
- [ ] Vecteurs cryptographiques connus exécutés (RFC 7748, RFC 8032 ou équivalent selon le module).
- [ ] Aucun changement cryptographique sans ADR et validation explicite (si applicable).
- [ ] Test de non-régression sur révocation, rotation ou récupération (si applicable).

## Modules touchés

<!-- Cocher tout ce qui s'applique — aide le CODEOWNERS review et le relecteur à situer le risque. -->

- [ ] control-plane
- [ ] web
- [ ] extension
- [ ] packages (kofra-crypto / kofra-protocol / kofra-contracts / kofra-ui)
- [ ] infra
- [ ] docs / ADR
- [ ] `.github` (CI, gouvernance)

## Exceptions de sécurité

<!-- Si cette PR introduit ou s'appuie sur une exception documentée dans
     docs/security-exceptions/, lier le fichier ici. Sinon, indiquer "aucune". -->

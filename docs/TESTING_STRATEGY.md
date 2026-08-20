# KOFRA — Stratégie de test

Ce document fixe les niveaux de test attendus dans KOFRA et la place particulière des tests cryptographiques. Il s'articule avec `docs/DEFINITION_OF_DONE.md` (ce qu'une PR doit couvrir), `docs/SECURITY_POLICY.md` (référentiels NIST SSDF / OWASP ASVS / SLSA) et le style déjà pratiqué au LOT 1 (`docs/superpowers/plans/2026-08-20-lot1-protocol-foundations.md`) : vecteurs de test connus RFC 7748/RFC 8032, tests de tamper systématiques, fixtures cross-langage TypeScript ↔ Go.

## Les huit niveaux

| Niveau | Objectif | Exemple KOFRA |
|---|---|---|
| Unitaires | Invariants purs | Une policy refuse un mandat expiré |
| Propriété / fuzzing | Cas imprévus | Un parser de ciphertext ne panique jamais |
| Intégration DB | SQL, RLS, transactions | Un cabinet A ne lit jamais un coffre B |
| Contrat API | Respect OpenAPI | Le client TS correspond exactement à l'API Go |
| E2E | Flux réellement utilisé | Client → mandat → extension → preuve → révocation |
| Sécurité | Contrôles de sécurité | Session volée, appareil non fiable, MFA manquant |
| Performance | Limites observables | Création/recherche de coffres sous charge |
| Résilience | Reprise et restauration | Sauvegarde restaurée sur environnement isolé |

Précisions par niveau, propres à KOFRA :

- **Unitaires** — `internal/policy` (ADR 0004) est un évaluateur pur et déterministe : c'est le module le plus adapté à une couverture unitaire exhaustive, sans mock, puisqu'il n'a par construction aucune dépendance externe.
- **Propriété / fuzzing** — cible en priorité les frontières qui reçoivent des données non fiables par nature : décodage d'enveloppe (`packages/kofra-protocol`), désérialisation JSON entrante côté `control-plane`, parsing de `manifest.json`/messages inter-scripts côté `extension/`. `go test -fuzz` côté Go, `fast-check` ou équivalent côté TypeScript.
- **Intégration DB** — la RLS (Row-Level Security) PostgreSQL est un contrôle de sécurité, pas un détail de schéma : elle doit être testée en tant que tel, avec un test qui échoue si une requête exécutée hors du contexte tenant attendu renvoie une ligne. Piège majeur : **un rôle privilégié contourne la RLS par construction**, donc un test d'isolation exécuté sous un superutilisateur passe au vert sans rien prouver. Les tests d'intégration DB s'exécutent obligatoirement sous **`kofra_app`** (ADR 0009), jamais sous `kofra_owner` ni `kofra_migrator`. La RLS devient obligatoire au **Lot A**, pour toute table portant un `organization_id` (D11) — elle n'est pas rétrofitée après coup.
- **Contrat API** — ADR 0006 fait d'`openapi/v1.yaml` la source de vérité ; un test de contrat qui compare le schéma généré (`kofra-contracts`) au comportement réel de l'API Go est ce qui rend cette source de vérité vérifiable plutôt que déclarative.
- **E2E** — le flux de référence V1 est explicitement celui du périmètre figé (design V1 §7) : création de mandat → utilisation via l'extension → génération d'un événement de preuve → révocation (aux trois niveaux, design V1 §4.4) et vérification que l'accès est effectivement coupé.
- **Sécurité** — les scénarios testés doivent correspondre un à un aux scénarios du modèle de menace (`docs/SECURITY_THREAT_MODEL.md`, EP-01.03) : session volée, appareil non enrôlé qui tente un accès, MFA contourné ou absent, mandat expiré réutilisé. Un scénario de menace sans test de régression associé est un trou de couverture, pas une omission mineure (cf. EP-04.09).
- **Performance** — les limites testées sont celles réellement observables en usage cabinet (création/recherche de coffres, volumétrie de mandats et de secrets par organisation), pas des benchmarks abstraits sans rapport avec la charge attendue.
- **Résilience** — s'appuie sur EP-03.10/EP-10.08 : une sauvegarde n'est considérée fiable que si sa restauration a été testée sur un environnement isolé, avec vérification que les données restaurées sont identiques (pas seulement que la commande de restauration s'est exécutée sans erreur).

## Tests cryptographiques

La cryptographie a un régime de test à part parce qu'une régression y est silencieuse par nature : un bug de policy échoue bruyamment, un bug crypto peut produire un résultat qui *a l'air* correct pendant longtemps. CLAUDE.md §0 et `docs/SECURITY_POLICY.md` en font une ligne rouge ; cette section précise comment.

### Vecteurs de test connus

Toute primitive cryptographique de `packages/kofra-crypto` est validée contre un vecteur de test publié, pas seulement contre un test de round-trip généré localement :

- **X25519** — vecteur RFC 7748 §6.1 (clé privée, clé publique et secret partagé connus, comparés octet pour octet).
- **Ed25519** — vecteur RFC 8032 §7.1, TEST 1 (message vide, seed connue, signature attendue connue).

Au moment de la rédaction de ce document, `packages/kofra-crypto` et `packages/kofra-protocol` ne sont pas encore présents sur le disque (seul `packages/kofra-ui` existe) — cette section décrit la pratique déjà figée dans le plan LOT 1, qui sert de référence contraignante pour l'implémentation à venir, pas d'une pratique optionnelle.

### Compatibilité entre versions de protocole

Le format d'enveloppe (design V1 §4.2/§4.3) porte des champs `algorithm_version` et `kdf_version` explicitement pour permettre l'évolution du protocole sans casser les coffres existants. Chaque introduction d'une nouvelle version doit être accompagnée d'un test qui prouve qu'une enveloppe écrite avec l'ancienne version reste déchiffrable après l'introduction de la nouvelle — pas seulement que la nouvelle version fonctionne isolément. L'absence d'un tel test de compatibilité ascendante est traitée comme l'absence d'un test à vecteur connu (voir règle de revue ci-dessous).

### Corruption de ciphertext

Un déchiffrement face à un ciphertext corrompu, tronqué ou signé avec la mauvaise clé doit **échouer proprement** — jamais paniquer, jamais lever une exception non gérée qui traverse une frontière de confiance, et surtout **jamais renvoyer silencieusement un résultat faux**. C'est déjà la discipline posée par la contrainte globale du LOT 1 (« every crypto wrapper function must have at least one test that exercises a tamper/failure path ») et illustrée concrètement par les tests de tamper de `aead.ts` (mauvaise clé, ciphertext altéré) et de `x25519.ts` (mauvaise clé privée destinataire). Cette exigence s'étend à tout code futur qui consomme ces enveloppes côté `control-plane` : un parseur d'enveloppe malformée reçue depuis un client ne doit jamais paniquer un processus serveur (niveau « Propriété / fuzzing » ci-dessus).

### Rotation des clés

La révocation renforcée (design V1 §4.4) repose sur le ré-enveloppement de la Vault Key et le rechiffrement des DEK. Le test de non-régression associé doit prouver concrètement, pas seulement affirmer, que **l'ancien détenteur ne peut plus déchiffrer** les données après rotation : générer une paire de clés, chiffrer, révoquer/faire tourner, puis vérifier que la tentative de déchiffrement avec l'ancienne clé échoue explicitement. `docs/DEFINITION_OF_DONE.md` l'exige déjà comme item spécifique (« test de non-régression sur révocation, rotation ou récupération ») pour les modules vault/recovery/policy/proof/identity/extension.

### Fixtures cross-langage

Le protocole de preuve (design V1 §4.5) est calculé indépendamment côté TypeScript (signature client) et côté Go (vérification serveur). La garantie que les deux implémentations produisent des octets identiques ne doit pas être assumée : elle sera **prouvée par une fixture committée**, générée côté TypeScript et vérifiée côté Go, de sorte qu'un changement cassant cette parité échoue en CI plutôt que de dériver silencieusement en production.

Ce dispositif est **conçu et planifié, pas encore implémenté** : il est spécifié en détail dans le plan LOT 1 (`docs/superpowers/plans/2026-08-20-lot1-protocol-foundations.md`, Task 9), qui prévoit `testvectors/proof-event-fixture.json`, son script de génération dans `packages/kofra-protocol/` et sa vérification dans `control-plane/internal/proof/`. Aucun de ces fichiers n'existe à ce jour. La contrainte est néanmoins normative pour l'implémentation à venir : **la parité TS ↔ Go se démontre par fixture, elle ne se déclare pas.**

### Règle de revue

**Tout code touchant à la cryptographie sans test à vecteur connu correspondant est un motif de rejet en revue**, sans exception de délai ou d'urgence. Cette règle s'applique symétriquement au format (nouvelle version d'enveloppe sans test de compatibilité ascendante), au chemin d'échec (nouvelle primitive sans test de tamper) et à la rotation (nouveau mécanisme de révocation sans test prouvant l'incapacité de l'ancien détenteur à déchiffrer). Elle est le prolongement direct de `make test-crypto` (CLAUDE.md §3 : « vecteurs de test kofra-crypto — jamais de crypto non testée par vecteur ») et de la checklist renforcée de `docs/DEFINITION_OF_DONE.md` pour les modules sensibles.

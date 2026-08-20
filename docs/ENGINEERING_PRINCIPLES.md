# KOFRA — Principes d'ingénierie

Complète CLAUDE.md §2 (stack figée) : comment le code est écrit, au-delà du choix des outils. S'applique à tout LOT, quel que soit le composant.

## Pas de cryptographie improvisée, au quotidien

Toute primitive vient de Web Crypto API côté client, passe exclusivement par le wrapper unique `packages/kofra-crypto`, jamais réécrite ailleurs "pour ce cas précis". Un besoin non couvert s'ajoute au wrapper, testé par vecteurs — pas inliné en feature. Même discipline pour la récupération à seuil (design V1 §4.6) : bibliothèque auditée, jamais de Shamir maison même simplifié. Toute évolution de format (algorithme, version d'enveloppe, paramètres Argon2id) est versionnée explicitement (`kdf_version`, `algorithm_version`) et passe par une revue de sécurité indépendante avant déploiement — jamais introduite silencieusement dans un correctif.

## Frontières de module du monolithe modulaire

L'ADR 0004 découpe le control plane en domaines (`identity`, `vault`, `access`, `policy`, `proof`, `notification`, `audit`, `platform`) qui communiquent par interfaces internes explicites, jamais par accès direct aux tables d'un autre domaine. Cette discipline rend une extraction future en service possible sans réécriture, et garantit que `proof` (append-only, hash-chained) n'est jamais mutée depuis `audit` par un raccourci de requête. En revue : une requête `sqlc` dans `internal/access` qui referme `proof_events` est un motif de rejet immédiat, même correcte — un appel inter-domaine passe par une fonction exportée du module cible, pas par une jointure directe. Un reviewer qui laisse passer une première violation en autorise dix autres par imitation.

## SQL explicite et revu, pas d'ORM

L'ADR 0002 choisit `sqlc` parce qu'un produit qui manipule ciphertexts, enveloppes de clés et RLS a besoin du contrôle total de la requête réellement exécutée — pas d'une abstraction qui génère un `SELECT *` ou un JOIN invisible en revue. Chaque requête vit dans `control-plane/db/queries/`, en clair, versionnée. En revue : une requête qui sélectionne des colonnes de ciphertext ou de secret non nécessaires à l'usage se corrige, ne se laisse pas passer parce que "ça ne coûte rien" — la requête documente l'intention exacte de l'accès.

## Moindre privilège dans le code

Le moindre privilège du manifeste (mandat limité par utilisateur, équipe, client, portail, durée, validation) descend au code :

- **DB** : un rôle applicatif PostgreSQL n'a que les privilèges nécessaires à son usage (le worker River n'a pas les droits de l'API si leurs responsabilités diffèrent) ; toute RLS sur un domaine sensible est testée hors contexte superutilisateur, faute de quoi un garde peut sembler actif sans plus rien filtrer.
- **CI** : chaque workflow GitHub Actions ne reçoit que les scopes nécessaires à sa tâche ; un secret n'est jamais partagé entre workflows qui n'en ont pas l'usage.
- **API** : chaque endpoint OpenAPI vise le mandat le plus restrictif qui satisfait le cas d'usage — jamais un scope large "au cas où".

## Aucun secret dans les logs, erreurs, fixtures

Invariant systématique (CLAUDE.md §4), vérifié à trois endroits à chaque LOT : (1) messages d'erreur — jamais la valeur d'un champ sensible, seulement identifiant et contexte ; (2) fixtures de test — jamais un secret ou ciphertext réel même anonymisé, toujours généré pour le test, y compris pour les vecteurs cryptographiques ; (3) observabilité — un champ marqué sensible dans `kofra-contracts` est explicitement exclu de l'instrumentation automatique, jamais laissé au comportement par défaut d'un outil de tracing.

## TDD et vecteurs de test connus pour tout code cryptographique

`make test-crypto` existe pour ça : aucune ligne touchant `packages/kofra-crypto` n'est acceptée sans vecteurs connus (RFC, suites officielles, ou vecteurs figés à l'implémentation). Le vecteur s'écrit avant l'implémentation, pas après — sinon un test calé sur le comportement observé ne détecte jamais une dérive de paramètres (taille de nonce, mode AEAD, itérations Argon2id). Même exigence pour `internal/proof` : un vecteur figé pour l'encodage canonique et le calcul de hash, jamais recalculé a posteriori sur le comportement actuel du code.

## Dette technique face à la pression commerciale

KOFRA cartographie le chantier global avant d'exécuter — jamais de correctif partiel livré avec le reste implicitement reporté sans plan écrit. Face à une pression commerciale, la réponse n'est pas de raccourcir un LOT en silence : c'est de rendre visible, dans le plan du LOT, ce qui est fait maintenant et ce qui est différé, avec la raison et le risque. Une dette acceptée est une dette écrite — un TODO isolé ne suffit pas pour un sujet structurant, il faut une entrée traçable (issue, section du plan, ou exception documentée comme pour la CI §5 de CLAUDE.md). Une dette qui touche un invariant de sécurité n'est jamais un simple compromis de vélocité : elle suit le chemin d'arrêt et de remontée de `docs/PRODUCT_PRINCIPLES.md`, pas le chemin normal de la dette fonctionnelle.

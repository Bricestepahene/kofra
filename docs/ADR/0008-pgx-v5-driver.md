# ADR 0008 — `pgx/v5` natif comme driver PostgreSQL du control plane

- **Statut** : accepté
- **Date** : 2026-08-20
- **Décision de référence** : D2 (`docs/DECISIONS_NEEDED.md`)

## Contexte

L'ADR 0002 fixe PostgreSQL comme unique source transactionnelle, `sqlc` pour le SQL explicite typé et River pour les jobs, avec une règle non négociable : **toute mutation métier qui exige une action asynchrone insère son job River dans la même transaction PostgreSQL que la mutation**. Aucun document n'avait jusqu'ici choisi le driver Go qui porte cette transaction.

Ce choix n'est pas un détail d'implémentation : il détermine la signature de tous les repositories, la configuration de `sqlc`, et la manière dont un handle de transaction est passé à River. Le changer après coup implique de réécrire chaque accès aux données.

## Décision

Le control plane utilise **`pgx/v5` en mode natif** (`pgxpool`, `pgx.Tx`), **pas** l'abstraction `database/sql` de la bibliothèque standard.

## Alternatives considérées

- **`database/sql` + `pgx` en mode `stdlib`** — écarté. Cette voie n'apporte de valeur que si l'on veut pouvoir changer de moteur de base de données ; or l'ADR 0002 a déjà tranché l'inverse : PostgreSQL n'est pas un backend interchangeable pour KOFRA, c'est la source de vérité et le substrat de la queue. Payer le coût d'une abstraction portable (types réduits au plus petit dénominateur commun, adaptateur supplémentaire entre le handle de transaction et River) pour une portabilité explicitement non recherchée est un mauvais échange. S'y ajoute une friction concrète : le driver de référence de River est `riverpgxv5`, qui attend un `pgx.Tx` — passer par `database/sql` ajoute une couche de conversion précisément à l'endroit où l'invariant transactionnel d'ADR 0002 doit rester lisible et vérifiable.

## Conséquences

- Toute signature de repository accepte un type `pgx` (`pgx.Tx` ou une interface qui l'abstrait localement), jamais `*sql.DB`/`*sql.Tx`.
- Lorsque `sqlc` sera introduit (Lot A, cf. D6), il sera configuré pour émettre du code `pgx/v5`, pas `database/sql`.
- Les tests d'intégration s'exécutent contre un vrai PostgreSQL (`docs/TESTING_STRATEGY.md`, niveau « Intégration DB »), jamais contre un mock de `database/sql` — ce qui est de toute façon la seule manière de tester la RLS honnêtement.
- Le couplage à PostgreSQL devient explicite dans le code, pas seulement dans la documentation. C'est un effet recherché : une dépendance assumée et visible vaut mieux qu'une abstraction qui laisse croire à une portabilité que personne ne teste.

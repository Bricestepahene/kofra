# ADR 0010 — Propriété des migrations : `golang-migrate` pour l'applicatif, River pour les siennes

- **Statut** : accepté
- **Date** : 2026-08-20
- **Décision de référence** : D5 (`docs/DECISIONS_NEEDED.md`)

## Contexte

L'ADR 0002 impose `golang-migrate` pour les migrations, et River comme queue de jobs. Or River embarque **son propre système de migration** pour ses tables internes. Aucun document n'arbitrait la propriété : deux systèmes de migration allaient s'exécuter sur la même base sans frontière définie.

C'est une lacune bloquante pour le LOT 0 : sans arbitrage, la première tentative d'installation de River produit soit un schéma non versionné, soit une duplication de son DDL dans `golang-migrate`.

## Décision

- **River possède et applique ses propres migrations**, via son mécanisme natif. Son DDL interne n'est jamais recopié dans `control-plane/db/migrations/`.
- **`golang-migrate` possède les migrations applicatives**, et elles seules.
- Les deux sont invoqués depuis **un même point d'entrée opérationnel**, avec une séquence documentée et invariable :

```text
1. Migrations applicatives  (golang-migrate)
2. Migrations River         (mécanisme natif de River)
3. Vérification             (les deux jeux sont à jour)
```

L'étape 3 n'est pas décorative : c'est elle qui alimente la readiness de l'API (D7 — `readiness` = PostgreSQL joignable **et** migrations applicatives et River à jour).

## Alternatives considérées

- **Recopier les migrations internes de River dans `golang-migrate`** — écarté, et explicitement interdit. Copier le DDL d'une bibliothèque revient à en créer un fork silencieux : à la première montée de version de River, le schéma attendu par la bibliothèque et le schéma réellement appliqué divergent sans qu'aucun outil ne le signale. La panne se manifeste alors dans le pipeline de jobs — c'est-à-dire, pour KOFRA, dans les chemins de preuve, de notification et de révocation, que `docs/OBSERVABILITY.md` classe au niveau « alerte » et non « dashboard ».
- **Laisser chaque système être invoqué séparément par l'opérateur** — écarté. Deux commandes à lancer dans le bon ordre, sans point d'entrée unique, est une procédure qui échoue le jour où elle est exécutée sous pression (cf. `docs/RUNBOOKS/`).

## Conséquences

- Le point d'entrée opérationnel unique (cible `Makefile`) est livré par le LOT 0 ; il matérialise la séquence ci-dessus.
- **Le rollback n'est pas symétrique entre les deux jeux.** `docs/RUNBOOKS/rollback.md` doit distinguer explicitement un rollback de migration applicative d'un rollback de migration River — revenir en arrière sur le schéma de River sans redescendre la version de la bibliothèque est une incohérence, pas un rollback.
- Les migrations des deux jeux s'exécutent sous `kofra_migrator` (ADR 0009), jamais sous `kofra_app`.
- **Point à trancher au Lot A, à ne pas découvrir en production** : lorsque la RLS sera activée (D11), les tables internes de River ne portent pas d'`organization_id` et ne sont pas multi-tenant. Leur statut vis-à-vis de la RLS doit être décidé et écrit au moment de l'activation. Une RLS appliquée globalement sans exemption explicite casserait le worker silencieusement.

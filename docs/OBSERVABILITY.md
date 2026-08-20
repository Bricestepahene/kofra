# KOFRA — Stratégie d'observabilité

Ce document fixe comment KOFRA observe techniquement son control plane : logs, métriques, traces. Il opérationnalise EP-02.09 (socle local), EP-03.09 (audit technique, métriques, traces et logs sans secrets) et EP-10.07 (observabilité production, SLO, alerting, runbooks) du backlog. Il est délibérément séparé de la chaîne de preuve métier (`internal/proof`) — voir la section dédiée ci-dessous, qui est le point le plus important de ce document.

## Pile retenue en V1 (ADR 0012)

- **Journalisation** : `log/slog` de la bibliothèque standard Go, avec un handler **JSON**. Aucune bibliothèque de log tierce — un composant qui voit passer toutes les structures de l'application ne doit pas ajouter de surface de dépendance à auditer.
- **Traces** : une **fondation OpenTelemetry** (instrumentation, propagation de l'ID de corrélation) est posée dès la V1, **sans aucun exporteur SaaS distant**.
- **Aucune donnée de télémétrie ne quitte l'infrastructure KOFRA en V1.** Introduire un exporteur distant, quel qu'il soit, exige une nouvelle ADR et une revue explicite au regard de `docs/DATA_CLASSIFICATION.md` — ce n'est pas une décision de configuration. Le motif est direct : un payload d'erreur qui contiendrait accidentellement un champ sensible quitterait le périmètre KOFRA, et la règle ci-dessous veut précisément qu'un champ non classifié soit traité comme sensible par défaut.
- Le choix d'un collecteur OpenTelemetry **auto-hébergé** reste ouvert et relève de l'exploitation (P10), pas de la V1 applicative.

## Logs structurés sans secret

Tous les logs de `control-plane/` sont structurés (JSON via `slog`), jamais en texte libre non parsable. L'invariant CLAUDE.md §4 s'applique sans exception : **aucun secret, clé privée, mot de passe ou ciphertext n'apparaît jamais dans un log, un message d'erreur ou un outil de support** — pas même en `DEBUG`, pas même « temporairement pour investiguer ».

Ceci n'est pas une convention laissée au jugement individuel : EP-03.09 exige un **test automatisé qui vérifie qu'aucun champ marqué sensible n'apparaît dans les logs applicatifs**. Ce test fait partie de la Définition de Done (`docs/DEFINITION_OF_DONE.md`) pour tout module qui journalise une structure contenant potentiellement un champ sensible (identifiants, tokens de session, ciphertexts, enveloppes de clé). Un champ ajouté à une structure existante sans être explicitement classifié (`docs/DATA_CLASSIFICATION.md`) est traité comme sensible par défaut jusqu'à preuve du contraire.

## Métriques

Chaque domaine `internal/*` (identity, vault, access, policy, proof, notification, audit — ADR 0004) expose des métriques de base :

- **Latence** par endpoint et par domaine (p50/p95/p99), pas seulement une moyenne globale qui masque les cas dégradés.
- **Taux d'erreur** par domaine et par classe d'erreur (validation, autorisation refusée, échec technique) — une politique qui refuse légitimement un mandat expiré n'est pas une « erreur » au même sens qu'une panne de base de données, et les deux ne doivent pas être confondues dans un même compteur.
- **Volumétrie des jobs River** (créés, traités, échoués, en retard) — un job orphelin ou en échec silencieux dans le pipeline preuve/notification est un risque de sécurité opérationnelle, pas seulement un souci de performance (ADR 0002).

Ces métriques sont la base d'EP-10.07 (SLO et alerting production) : elles doivent exister en V1 même sans SLO formalisé, pour qu'un SLO ait des données à mesurer le jour où il est défini.

## Traces et corrélation par requête

Chaque requête HTTP entrant dans `control-plane/` porte un **ID de corrélation** (EP-03.06 : « squelette HTTP, erreurs standardisées et corrélation »), généré à l'entrée si absent, propagé dans tous les logs émis pendant le traitement de cette requête, et retourné au client (en-tête de réponse) pour permettre de relier un incident signalé côté `web/` ou `extension/` à sa trace côté serveur. La fondation OpenTelemetry posée en V1 (ADR 0012) s'appuie sur **cet** identifiant plutôt que d'en introduire un second — un seul identifiant de corrélation par requête, jamais deux systèmes concurrents.

Cet identifiant ne doit pas être devinable au point de servir d'oracle, et la réponse d'erreur qui le porte ne divulgue **ni version, ni dépendance, ni détail d'implémentation** (`docs/DATA_CLASSIFICATION.md`, niveau Interne). La même règle vaut pour les endpoints `health` et `readiness` (D7).

## Ce qui déclenche une alerte vs ce qui reste dans un dashboard

Tout n'a pas vocation à réveiller quelqu'un. La distinction :

- **Alerte** (notification active, astreinte) : taux d'erreur anormal sur un domaine sensible (`identity`, `vault`, `access`, `proof`), job River en échec répété sur le pipeline de preuve ou de révocation, chaîne de preuve dont la vérification d'intégrité échoue, latence dégradée au point de menacer un SLO déclaré (EP-10.07). Un runbook existe pour chaque scénario d'incident identifié dans le modèle de menace (EP-10.06/EP-10.07) — une alerte sans runbook associé est une alerte incomplète.
- **Dashboard uniquement** (visible, pas notifié) : latence normale mais en dérive lente, volumétrie d'usage, taux d'erreur MEDIUM/LOW isolé et non répété, métriques d'adoption produit. Ces signaux servent à la revue périodique, pas à l'astreinte.

Le critère de bascule d'un signal du dashboard vers l'alerte n'est jamais « ça semblait important » a posteriori : il est décidé et documenté au moment où le SLO correspondant est défini (EP-10.07), pas improvisé pendant un incident.

## Séparation stricte : observabilité technique vs chaîne de preuve

C'est l'invariant le plus important de ce document, et il est structurel, pas conventionnel — au même titre que la séparation `audit`/`proof` d'ADR 0004 :

- **L'observabilité technique** (ce document) sert le **débogage opérationnel** : comprendre pourquoi une requête a été lente, pourquoi un job a échoué, où est la panne. Elle a une durée de rétention courte à moyenne (rotation des logs, rétention des métriques sur des semaines ou mois), elle peut être échantillonnée, elle peut perdre en granularité avec le temps, et elle n'a **aucune garantie d'intégrité cryptographique** — un log applicatif peut en théorie être altéré ou perdu sans que cela constitue une faille du produit.
- **La chaîne de preuve** (`internal/proof`, design V1 §4.5) sert l'**audit métier et la responsabilité professionnelle** d'un cabinet d'expertise comptable : elle est append-only, hash-chained, potentiellement signée (Ed25519) pour les événements de consentement, et n'a **pas de durée de vie limitée** par défaut — c'est la preuve qu'une action a eu lieu sous une politique donnée, opposable dans le temps.

Ces deux systèmes ne doivent **jamais être confondus** :

- Un événement de preuve n'est jamais reconstruit ou déduit à partir de logs techniques — il est écrit explicitement, dans la même transaction que la mutation métier qu'il documente (ADR 0002).
- Un log technique n'est jamais utilisé comme substitut de preuve dans un contexte d'audit métier, même s'il contient une information qui semble équivalente — il n'a pas les garanties d'intégrité et de non-répudiation que la chaîne de preuve fournit par construction.
- `internal/audit` (lecture/export de preuve) n'écrit jamais dans la chaîne de preuve, et l'observabilité technique n'a aucun accès en écriture à `internal/proof` — les deux pipelines restent architecturalement disjoints, pas seulement disjoints par convention d'usage.

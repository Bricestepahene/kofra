# KOFRA — Sauvegarde et restauration

Ce document fixe la politique de sauvegarde de KOFRA et, surtout, l'exigence de restauration testée. Il répond à EP-03.10 (sauvegarde/restauration locale testée), EP-10.03 (sauvegardes production chiffrées) et EP-10.08 (exercice de reprise après sinistre) du backlog. Le détail opérationnel pas-à-pas vit dans `RUNBOOKS/restore-database.md` (à écrire séparément) — ce document ne fixe que la politique et les exigences de vérification.

## Ce qui est sauvegardé

PostgreSQL est la source transactionnelle unique de KOFRA (ADR 0002) : toutes les tables listées au §4.3 du design V1 (`organizations`, `users`, `vaults`, `vault_key_envelopes`, `vault_data_keys`, `secrets`, `mandates`, `policies`, `proof_events`, `recovery_groups`, etc.) vivent dans une seule base. Sauvegarder PostgreSQL sauvegarde donc l'intégralité de l'état persistant de KOFRA — métadonnées, enveloppes de clés et ciphertexts inclus. Il n'existe pas de magasin de données secondaire à sauvegarder séparément en V1 (pas de Redis, cf. ADR 0002).

### Fréquence par environnement

| Environnement | Fréquence | Rétention |
|---|---|---|
| Production | Sauvegarde continue (WAL archiving) + snapshot complet quotidien | 30 jours glissants minimum, ajustable par ADR de déploiement (§8 design V1) |
| Staging | Snapshot quotidien | 7 jours glissants |
| Développement local | À la demande, non centralisé | Aucune exigence — l'environnement local ne contient jamais de données client réelles |

Les valeurs de production ci-dessus sont un plancher non négociable, pas un objectif. Le fournisseur d'hébergement retenu par l'ADR de déploiement (§8 : infra isolée de SynkriaOps, critère explicite "sauvegardes, restauration testée") doit les satisfaire ou les dépasser.

## Chiffrement

Les sauvegardes contiennent des ciphertexts et des enveloppes de clés — jamais de secret en clair, par construction du modèle zero-knowledge (§4.1 design V1). Cela ne dispense pas de chiffrer la sauvegarde elle-même : une fuite de sauvegarde non chiffrée exposerait des métadonnées Sensibles (structure des mandats, qui a accès à quel coffre — cf. `docs/DATA_CLASSIFICATION.md`) et faciliterait une attaque ciblée même sans casser le chiffrement applicatif.

- **Au repos** : chiffrement systématique du stockage de sauvegarde (chiffrement au niveau du fournisseur ou chiffrement applicatif de l'archive avant upload — le choix exact est tranché par l'ADR de déploiement).
- **En transit** : TLS strict entre la base et la destination de sauvegarde, aucune exception.
- Les clés de chiffrement des sauvegardes sont gérées séparément des identifiants applicatifs (principe de moindre privilège, EP-00.02) — un accès à l'application ne doit pas suffire à déchiffrer une archive de sauvegarde.

## La sauvegarde n'existe que si sa restauration est testée

**Une sauvegarde non testée n'est pas une sauvegarde.** Un fichier de sauvegarde qui n'a jamais été restauré avec succès est une hypothèse, pas une garantie — corruption silencieuse, format incompatible, credentials expirés ou script cassé ne se découvrent qu'au moment de la restauration, c'est-à-dire trop tard si ce moment est un vrai sinistre.

- **EP-03.10 (fondation, avant toute mise en production)** : restauration locale testée dans un environnement propre, avec vérification que les données restaurées sont identiques à la source. Ce test doit réussir avant que le premier environnement de production ne soit déployé (EP-10.03 en dépend).
- **EP-10.03 (production)** : la sauvegarde de production doit avoir été restaurée avec succès au moins une fois avant le pilote fermé (release gate: Pilot).
- **EP-10.08 (exercice de reprise après sinistre)** : exercice complet de bout en bout sur l'environnement de production isolé, exécuté avant le pilote fermé et répété à intervalle régulier ensuite (au minimum avant chaque changement majeur d'infrastructure, et sinon au moins une fois par trimestre une fois en production).

Chaque test de restauration, quel que soit l'environnement, doit être documenté avec au minimum :

- Date et environnement source/cible.
- Durée de restauration mesurée (temps entre déclenchement et base opérationnelle).
- Méthode de vérification d'intégrité utilisée et son résultat (ex. comparaison de checksums ou de comptages de lignes par table).
- Écarts constatés et actions correctives, le cas échéant.

L'absence de ce journal pour un environnement de production est en soi un signal d'alerte — cf. CLAUDE.md §0 : ne pas passer un release gate mécaniquement si ce test n'a pas eu lieu.

## Sauvegarde serveur vs récupération de clé côté client : deux mécanismes distincts

Il ne faut jamais confondre ces deux protections, qui répondent à deux pertes différentes :

| | Sauvegarde PostgreSQL (ce document) | Récupération multi-administrateur (§4.6 design V1) |
|---|---|---|
| Protège contre | La perte ou corruption de l'état côté serveur (métadonnées, ciphertexts, enveloppes) | La perte de la clé côté utilisateur (mot de passe oublié, appareil perdu) |
| Déclenchée par | KOFRA (infrastructure) | L'organisation cliente (seuil d'administrateurs, ex. 2/3) |
| Restaure | La base de données dans son état antérieur | L'accès d'un utilisateur à son coffre, sans jamais passer par KOFRA comme détenteur de la clé |
| Sans l'autre mécanisme | Une base restaurée sans les bonnes clés côté client reste illisible pour l'utilisateur qui a perdu sa clé | Une récupération de clé réussie ne sert à rien si la base sous-jacente a disparu |

Les deux sont nécessaires et ne se substituent pas l'une à l'autre : la sauvegarde protège KOFRA contre lui-même (perte d'infrastructure), la récupération à seuil protège le client contre lui-même (perte de clé) sans jamais faire de KOFRA un tiers de confiance capable de déchiffrer seul un coffre (§4.6 : "KOFRA ne détient jamais, seule, une part suffisante pour reconstruire une clé").

## Procédure de restauration — résumé

Le détail opérationnel (commandes, accès requis, ordre des étapes, checklist de vérification) est documenté dans `RUNBOOKS/restore-database.md`, à écrire séparément et tenu à jour après chaque exercice EP-10.08. Ce document ne fixe que la politique : toute restauration en production doit être déclenchée par une personne habilitée (cf. matrice d'accès EP-00.02), génère un événement documenté (cause, durée, résultat) et fait l'objet d'une vérification d'intégrité avant réouverture du service aux cabinets.

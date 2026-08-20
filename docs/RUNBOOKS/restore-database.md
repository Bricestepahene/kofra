# Runbook — Restauration de base de données

> Ce runbook sera complété avec les commandes réelles quand EP-03.10 (sauvegarde/restauration locale testée) et EP-10.03/EP-10.08 (sauvegardes et exercice de reprise après sinistre en production) seront livrés — la procédure et les principes ci-dessous sont déjà normatifs.

Politique de référence : `docs/BACKUP_AND_RECOVERY.md`. Ce runbook est le pas-à-pas opérationnel ; il ne redéfinit pas la politique (fréquence, rétention, chiffrement), il l'exécute.

## État actuel

- **Local** : EP-03.10 (restauration locale testée) n'est pas encore livré. Aucune procédure de sauvegarde automatisée n'existe pour la base PostgreSQL locale de développement (`docker-up`) — normal, `docs/BACKUP_AND_RECOVERY.md` le confirme : l'environnement local "ne contient jamais de données client réelles" et n'a aucune exigence de sauvegarde.
- **Production** : n'existe pas encore (programme P10). EP-10.03 livrera les sauvegardes chiffrées, EP-10.08 l'exercice de reprise après sinistre complet.

## Principe non négociable : jamais de restauration directe en production

Quel que soit l'environnement cible, une restauration ne s'exécute **jamais** directement sur la base de production en écrasement. La séquence est toujours :

1. Identifier le point de restauration (sauvegarde ou point-in-time visé, cause de la restauration).
2. Restaurer dans un environnement **isolé** (base éphémère, staging dédié — jamais la production elle-même tant que l'intégrité n'est pas vérifiée).
3. Vérifier l'intégrité des données restaurées dans cet environnement isolé.
4. Seulement après vérification positive, basculer le service vers les données restaurées (ou rejouer la restauration vers la cible finale par le même mécanisme validé).
5. Documenter la durée totale (déclenchement → base opérationnelle) et la méthode de vérification utilisée.

Cette séquence s'applique identiquement en local (test EP-03.10) et en production (EP-10.03/10.08) — seule l'échelle change, pas la discipline.

## Procédure attendue — test local (EP-03.10)

1. Produire une sauvegarde de la base locale avec l'outillage PostgreSQL standard (`pg_dump`), une fois la base de schéma KOFRA en place (`make migrate-up`).
2. Restaurer cette sauvegarde dans une base PostgreSQL locale distincte (nouveau conteneur ou nouvelle base, jamais en écrasant la base de développement courante sans le vouloir explicitement).
3. Vérifier l'intégrité : comparaison de comptages de lignes par table entre source et cible au minimum, checksums si disponibles.
4. Mesurer et noter la durée de restauration.
5. Documenter le résultat selon le format exigé par `docs/BACKUP_AND_RECOVERY.md` (date, environnement, durée, méthode de vérification, écarts constatés).
6. Le script et les commandes exactes (probablement encapsulés dans une cible `make` dédiée) seront ajoutés ici au moment où EP-03.10 sera implémenté — ne pas anticiper un nom de cible qui n'existe pas dans le `Makefile`.

## Procédure attendue — production (EP-10.03 / EP-10.08)

1. Identifier le point de restauration en fonction de la cause (corruption, erreur opérationnelle, sinistre) et de la politique de rétention (`docs/BACKUP_AND_RECOVERY.md` — 30 jours glissants minimum pour la production).
2. Restaurer vers un environnement de production isolé, distinct de l'environnement servant le trafic réel, en utilisant le mécanisme retenu par l'ADR de déploiement (EP-10.01).
3. Vérifier l'intégrité (comptages, checksums, cohérence de la chaîne de preuve `proof_events` — vérifier qu'aucun `sequence_number` n'est manquant ni de hash brisé, cf. design V1 §4.5).
4. Basculer le trafic seulement après validation, avec autorisation d'une personne habilitée (matrice d'accès EP-00.02).
5. Consigner l'événement (cause, durée mesurée, résultat) — cet exercice complet, répété au moins une fois avant le pilote fermé puis trimestriellement, est l'objet même d'EP-10.08.
6. Ne jamais restaurer en production sans avoir d'abord notifié selon la procédure de `docs/RUNBOOKS/security-incident.md` si la cause de la restauration est elle-même un incident de sécurité.

## Ce que la restauration ne remplace jamais

La restauration de base PostgreSQL ne restaure pas l'accès d'un utilisateur qui a perdu sa propre clé — ce sont deux mécanismes distincts (`docs/BACKUP_AND_RECOVERY.md`, section dédiée ; design V1 §4.6, récupération multi-administrateur à seuil). Une base restaurée sans que l'utilisateur récupère sa clé côté client reste illisible pour lui. Pour ce second cas, voir `docs/RUNBOOKS/key-compromise.md`.

## Références

- `docs/BACKUP_AND_RECOVERY.md` — politique complète.
- `docs/execution/kofra-v1-backlog.yaml` — EP-03.10, EP-10.03, EP-10.08.
- `docs/superpowers/specs/2026-08-20-kofra-v1-design.md` §4.5 (chaîne de preuve), §4.6 (récupération).

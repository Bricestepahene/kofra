# KOFRA — Réponse aux incidents

Ce document fixe la classification de sévérité, les rôles, l'isolation, la communication et la procédure post-incident de KOFRA. Il répond à EP-10.10 du backlog (gestion d'incident et statut public) et s'articule avec `docs/execution/kofra-v1-backlog.yaml` EP-00.02 (gouvernance de sécurité et rôles) et EP-00.05 (`docs/VULNERABILITY_DISCLOSURE.md`, à écrire séparément). Le détail opérationnel pas-à-pas vit dans `RUNBOOKS/security-incident.md` et `RUNBOOKS/key-compromise.md` (à écrire séparément) — ce document ne fixe que la politique.

## Classification de sévérité

| Sévérité | Définition | Exemples KOFRA | Délai de première réponse |
|---|---|---|---|
| **SEV1** | Secrets potentiellement exposés ou compromission active | Fuite suspectée de ciphertexts + clés associées, accès non autorisé constaté à `encrypted_private_key_bundles` ou `vault_key_envelopes`, compromission d'un compte avec droits d'administration infra, preuve d'exfiltration | Immédiat — investigation démarrée en moins de 30 minutes après détection ou signalement, 24/7 |
| **SEV2** | Dégradation de service sans exposition de secret | Panne API, chaîne de preuve (`internal/proof`) temporairement indisponible en écriture, dégradation de performance affectant plusieurs cabinets | Sous 4 heures ouvrées |
| **SEV3** | Anomalie mineure | Bug d'affichage, dégradation isolée à un seul utilisateur sans impact sécurité, faux positif d'alerte | Sous 2 jours ouvrés |

En cas de doute sur la sévérité, classer au niveau le plus élevé plausible et déclasser après investigation — jamais l'inverse. Toute ambiguïté impliquant un secret ou une clé (Secret ou Sensible au sens de `docs/DATA_CLASSIFICATION.md`) est traitée comme SEV1 par défaut tant que l'absence d'exposition n'est pas démontrée.

## Rôles pendant un incident

L'équipe KOFRA est aujourd'hui une seule personne (Brice, fondateur), qui cumule tous les rôles ci-dessous. Ces rôles sont néanmoins définis dès maintenant pour que la croissance de l'équipe (EP-00.02) ne fasse pas de la réponse à incident un angle mort découvert en pleine crise.

- **Décideur incident (Incident Commander)** : décide de la sévérité, du déclenchement de l'isolation, de la communication externe et du moment de clôture. Un seul décideur à la fois, explicitement désigné dès l'ouverture de l'incident.
- **Communicant** : rédige et envoie les communications aux cabinets affectés et, si nécessaire, la communication publique. Ne parle jamais au nom de KOFRA sans validation du décideur pour un SEV1.
- **Opérateur technique** : exécute les actions d'isolation, de révocation et de restauration (suit les runbooks). Peut être la même personne que le décideur en petite équipe, mais les deux fonctions restent distinctes dans la procédure pour permettre leur séparation dès que l'équipe grandit.
- **Scribe** : consigne la chronologie de l'incident (détection, actions, décisions, horodatages) au fur et à mesure — jamais reconstitué a posteriori de mémoire. Sert de base au post-mortem.

Tant que l'équipe est réduite à une personne, ces rôles sont assumés séquentiellement mais doivent rester traçables séparément dans le journal d'incident (qui a décidé quoi, quand).

## Isolation immédiate

L'action d'isolation dépend du type d'incident, et doit toujours privilégier l'arrêt de la propagation avant l'investigation complète :

- **Compromission d'un compte utilisateur ou administrateur** : révocation immédiate de niveau **critique** (§4.4 design V1 — pas seulement logique) : blocage de session/appareil, rotation de la clé de coffre concernée, et déclenchement d'une alerte de rotation des identifiants sur les portails externes potentiellement exposés. Ne jamais se contenter d'une révocation logique en présumant qu'elle suffit pour un SEV1.
- **Compromission d'un composant infrastructure** (control plane, base, worker) : isolement réseau du composant affecté, rotation des identifiants d'infrastructure (jamais des clés utilisateur, que KOFRA ne détient de toute façon jamais en clair), gel des déploiements jusqu'à investigation.
- **Suspicion de faille dans le protocole cryptographique lui-même** (`packages/kofra-crypto`, hiérarchie de clés §4.2, chaîne de preuve §4.5) : gel immédiat de toute évolution du protocole, escalade obligatoire vers une revue de sécurité indépendante avant toute correction déployée — jamais de correctif crypto "à chaud" sans revue (cf. CLAUDE.md §0).
- **Extension navigateur** : possibilité de forcer une mise à jour ou une désactivation à distance si un incident implique un remplissage de champ non autorisé ou un contournement d'authentification tierce (cf. invariant ADR 0005).

## Préservation des preuves

Avant toute action corrective qui modifierait l'état du système, capturer l'état nécessaire à l'investigation : logs au moment de la détection, requêtes en cours, état des sessions actives, dernier `sequence_number` connu de la chaîne de preuve concernée. `internal/proof` est append-only et hash-chained par construction (CLAUDE.md §4) — un incident ne doit jamais être l'occasion d'y écrire, corriger ou purger un événement, y compris un événement qui documenterait une action malveillante. La chaîne de preuve reste la source de vérité de ce qui s'est passé, y compris pendant l'incident lui-même ; `internal/audit` (lecture/export) ne doit jamais être utilisé pour masquer ou reformuler un événement existant.

## Communication

- **Aux cabinets affectés** : communication directe dès que la sévérité et l'impact sont raisonnablement établis (ne pas attendre la clôture complète pour un SEV1 ou SEV2 avec impact confirmé). Le contenu reste honnête sur ce qui est su et ce qui reste incertain — cf. manifeste §"Limite de promesse" : ne jamais sur-promettre une protection ou une révocation.
- **Publique** : envisagée pour tout incident affectant la confiance générale dans la plateforme (SEV1 confirmé, ou SEV2 prolongé). S'appuie sur `docs/VULNERABILITY_DISCLOSURE.md` (EP-00.05, à écrire) pour le canal et les délais, et sur une future page de statut public (EP-10.10).
- Aucune communication externe, à un cabinet ou au public, ne doit contenir de donnée Secret ou Sensible au sens de `docs/DATA_CLASSIFICATION.md` — un rapport d'incident décrit la nature et l'impact, jamais le contenu des secrets concernés.

## Procédure post-incident

1. **Post-mortem sans blâme** : chronologie factuelle (issue du journal du scribe), cause racine, ce qui a fonctionné, ce qui a manqué. L'objectif est de corriger le système, pas de désigner un responsable.
2. **Mise à jour du modèle de menace** : si l'incident révèle un scénario ou un angle mort non couvert par `docs/SECURITY_THREAT_MODEL.md`, ce document est mis à jour avant clôture du post-mortem — pas différé.
3. **Mise à jour de ce document** : si la procédure elle-même a montré une lacune (délai irréaliste, rôle manquant, étape d'isolation absente), `docs/INCIDENT_RESPONSE.md` est corrigé dans la foulée, pas dans un futur indéterminé.
4. **Exercice tabletop régulier** : conformément à EP-10.10, cette procédure doit être testée par un exercice simulé avant le pilote fermé, pas seulement rédigée — une procédure jamais répétée en simulation est aussi peu fiable qu'une sauvegarde jamais restaurée (cf. `docs/BACKUP_AND_RECOVERY.md`).

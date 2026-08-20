# Runbook — Incident de sécurité (procédure générale)

> Les actions d'isolation et de notification en environnement de production seront complétées avec les outils réels quand EP-10.10 (gestion d'incident, statut public) et EP-10.07 (observabilité production) seront livrés — la procédure et les principes ci-dessous sont déjà normatifs et s'appliquent dès aujourd'hui aux incidents touchant le dépôt, la CI, les dépendances ou tout secret de développement.

`docs/INCIDENT_RESPONSE.md` n'existe pas encore comme document de politique séparé (livré par EP-10.10) — en attendant, ce runbook s'appuie directement sur `docs/SECURITY_POLICY.md` et `docs/SECURITY_THREAT_MODEL.md` (scénarios de menace référencés) et fait foi comme pas-à-pas opérationnel. Ce runbook ne couvre pas la compromission spécifique d'une clé — voir `docs/RUNBOOKS/key-compromise.md`.

## 0. Ne pas paniquer, ne pas altérer les preuves

1. Ne pas éteindre, redémarrer ou "nettoyer" un système suspect avant d'avoir capturé son état — cela détruit des preuves.
2. Ne jamais écrire, modifier ou tenter de "corriger" un événement dans `internal/proof` : la chaîne est append-only et hash-chained par construction (CLAUDE.md §4) — toute correction s'y ajoute comme nouvel événement, jamais en réécriture.
3. Ne pas communiquer publiquement avant l'étape 4 (notification interne) — une annonce prématurée peut alerter un attaquant encore actif.

## 1. Isoler

Selon le type d'incident :

1. **Secret ou credential exposé dans le dépôt / CI** (ex. clé API, token committé) : révoquer immédiatement le secret à sa source (fournisseur du secret, pas seulement le supprimer du dépôt — un `git revert` ne retire rien de l'historique). Faire tourner ce secret partout où il est utilisé.
2. **Dépendance npm/Go compromise** (scénario 7 du modèle de menace) : geler les mises à jour de cette dépendance, identifier tous les composants qui l'utilisent (`pnpm why`, `go mod graph`), planifier son retrait ou son épinglage à une version saine.
3. **Poste ou compte de collaborateur compromis** (scénarios 2 et 4 du modèle de menace) : révoquer ses accès dépôt/CI/infra immédiatement (matrice d'accès EP-00.02), forcer la rotation de ses identifiants.
4. **Infrastructure de production compromise** (scénario 8) : procédure détaillée arrivera avec EP-10.10 — à ce stade, principe directeur : couper l'accès réseau au composant compromis sans détruire son état (snapshot avant toute action destructive), jamais de redéploiement en écrasement avant capture de preuve.

## 2. Notifier

1. Notifier Brice immédiatement (fondateur, validateur sécurité — CLAUDE.md §1), quel que soit l'horaire, pour tout incident touchant la confidentialité, l'intégrité ou la disponibilité d'un secret client.
2. Si l'incident affecte potentiellement des données de cabinets pilotes ou clients, préparer une communication externe conforme à `docs/VULNERABILITY_DISCLOSURE.md` (SLA de première réponse) sans l'envoyer avant validation de Brice.
3. Consigner l'heure de détection et l'heure de notification — ce délai fait partie du post-mortem.

## 3. Capturer l'état

1. Journaux applicatifs et infrastructure pertinents, exportés en lecture seule.
2. Historique Git (commits, branches, force-push éventuels).
3. Chaîne de preuve (`internal/proof`) : exporter en lecture via `internal/audit` (jamais d'écriture) pour vérifier l'intégrité de la séquence autour de la fenêtre de l'incident.
4. Horodater et signer (au sens documentaire) chaque élément capturé — chaîne de possession de la preuve.

## 4. Communiquer

1. Interne : statut régulier à Brice jusqu'à résolution.
2. Externe (si applicable) : suivre le canal et les délais de `docs/VULNERABILITY_DISCLOSURE.md`. Ne jamais sous-communiquer un niveau de révocation (CLAUDE.md §4 — distinction logique/renforcée/critique, design V1 §4.4) : dire précisément ce qui a été neutralisé, pas plus.

## 5. Post-mortem

1. Rédiger un post-mortem sans blâme : chronologie, cause racine, ce qui a limité ou aggravé l'impact, actions correctives datées.
2. Mettre à jour `docs/SECURITY_THREAT_MODEL.md` si un scénario nouveau ou mal couvert a été révélé.
3. Ajouter le piège découvert à `CLAUDE.md` §6 s'il est réutilisable pour l'équipe future.

## Références

- `docs/SECURITY_POLICY.md`, `docs/SECURITY_THREAT_MODEL.md`, `docs/VULNERABILITY_DISCLOSURE.md`.
- `docs/execution/kofra-v1-backlog.yaml` — EP-00.05, EP-10.10.
- `docs/RUNBOOKS/key-compromise.md` pour toute compromission de clé spécifique.

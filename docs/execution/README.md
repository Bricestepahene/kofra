# KOFRA — Exécution et suivi (GitHub Project)

Le calendrier GitHub (`KOFRA — Delivery System`) est une **projection** de `kofra-v1-backlog.yaml`, pas une source de vérité indépendante. Toute modification de programme, d'epic ou de dépendance se fait dans le YAML, jamais directement dans l'issue ou le Project — sinon la prochaine synchronisation écrase la modification ou crée une incohérence.

## Fichiers

- `kofra-v1-backlog.yaml` — 12 programmes, 107 epics, leurs dépendances et les 5 milestones. Éditable, versionné, revu comme du code.
- `../../scripts/sync-github-project.ts` — script idempotent qui crée/synchronise le Project, ses champs personnalisés et une issue par epic à partir du YAML.

## Prérequis avant toute exécution réelle

1. `gh auth status` doit montrer un token avec les scopes `repo` **et** `project`. Le token actuel n'a que `gist, read:org, repo` — exécuter `gh auth refresh -s project` (flux interactif navigateur) avant le premier `--apply`.
2. Node ≥ 20 et les dépendances racine installées (`pnpm install`).

## Utiliser le script

```bash
# Aperçu sans rien écrire sur GitHub (par défaut)
pnpm sync:github-project

# Création/synchronisation réelle
pnpm sync:github-project -- --apply

# Cibler un autre owner/repo/titre de projet si besoin
pnpm sync:github-project -- --apply --owner Bricestepahene --repo kofra --project-title "KOFRA — Delivery System"
```

Le script est idempotent : relancer avec `--apply` après avoir modifié le YAML met à jour les issues existantes (titre, corps, champs) sans en recréer, et n'ajoute que ce qui manque.

## Limite connue : les vues ne sont pas automatisables

L'API GitHub Projects v2 (et `gh project`) permet de créer un projet, des champs personnalisés, d'y ajouter des issues et de fixer leurs valeurs de champ — mais **ne permet pas de créer une vue sauvegardée** (groupement + filtre). Les 6 vues ci-dessous doivent être créées **une seule fois, à la main**, dans l'interface du Project, après le premier `--apply`. Le script garantit uniquement que les champs sur lesquels ces vues groupent/filtrent existent et sont renseignés.

| Vue | Configuration |
|---|---|
| Roadmap | Groupée par `Program`, filtrée sur `Status != Done` |
| Execution board | Colonnes = `Status`, filtrée sur le lot actif (`Lot = <lettre>`) |
| Security board | Filtrée sur `Security critical = Yes` |
| Dependency blockers | Filtrée sur `Status = Blocked` et `Risk in (Critical, High)` |
| Release readiness | Groupée par `Release gate` |
| Architecture/ADRs | Filtrée sur `Program in (P00, P01, P02)` |

## Rubrique d'estimation (comment les champs déduits ont été fixés)

Le YAML contient des champs que l'énoncé original ne fixait pas epic par epic : `risk`, `security_critical`, `release_gate`, `priority`, `size`. Plutôt que 107 décisions arbitraires non documentées, une rubrique cohérente a été appliquée par programme, avec des dérogations ciblées quand un epic spécifique le justifiait clairement :

- **priority** : P0 pour tout ce qui est sur le chemin critique (P01 à P07, P09, P10) ou qui bloque une décision de sortie (ex. EP-11.06 go/no-go). P1 pour P00, P08, P11 hors epics de lancement — travail important mais parallélisable ou séquencé après le cœur.
- **security_critical** : `Yes` dès qu'un epic touche la cryptographie, l'identité/MFA, l'autorisation/mandat, la preuve, l'extension navigateur, ou la sécurité de production. `No` pour le travail purement UI/design-system/i18n/onboarding qui ne manipule ni secret ni décision d'accès.
- **risk** : `Critical` pour les epics fondateurs dont une erreur casse tout ce qui en dépend (protocole crypto, RLS, moteur de politique, hash chain, pentest). `High` pour le reste du travail sécurité-critique. `Medium`/`Low` pour le travail parallélisable à faible rayon de blast.
- **release_gate** : dérivé du programme — `None` pour P00-P02 (gouvernance/outillage, pas un jalon livrable), `Alpha` pour P03-P07 (cœur backend testable en interne), `Pilot` pour P08-P10 et la majorité de P11 (interfaces client + durcissement production nécessaires ensemble pour un vrai pilote), `Beta`/`Production` pour les epics de lancement de fin de P11.
- **size** (S/M/L/XL, jours réels volontairement absents) : `S` = un seul sujet borné, surtout config/doc. `M` = un composant, complexité modérée. `L` = intégration transverse ou nouveau sous-système à plusieurs pièces mobiles. `XL` = travail fondateur à forte incertitude (bootstrap de sous-système, pentest + remédiation, exécution du pilote fermé).

Ce premier jet est éditable : si un `risk` ou une `priority` semble mal calibrée pour un epic précis, corriger directement dans le YAML et relancer le script — c'est le point même d'avoir une source de vérité versionnée plutôt que 107 champs saisis à la main dans l'UI GitHub.

## Règle de découpage en issues techniques

Ne pas transformer un epic en sous-tâches tant que son lot n'est pas actif. Quand un lot démarre, chaque epic concerné se découpe en 3 à 8 issues techniques d'un jour à moins de trois jours de travail, chacune avec cette définition de fini :

```text
- Code soumis en PR
- Tests requis verts
- Analyse sécurité verte ou exception documentée
- Migrations testées sur base vide et sur base existante
- Contrat OpenAPI mis à jour si nécessaire
- Aucun secret dans logs, erreurs ou fixtures
- Documentation/ADR mise à jour si une décision change
- Revue humaine effectuée
```

Ces issues techniques ne vivent pas dans le YAML (trop volatile pour rester une source de vérité versionnée) — elles se créent directement dans GitHub au moment du lot, liées à l'issue d'epic parente via `Depends on` ou une simple mention `#<numéro>`.

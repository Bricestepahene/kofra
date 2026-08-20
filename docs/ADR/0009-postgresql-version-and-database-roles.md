# ADR 0009 — Version PostgreSQL épinglée et séparation des rôles de base de données

- **Statut** : accepté
- **Date** : 2026-08-20
- **Décisions de référence** : D3 et D4 (`docs/DECISIONS_NEEDED.md`)

## Contexte

Deux lacunes réelles, relevées lors de l'analyse du LOT 0 :

1. **Aucun document ne fixait la version de PostgreSQL.** Go (`1.23.4`), pnpm (`9.15.0`) et Next.js (`15.x`) sont épinglés ; le moteur de base de données — dont dépendent le comportement de la RLS, la compatibilité de River et la reproductibilité des tests d'intégration — ne l'était nulle part.
2. **Les rôles de base de données n'étaient pas définis.** EP-03.03 exigeait « des rôles PostgreSQL distincts pour l'application vs les migrations » sans les nommer ni fixer leurs droits.

Ces deux sujets sont regroupés dans une seule ADR parce qu'ils décrivent le même substrat : la base sur laquelle tout le control plane s'exécute.

## Décision

### Version

**PostgreSQL 16.9** en développement, **épinglé à la fois par tag et par digest** dans `infra/docker/compose.dev.yml`. Toute montée de version **majeure** exige une nouvelle ADR ; une montée de version mineure (correctifs) est une mise à jour de dépendance ordinaire, soumise à `docs/DEPENDENCY_POLICY.md`.

### Rôles

Trois rôles distincts, aux responsabilités disjointes :

| Rôle | Usage | Droits |
|---|---|---|
| `kofra_owner` | Initialisation de l'infrastructure **uniquement** (création de la base, des rôles, des extensions) | Propriétaire de la base ; jamais utilisé par un processus applicatif ni par les migrations courantes |
| `kofra_migrator` | Migrations DDL (`golang-migrate`, et River pour les siennes — ADR 0010) | DDL sur le schéma applicatif ; pas de rôle d'exécution runtime |
| `kofra_app` | Runtime applicatif (`kofra-api`, `kofra-worker`) | DML uniquement sur les objets nécessaires ; **aucun droit DDL** |

**`kofra_app` n'est jamais superutilisateur, et n'a jamais l'attribut `BYPASSRLS`.**

## Alternatives considérées

- **Tag mobile (`postgres:16`) sans digest** — écarté. Un tag mobile signifie qu'un `docker pull` peut changer le moteur sous le pied du développeur ou de la CI sans qu'aucun commit ne le trace. C'est exactement la dérive silencieuse que le projet refuse ailleurs pour la toolchain Go et pour `golangci-lint` (D14).
- **Un rôle unique pour migrations et runtime** — écarté. Un runtime disposant de droits DDL peut altérer le schéma en dehors de toute migration versionnée, ce qui rend la réversibilité exigée par `docs/DEFINITION_OF_DONE.md` illusoire.
- **Deux rôles (migrator/app) sans `kofra_owner`** — écarté. Sans propriétaire distinct, le rôle de migration finit par cumuler la création de rôles et d'extensions, c'est-à-dire un privilège d'administration permanent là où il n'est nécessaire qu'une seule fois.

## Conséquences

- **La séparation des rôles est ce qui rend la RLS vérifiable.** Un superutilisateur contourne la RLS par construction : un test d'isolation exécuté sous un rôle privilégié passe au vert alors qu'il ne prouve rien. C'est un « faux vert » documenté et attendu — d'où l'obligation que les tests d'isolation (Lot A, cf. D11) s'exécutent sous `kofra_app`.
- Le digest épinglé implique qu'une mise à jour d'image est un commit explicite et relisible, jamais un effet de bord d'un `docker pull`.
- La même version majeure s'applique en local, en CI, en staging et en production. Un écart de version majeure entre environnements rendrait les tests d'intégration non représentatifs, notamment sur le comportement de la RLS.
- `docs/RUNBOOKS/local-development.md`, `docs/BACKUP_AND_RECOVERY.md` et `docs/RUNBOOKS/restore-database.md` doivent refléter cette version : une restauration testée sur une version différente de la production ne prouve pas ce qu'elle prétend prouver.

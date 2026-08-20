# Exceptions de sécurité

Ce répertoire contient les **exceptions de sécurité acceptées**, écrites, datées et révisables. Il est référencé par `CLAUDE.md` §5, `docs/SECURITY_POLICY.md`, `docs/DEPENDENCY_POLICY.md` et par le workflow `.github/workflows/security.yml`.

Une exception n'est **pas** un contournement du gate de sécurité : c'est la trace écrite d'un jugement qui a été porté, par quelqu'un, à une date donnée, et qui peut être relu et contesté plus tard. Un risque accepté sans écrit est un risque oublié.

## Quand une exception est-elle recevable ?

- **`CRITICAL` exploitable : jamais.** Aucune exception n'est possible (`CLAUDE.md` §5, `docs/SECURITY_POLICY.md`). Un CRITICAL se corrige ou bloque.
- **`HIGH`** : recevable lorsque le correctif n'existe pas encore en amont (typiquement une dépendance transitive), ou lorsque l'analyse démontre que le chemin vulnérable n'est pas atteignable dans KOFRA. Dans les deux cas, l'exception **doit** porter une date de réexamen.
- **Contrôle de plateforme non appliqué** : lorsqu'un contrôle prévu par la documentation n'est pas (ou pas encore) appliqué techniquement — exemple : les statuts CI pas encore requis pour fusionner, cf. `2026-08-20-statuts-ci-non-requis.md` — l'exception documente le processus de compensation qui en tient lieu, et l'action requise pour la lever.

Une exception ne se justifie **jamais** par le délai ou la commodité. `CLAUDE.md` §0 : la barre ne baisse jamais pour aller plus vite.

## Convention de nommage — importante pour la CI

Le job `npm-audit` de `.github/workflows/security.yml` recherche un fichier dont le **nom, sans extension**, correspond soit à l'**identifiant d'advisory**, soit au **nom du module** concerné. Une exception de dépendance mal nommée ne sera pas trouvée, et le HIGH bloquera malgré tout.

- Exception de dépendance : `<identifiant-advisory>.md` ou `<nom-du-module>.md`.
- Exception de processus ou de plateforme (non rattachée à un advisory) : `AAAA-MM-JJ-<sujet-en-kebab-case>.md`.

Ce `README.md` ne correspond volontairement à aucun advisory ni module ; sa présence sert aussi à ce que Git versionne ce répertoire, qui serait sinon absent d'un clone neuf (Git ne suit pas les répertoires vides) — et donc introuvable par la CI.

## Contenu attendu d'une exception

Chaque fichier indique, sans jargon inutile :

1. **Objet** — quel contrôle est contourné, ou quelle vulnérabilité est acceptée.
2. **Date** d'acceptation et **date de réexamen**.
3. **Portée** — quels composants, quels environnements.
4. **Analyse de risque** — pourquoi l'exposition réelle est acceptable, factuellement.
5. **Compensation** — ce qui est mis en place à la place du contrôle manquant.
6. **Condition de levée** — ce qui doit se produire pour que l'exception disparaisse.
7. **Qui accepte** — l'exception engage la validation de Brice (`docs/SECURITY_POLICY.md`, §Responsabilité).

Une exception dont la date de réexamen est dépassée est traitée comme **expirée** : elle ne couvre plus rien tant qu'elle n'a pas été explicitement reconduite.

## Exceptions actives

| Fichier | Objet | Réexamen |
|---|---|---|
| `2026-08-20-statuts-ci-non-requis.md` | Protection de `main` active, mais CI verte et revue CODEOWNERS pas encore exigées pour fusionner | 2026-09-20 |

**Levée le 2026-08-20** : `2026-08-20-protection-branche-main-non-appliquee.md` — le dépôt est passé public, la protection de branche a été activée, l'exception est devenue sans objet et a donc été **supprimée** plutôt que laissée en place. L'écart résiduel, plus étroit, est couvert par le fichier ci-dessus.

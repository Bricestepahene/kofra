# Contribuer à KOFRA

Ce document s'adresse à un contributeur humain — quelqu'un qui clone le dépôt, ouvre
une PR, en attend une revue. Si vous êtes un agent Claude Code travaillant sur ce
dépôt, la référence est `CLAUDE.md`, pas ce fichier : les deux ne se dupliquent pas
volontairement.

KOFRA gère des secrets qui n'appartiennent pas à KOFRA. Avant de contribuer, lisez au
moins `docs/MANIFESTO.md` (le positionnement) et `CLAUDE.md` §0 (la barre de sécurité,
qui ne baisse jamais).

## Cloner et lancer le projet

```bash
git clone https://github.com/Bricestepahene/kofra.git
cd kofra
cp .env.example .env   # renseigner localement, ne jamais committer de valeur réelle
pnpm install
```

Le dépôt est polyglotte : control plane en Go (`control-plane/`), interfaces
TypeScript (`web/`, `extension/`, `packages/*`), orchestrés par un `Makefile` racine
(`make dev`, `make build`, `make test`, `make lint` — voir `CLAUDE.md` §3 pour la
liste complète). Ces cibles s'implémentent au fil des lots : ne supposez pas qu'une
cible fonctionne avant de l'avoir vue exécuter quelque chose de réel dans le
`Makefile`. À date, le control plane Go n'est pas encore initialisé (`README.md`,
section "Statut").

Un guide de mise en route détaillé (base de données locale, variables d'environnement,
ordre de lancement des services) est prévu dans
`docs/RUNBOOKS/local-development.md` — pas encore rédigé. Tant qu'il n'existe pas,
le `Makefile` et `CLAUDE.md` §3 font foi.

Installez aussi les hooks pre-commit locaux (détection de secrets, formatage,
fichiers volumineux) :

```bash
pip install pre-commit
pre-commit install
```

Voir l'en-tête de `.pre-commit-config.yaml` pour le détail : c'est un filet local,
pas un remplacement de la CI de sécurité.

## Convention de commit

Aucune norme stricte n'est imposée à ce jour (pas de Conventional Commits obligatoire,
pas de linter de message de commit en CI). Ce qui est attendu : un message clair,
à l'impératif, qui explique le *pourquoi* du changement plutôt que de reformuler le
diff. Un commit atomique (un sujet, une intention) est préférable à un commit qui
mélange plusieurs changements sans rapport. Si cette section devient obsolète — une
norme est adoptée — `CLAUDE.md` sera mis à jour en premier, ce fichier ensuite.

## Processus de Pull Request

- La branche par défaut est protégée : tout changement passe par une PR, jamais par
  un push direct.
- La CI doit être verte avant fusion. Le pipeline de sécurité prévu
  (`.github/workflows/security.yml` — gosec, govulncheck, Trivy, CodeQL, npm audit,
  Dependency Review, SBOM, cf. `CLAUDE.md` §2 et §5) n'est pas encore en place dans
  ce dépôt ; une fois actif, un **CRITICAL** exploitable bloque la fusion sans
  exception, un **HIGH** doit être corrigé ou faire l'objet d'une exception écrite
  et datée dans `docs/security-exceptions/`.
- Revue obligatoire dès qu'il y a un second développeur actif sur le dépôt. En
  solo, l'auto-revue rigoureuse contre la Definition of Done (section suivante)
  tient lieu de garde-fou en attendant.
- Un gabarit de PR est prévu en `.github/pull_request_template.md` — pas encore
  créé. Tant qu'il n'existe pas, reprenez manuellement la checklist de
  `docs/DEFINITION_OF_DONE.md` dans la description de votre PR, item par item,
  en marquant explicitement "non applicable" ce qui ne concerne pas le changement
  plutôt que de l'omettre silencieusement.

## Definition of Done

`docs/DEFINITION_OF_DONE.md` fait autorité sur ce que "terminé" signifie pour tout
changement de code — tests, migrations réversibles, isolation tenant/RLS, contrats
OpenAPI à jour, événements de preuve/audit, accessibilité, mise à jour du threat
model si la frontière de confiance change, etc. Une PR qui ne coche pas ces cases
n'est pas prête à être fusionnée, quelle que soit l'urgence perçue.

**Toute contribution touchant `crypto`, `identity`, `vault`, `policy` ou `proof`**
(y compris leurs équivalents packages/modules — `packages/kofra-crypto`,
`internal/identity`, `internal/vault` à venir, moteur de politiques, `internal/proof`)
**exige une revue de sécurité humaine explicite avant fusion**, en plus du minimum
ci-dessus — voir `docs/DEFINITION_OF_DONE.md`, section "Exigences supplémentaires".
Aucun changement cryptographique n'est accepté sans ADR (`docs/ADR/`) et validation
explicite (`CLAUDE.md` §0 et §7). Si vous avez un doute sur le fait qu'un changement
entre dans ce périmètre, traitez-le comme si c'était le cas — la barre de sécurité de
KOFRA ne baisse jamais pour préserver une commodité.

## Questions

Pas de canal de contribution externe formalisé à ce stade (l'équipe est petite).
Ouvrez une issue GitHub pour une question de fond ; pour un signalement de
vulnérabilité de sécurité, ne passez pas par une issue publique — voir `SECURITY.md`.

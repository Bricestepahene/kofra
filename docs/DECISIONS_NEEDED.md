# KOFRA — Registre de décisions

Ce fichier est le registre des décisions d'architecture et de processus qui **bloquaient** ou **bloquent encore** un lot d'implémentation. Il ne remplace pas les ADR (`docs/ADR/`) : une décision structurante y est tranchée *puis* formalisée en ADR. Ce registre sert à voir d'un coup d'œil ce qui est arbitré et ce qui reste ouvert.

**Statuts** : `ACCEPTED` (tranchée, applicable immédiatement) · `OPEN` (non tranchée, bloque ou bloquera un lot) · `DEFERRED` (volontairement reportée, avec le lot où elle se posera).

Origine du registre : analyse du LOT 0 (2026-08-20), qui a relevé 14 décisions humaines requises avant toute ligne de code, plus une décision supplémentaire sur la structure des modules Go.

---

## Décisions tranchées — LOT PRÉ-0 (2026-08-20)

### D1 — Périmètre du LOT 0 face au plan LOT 1 existant · `ACCEPTED`

**Décision** : le LOT 0 absorbe **uniquement** le scaffolding décrit par la Task 1 du plan LOT 1. Le plan LOT 1 est corrigé pour démarrer après ce scaffolding, **sans renumérotation globale des lots** et **sans supprimer aucune de ses tâches cryptographiques**.

**Mise en œuvre** : `docs/superpowers/plans/2026-08-20-lot1-protocol-foundations.md` — la Task 1 devient un bloc de prérequis explicitement marqué « déplacée vers le LOT 0 ». Les Tasks 2 à 10 conservent leur numérotation, afin que les références croisées internes du plan (blocs `Interfaces: Consumes/Produces`) restent valides.

**Effet secondaire corrigé** : la Task 1 prévoyait de créer `package.json` à la racine avec un contenu vide de scripts. Ce fichier existe déjà et porte `sync:github-project` ainsi que cinq `devDependencies`. Exécuter la Task 1 telle qu'écrite aurait écrasé l'outillage de synchronisation du backlog.

### D2 — Driver PostgreSQL du control plane · `ACCEPTED`

**Décision** : `pgx/v5` natif, pas `database/sql`.
**ADR** : [0008](ADR/0008-pgx-v5-driver.md).

### D3 — Version de PostgreSQL · `ACCEPTED`

**Décision** : PostgreSQL **16.9** en développement, épinglé par **tag et digest**. Toute montée de version majeure exige une ADR.
**ADR** : [0009](ADR/0009-postgresql-version-and-database-roles.md).

### D4 — Rôles de base de données · `ACCEPTED`

**Décision** : `kofra_owner` (initialisation infra uniquement), `kofra_migrator` (migrations DDL), `kofra_app` (runtime). **Le runtime n'est jamais superutilisateur**, et n'a jamais `BYPASSRLS`.
**ADR** : [0009](ADR/0009-postgresql-version-and-database-roles.md).

### D5 — Propriété des migrations River · `ACCEPTED`

**Décision** : River gère ses propres migrations. Elles sont appelées depuis le même point d'entrée opérationnel que les migrations applicatives, selon la séquence documentée **applicatif → River → vérification**. Le DDL interne de River n'est **jamais** recopié dans `golang-migrate`.
**ADR** : [0010](ADR/0010-migration-ownership-app-and-river.md).

### D6 — Introduction de `sqlc` · `ACCEPTED` (report assumé)

**Décision** : `sqlc` est différé au **Lot A**, quand une première requête métier réelle et une table multi-tenant existeront. **Le LOT 0 ne crée aucune table artificielle** dans le seul but d'alimenter `sqlc`.

**Motif** : `sqlc` génère depuis du SQL portant sur des tables réelles. Fabriquer une table jetable pour faire tourner la chaîne de génération produirait une migration à supprimer plus tard et un précédent de « table technique » qui n'a pas lieu d'exister.

**Conséquence pour le LOT 0** : la cible `sqlc-generate` du `Makefile` reste un stub explicite, et le contrôle CI de fraîcheur du code généré n'est armé qu'au Lot A.

### D7 — Sémantique de `readiness` · `ACCEPTED`

**Décision** : `readiness` de l'API = **PostgreSQL joignable** + **migrations applicatives et River à jour**. Le worker River **n'entre pas** dans la readiness de l'API.

**Motif** : l'API doit refuser le trafic tant que le schéma n'est pas celui qu'elle attend, mais elle reste fonctionnellement utile si le worker est temporairement indisponible — coupler les deux transformerait une dégradation du traitement asynchrone en indisponibilité totale de l'API. La santé du worker relève de la supervision (`docs/OBSERVABILITY.md`, volumétrie des jobs River), pas de la readiness de l'API.

**Contrainte de sécurité associée** : la réponse de `readiness` ne divulgue **ni version, ni dépendance, ni détail de schéma** (`docs/DATA_CLASSIFICATION.md`, niveau Interne).

### D8 — Direction du contrat OpenAPI · `ACCEPTED`

**Décision** : **spec-first**. `control-plane/api/openapi/v1.yaml` est la source de vérité ; `oapi-codegen` génère les interfaces et types Go ainsi que le client TypeScript.
**ADR** : [0011](ADR/0011-openapi-spec-first-oapi-codegen.md) (précise l'ADR 0006).

### D9 — Protection de la branche `main` · `ACCEPTED` — **résolue le 2026-08-20**

**Constat initial** : l'API GitHub renvoyait `403 — Upgrade to GitHub Pro or make this repository public` sur `branches/main/protection` **et** sur `rulesets` ; le secret scanning renvoyait `422`. Le dépôt était privé sur un compte sans plan payant, donc aucune protection n'était applicable — un push direct sur `main` réussissait, et un job CI rouge n'empêchait rien.

**Résolution** : le dépôt est **passé public** le 2026-08-20 (arbitrage O2 ci-dessous), ce qui a débloqué les protections. Configuré et vérifié par l'API dans la foulée :

| Contrôle | État |
|---|---|
| Pull Request obligatoire, push direct bloqué | ✅ |
| `enforce_admins` — aucun contournement, y compris propriétaire | ✅ |
| Historique linéaire, force-push et suppression interdits | ✅ |
| Résolution des conversations avant fusion | ✅ |
| Secret scanning + push protection | ✅ |

**Écart résiduel, volontaire et documenté** : les **statuts CI ne sont pas encore requis** pour fusionner, et la revue CODEOWNERS n'est pas exigée — exiger un contexte de check dont le nom n'est pas confirmé bloquerait définitivement toute fusion, et exiger une approbation rendrait le travail en solo impossible. Couvert par [`security-exceptions/2026-08-20-statuts-ci-non-requis.md`](security-exceptions/2026-08-20-statuts-ci-non-requis.md), qui décrit la marche à suivre pour le refermer dès la première PR.

**Documents mis à jour** : `docs/RELEASE_POLICY.md`, `CONTRIBUTING.md`, `.github/CODEOWNERS`, `docs/SECURITY_POLICY.md`, `CLAUDE.md`, design V1 §2/§8, backlog EP-02.01.

### D15 — Licence · `ACCEPTED` (2026-08-20)

**Décision** : **Business Source License 1.1** (BUSL-1.1), avec bascule automatique en **Mozilla Public License 2.0** au **2030-08-20**.

**Motif** : le dépôt étant public, la visibilité du code devient un **atout de sécurité** — KOFRA promet qu'une compromission ne révèle que du ciphertext et qu'aucune cryptographie n'y est improvisée, deux affirmations bien plus crédibles quand elles sont vérifiables. BUSL préserve simultanément la protection commerciale : l'usage en production est accordé (y compris par un cabinet pour ses propres clients), le repackaging en offre concurrente ne l'est pas. C'est le modèle de HashiCorp Vault, l'analogue le plus proche.

**Point de correctness** : la covenant n°1 de BUSL impose une Change License **compatible GPL-2.0 ou ultérieure**. Apache-2.0 ne l'est pas (compatible GPL-3.0 seulement) — d'où le choix de MPL-2.0, qui l'est.

**À corriger dès qu'EP-00.01 est livré** : le champ `Licensor` du fichier `LICENSE` porte « KOFRA — Bricestepahene », faute d'entité juridique constituée. Il doit être remplacé par la dénomination légale exacte.

### D10 — Observabilité V1 · `ACCEPTED`

**Décision** : `SENTRY_DSN` est retiré. La V1 utilise `log/slog` en JSON et une fondation OpenTelemetry **sans exporteur SaaS distant**.
**ADR** : [0012](ADR/0012-observability-slog-otel-no-saas-exporter.md).

### D11 — Row-Level Security · `ACCEPTED` (report assumé)

**Décision** : la RLS est **obligatoire au Lot A pour toute table multi-tenant portant un `organization_id`**. Le LOT 0 ne crée **ni table jetable, ni politique RLS**.

**Motif** : une politique RLS sans table multi-tenant réelle ne protège rien et ne peut pas être testée honnêtement. Ce qui compte est que la RLS ne soit pas rétrofitée *après* que les tables existent — d'où son caractère obligatoire dès la première table multi-tenant, pas plus tard.

**Point de vigilance hérité de l'ADR 0010** : au moment d'activer la RLS, statuer explicitement sur le sort des tables internes de River, qui ne portent pas d'`organization_id`.

### D12 — Scission d'EP-03.03 · `ACCEPTED`

**Décision** : EP-03.03 est scindé. **Fondations de base de données = LOT 0** (rôles, extensions, conventions de migration, point d'entrée). **Tables métier et RLS = Lot A** (EP-03.11 et EP-03.04).

**Motif** : le critère d'acceptation initial d'EP-03.03 exigeait que « le schéma initial couvre toutes les tables listées au design V1 §4.3 » — c'est-à-dire tout le métier, ce que le LOT 0 s'interdit explicitement. Ce critère contredisait par ailleurs EP-04.01, EP-05.04, EP-06.01/03 et EP-07.02, qui créent chacun leur part de ces mêmes tables.

### D13 — `TRUST_PROTOCOL.md`, `AUTHORIZATION_MODEL.md`, `AUDIT_AND_PROOF.md` · `ACCEPTED` (report assumé)

**Décision** : ces trois documents sont écrits **progressivement, par lots**, au moment où le lot correspondant produit la matière. **Aucun contenu normatif prématuré n'est créé.**

**Motif** : écrire maintenant un protocole de confiance ou un modèle d'autorisation détaillé produirait un document que le code contredirait ensuite — exactement la dérive spec/réalité que le design V1 §3 cherchait à éviter en les différant.

**Ce qui reste ouvert** : le rattachement précis de chaque document à un lot (voir §Sujets ouverts, O5).

### D14 — Version de `golangci-lint` et de son ruleset · `ACCEPTED` (principe)

**Décision** : `golangci-lint` et son ruleset sont fixés **par version exacte**. L'usage de `latest` est proscrit.

**Motif** : `.github/workflows/control-plane.yml` se contredisait — son en-tête justifiait l'épinglage exact de Go au motif qu'« une version flottante en CI introduirait une dérive silencieuse », puis épinglait le linter à `version: latest`. Un linter qui change de règles entre deux exécutions peut faire passer au vert un code qu'il refusait la veille, y compris sur des règles de sécurité.

**Ce qui reste ouvert** : le numéro de version exact et le contenu de `.golangci.yml` (voir §Sujets ouverts, O1).

### DS1 — Module Go unique, pas de `go.work` · `ACCEPTED`

**Décision** : un seul module Go, racine `control-plane/`. **Aucun `go.work`.** Le verrouillage de la toolchain passe par la CI et par les mécanismes Go appropriés lorsqu'elle sera installée — **pas** par la seule directive `go` de `go.mod`, qui exprime une version minimale et non un verrou.
**ADR** : [0013](ADR/0013-single-go-module-no-go-work.md).

---

## Sujets réellement encore ouverts

### O1 — Version exacte de `golangci-lint` et contenu de `.golangci.yml` · `OPEN`

D14 fixe le principe ; le numéro reste à arrêter. Le point de vigilance est que `golangci-lint` v1 et v2 ont des schémas de configuration et des versions d'action GitHub différents : un choix de version implique un choix d'action compatible et un format de ruleset. À trancher au **LOT 0, étape 0.13**, quand la toolchain Go sera installée et que le résultat pourra être vérifié plutôt que supposé. Tant que ce n'est pas fait, aucun `.golangci.yml` n'est créé — un ruleset écrit à l'aveugle serait un faux vert.

### O2 — GitHub Pro ou dépôt public · `ACCEPTED` — **tranchée le 2026-08-20**

**Décision : dépôt public.** L'arbitrage portait sur un vrai dilemme — publier l'architecture détaillée d'un produit de gestion de secrets avant tout audit externe est une décision de sécurité, pas d'outillage.

Ce qui a fait pencher la balance : pour un produit de confiance, la visibilité du code est un **atout** plutôt qu'une exposition (principe de Kerckhoffs — la sécurité doit reposer sur les clés, jamais sur le secret de l'implémentation, ce que le manifeste pose déjà en refusant toute « cryptographie improvisée »). S'y ajoute un gain concret et gratuit : protection de branche, secret scanning et push protection, tous indisponibles sur un dépôt privé au plan gratuit, et dont seule la protection de branche serait revenue avec GitHub Pro.

**Vérification avant publication** : historique Git scanné intégralement — `.env` jamais commité, aucun motif de secret connu (`ghp_`, `AKIA`, clé privée PEM, etc.), aucun fichier sensible. Au moment du basculement : 0 fork, 0 star, 0 watcher, et aucun code applicatif — uniquement de la documentation.

**Conséquence à ne pas perdre de vue** : un retour en privé reste possible en une commande, mais tout fork créé pendant la fenêtre publique serait détaché et resterait public, et les archiveurs tiers indexent en continu. La publication est, en pratique, à sens unique.

### O3 — Supervision effective de `security@kofra.io` · `OPEN`

`docs/VULNERABILITY_DISCLOSURE.md` et `SECURITY.md` publient cette adresse en la qualifiant explicitement de « à activer ». Tant qu'elle n'est pas créée et supervisée (accusé de réception, astreinte), le canal de divulgation annoncé n'existe pas réellement. Rattaché à EP-00.05.

### O4 — Niveau OWASP ASVS cible · `OPEN`

`docs/SECURITY_POLICY.md` adopte ASVS comme référentiel mais renvoie le choix du niveau (1, 2 ou 3) et la table de correspondance exigence → epic à EP-01.10. La politique précise déjà la conséquence de ce vide : aucune fonctionnalité d'authentification ou d'autorisation ne peut être déclarée « conforme ASVS » tant que la table n'existe pas.

### O5 — Rattachement de `TRUST_PROTOCOL` / `AUTHORIZATION_MODEL` / `AUDIT_AND_PROOF` aux lots · `OPEN`

D13 fixe le principe (écriture progressive) ; le lot porteur de chacun reste à désigner. Candidats naturels : `AUTHORIZATION_MODEL` avec P06 (mandats et politiques), `AUDIT_AND_PROOF` avec P07 (preuve — EP-07.01 le cite déjà comme l'emplacement du catalogue d'événements), `TRUST_PROTOCOL` avec P05 (coffre et clés).

### O6 — Fournisseur d'hébergement · `DEFERRED` (EP-10.01)

Explicitement différé par le design V1 §8 à une ADR de déploiement, avant toute mise en production. Les critères sont déjà fixés (région, chiffrement, sauvegardes, restauration testée, accès privé, coût, SLA) ; seul le fournisseur reste ouvert.

### O7 — Collecteur OpenTelemetry auto-hébergé · `DEFERRED` (P10)

L'ADR 0012 pose la fondation sans exporteur. Le choix d'un collecteur et de sa destination relève de l'exploitation, pas de la V1 applicative.

### O8 — Convention de commit et signature des commits · `OPEN` — **désormais applicable**

`CONTRIBUTING.md` constate qu'aucune norme stricte n'est imposée. La signature des commits (GPG/SSH) est un objectif cohérent avec la trajectoire SLSA de `docs/RELEASE_POLICY.md`. Le blocage a disparu : la protection de branche étant active depuis le passage en public (D9/O2), `required_signatures` peut maintenant être exigé sur `main`. Reste à trancher **quand** l'activer — le faire avant que la clé de signature ne soit configurée localement bloquerait tout commit.

### O11 — Statuts CI requis sur `main` · `OPEN` — planifié à la première PR

Écart résiduel de D9 : `required_status_checks` est à `null`, donc un job rouge n'empêche pas encore une fusion. Les noms exacts des checks ne sont pas confirmés (aucun run de PR à ce jour) et en exiger un mal orthographié bloquerait définitivement toute fusion. Marche à suivre détaillée dans [`security-exceptions/2026-08-20-statuts-ci-non-requis.md`](security-exceptions/2026-08-20-statuts-ci-non-requis.md).

### O9 — Alimentation du champ `Lot` dans le GitHub Project · `OPEN`

`docs/execution/README.md` décrit une vue « Execution board » filtrée sur le lot actif, et le champ `Lot` existe dans le Project. Mais `docs/execution/kofra-v1-backlog.yaml` ne porte pas de champ `lot`, et `scripts/sync-github-project.ts` ne le renseigne pas : la vue ne peut donc rien filtrer aujourd'hui. Corriger implique de modifier le script de synchronisation, ce qui sort du périmètre documentaire du LOT PRÉ-0.

### O10 — `gitleaks` en CI · `OPEN` — planifié LOT 0, étape 0.14

`.pre-commit-config.yaml` installe `gitleaks` en hook local, mais `pre-commit` est **opt-in par développeur** : la détection de secrets dépend aujourd'hui de la bonne volonté de chacun. Un job CI équivalent est nécessaire pour que le contrôle existe indépendamment du poste. Non implémenté au LOT PRÉ-0, qui est un lot documentaire.

---

## Règle d'usage

Une décision `ACCEPTED` de ce registre a la même autorité qu'une ADR pour les décisions de processus ; les décisions **structurantes** sont en plus formalisées en ADR et c'est l'ADR qui fait foi en cas d'écart. Une décision `OPEN` qui bloque un lot doit être tranchée **avant** le démarrage de ce lot, jamais contournée par une hypothèse implicite dans le code.

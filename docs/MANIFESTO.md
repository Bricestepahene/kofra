# KOFRA — Manifeste fondateur v2.0

# KOFRA — Trust Infrastructure Platform

> Construire une plateforme mondiale de confiance permettant aux organisations
> et aux logiciels de protéger, déléguer et utiliser des secrets, des identités
> et des signatures cryptographiques sans perdre le contrôle.

## Ce que KOFRA est

KOFRA est une Trust Infrastructure Platform.

KOFRA fournit une couche de confiance programmable aux entreprises et aux
logiciels qui doivent protéger des actifs numériques sensibles, déléguer des
droits, authentifier des acteurs, signer des actes et produire des preuves
vérifiables.

KOFRA permet à une application métier de ne pas reconstruire elle-même les
mécanismes les plus sensibles de confiance numérique.

Lorsqu’un ERP, un logiciel RH, une plateforme financière, un cabinet
comptable ou une application métier doit protéger un secret, déléguer un
accès, vérifier une identité, signer un acte ou prouver une opération, la
question doit devenir :

> Pourquoi reconstruire une couche de confiance si KOFRA existe déjà ?

## Ce que KOFRA n’est pas

KOFRA n’est pas un gestionnaire de mots de passe.

KOFRA n’est pas un simple coffre-fort numérique.

KOFRA n’est pas un outil de signature électronique.

Ces produits sont des applications ou capacités construites sur KOFRA. Ils ne
définissent pas KOFRA.

## Les cinq piliers

1. **Secrets** — Protéger et utiliser les identifiants, tokens, clés API,
   certificats et données sensibles sans les exposer inutilement.

2. **Identity** — Représenter, authentifier et gouverner les personnes,
   organisations, appareils et services.

3. **Delegation** — Accorder, limiter, approuver, expirer et révoquer des
   droits d’usage selon des politiques explicites.

4. **Signature** — Signer, approuver, horodater et vérifier les actes
   numériques selon le niveau d’assurance requis.

5. **Audit** — Produire des preuves vérifiables des décisions et opérations
   sensibles, sans révéler les secrets ou contenus protégés.

## Invariants non négociables

- Un secret métier n’est jamais stocké en clair.
- Une clé ne protège jamais des données si elle est stockée avec elles.
- Chaque accès est authentifié.
- Chaque action est autorisée par une politique explicite.
- Chaque opération sensible laisse une preuve.
- La compromission d’un composant ne doit pas compromettre tout le système.
- KOFRA utilise des primitives cryptographiques reconnues, auditées,
  versionnées et migrables ; KOFRA n’invente aucun algorithme cryptographique.
- Les preuves, logs et métriques ne doivent jamais exposer les secrets,
  clés privées, tokens ou contenus confidentiels.

## Marché initial, vision globale

KOFRA commence avec les cabinets d’expertise comptable de la CEMAC.

Ce marché initial fournit un problème concret et urgent : permettre au cabinet
d’utiliser les accès numériques de ses clients sans partager ou exposer
inutilement les secrets.

Le marché initial ne limite pas la plateforme. Il valide les primitives
fondamentales de KOFRA : identité, secrets, délégation, politique, preuve,
révocation et continuité opérationnelle.

À terme, KOFRA est conçu pour être consommé par des ERP, des logiciels RH,
des outils financiers, des SaaS B2B et toute application ayant besoin d’une
couche de confiance programmable.

## Principe d’intégration

Les produits consommateurs — SynkriaOps, ERP, RH ou partenaires — utilisent
l’API, les SDK et les webhooks KOFRA.

Ils ne partagent jamais directement la base de données, les sessions, les
clés privées ou les secrets de KOFRA.

## Le problème

Les entreprises africaines fonctionnent sur des accès critiques : plateformes fiscales, organismes sociaux, banques, Mobile Money, douanes, outils métiers, e-mails, services cloud et portails clients.

Ces accès sont souvent dispersés dans des fichiers Excel, des messages WhatsApp, des boîtes e-mail, des navigateurs, des téléphones personnels ou la mémoire d'un collaborateur.

Ce système produit une fragilité structurelle :

- Les secrets circulent sans contrôle.
- Les départs de collaborateurs créent des risques opérationnels.
- Les responsabilités sont difficiles à prouver.
- Les cabinets et leurs clients perdent la maîtrise de leurs identités numériques.
- Les documents et validations sensibles restent dépendants de processus informels.

KOFRA remplace la confiance informelle par une confiance cryptographique, gouvernée et traçable.

## Notre conviction

L'économie numérique africaine ne manque pas seulement de logiciels. Elle manque d'une couche de confiance.

Cette couche doit permettre à une organisation de répondre, à tout instant, à cinq questions fondamentales :

1. Quel actif numérique protégeons-nous ?
2. Qui peut l'utiliser ?
3. Dans quelles conditions ?
4. Quelle preuve existe de cette utilisation ?
5. Comment ce droit est-il retiré, transféré ou renouvelé ?

KOFRA apporte cette réponse, sans transformer le secret en connaissance humaine partagée.

## Notre promesse

KOFRA permet d'utiliser un accès, d'accorder un mandat, de signer un document ou de prouver une action sans exposer inutilement les secrets qui rendent cette action possible.

- Un client peut confier à son cabinet l'usage d'un accès fiscal sans révéler son mot de passe à chaque collaborateur.
- Un associé peut valider une opération sans transmettre sa signature privée.
- Une organisation peut donner un droit temporaire, le tracer, l'expirer et le révoquer.

KOFRA transforme les secrets, identités, mandats et preuves en actifs numériques gouvernés.

## Notre point d'entrée

Nous commençons par les cabinets d'expertise comptable de la CEMAC.

Leur réalité concentre tous les problèmes que KOFRA doit résoudre : multiplicité des clients, accès sensibles, équipes variables, obligations de confidentialité, responsabilité professionnelle, procédures répétitives et dépendance à des plateformes externes.

La première mission de KOFRA est simple : permettre à un cabinet d'utiliser les accès numériques de ses clients sans jamais les disperser, les afficher ou les faire dépendre d'un collaborateur.

## KOFRA Vault

KOFRA Vault est le coffre-fort cryptographique de l'organisation. Il protège notamment :

- Identifiants de portails fiscaux, sociaux, bancaires et métiers.
- Codes de récupération et secrets de second facteur.
- Clés API et identifiants d'intégration.
- Certificats numériques.
- Documents sensibles.
- Procédures opérationnelles confidentielles.
- Éléments nécessaires à la signature et à la validation.

Chaque élément est chiffré avant stockage. KOFRA ne doit pas pouvoir lire le contenu métier de ses clients.

## KOFRA Access

KOFRA Access transforme le partage de mots de passe en délégation d'accès.

Un collaborateur n'obtient pas un mot de passe. Il reçoit un droit d'usage limité par une politique.

Un mandat KOFRA peut définir :

- Le cabinet, le client et le portail concernés.
- L'utilisateur ou l'équipe autorisée.
- La durée d'autorisation.
- Le niveau de validation requis.
- Les appareils ou navigateurs de confiance.
- Les restrictions de consultation, partage, export et modification.
- Les conditions de révocation.
- Les preuves d'usage attendues.

L'objectif n'est pas seulement de cacher un secret. L'objectif est de gérer une autorisation.

## KOFRA Client

KOFRA Client est l'espace de souveraineté du client. Via une application mobile et une interface web sécurisée, le client peut :

- Saisir directement ses identifiants et secrets.
- Autoriser ou retirer l'accès à un cabinet, une équipe ou un collaborateur.
- Voir quels portails sont liés à son organisation.
- Voir qui a utilisé quel accès et à quel moment.
- Fixer une durée, une limite ou une validation supplémentaire.
- Mettre à jour ou renouveler un secret sans le transmettre par message.
- Recevoir des alertes de connexion, de demande d'accès et d'activité inhabituelle.
- Conserver une preuve de ses autorisations et validations.

Le client ne remet plus un mot de passe. Il accorde un mandat contrôlé.

## KOFRA Proof

KOFRA Proof est le registre de preuve de l'organisation. Chaque événement important produit une trace exploitable :

- Création ou modification d'un secret.
- Demande, acceptation ou retrait d'un mandat.
- Utilisation d'un accès délégué.
- Connexion à un portail externe.
- Approbation ou refus d'une opération.
- Signature d'un document.
- Révocation d'un collaborateur.
- Export d'une preuve ou d'un registre d'audit.

Le journal ne contient jamais les secrets. Il fournit l'intégrité, l'horodatage, l'identité du demandeur, le contexte de l'action et la preuve que la politique appliquée l'autorisait.

## KOFRA Sign

KOFRA Sign devient progressivement la couche de signature et de consentement numérique.

Notre ambition n'est pas de reproduire DocuSign à l'identique. Notre ambition est de permettre à une entreprise africaine de signer, approuver, archiver et prouver des actes numériques dans des conditions adaptées à ses réalités : mobile-first, faible bande passante, canaux de notification locaux, multi-entités, exigences d'audit et procédures de cabinet.

KOFRA Sign devra permettre :

- La préparation et le partage de documents à signer.
- L'authentification forte des signataires.
- La signature électronique selon le niveau d'assurance requis.
- L'horodatage et l'intégrité documentaire.
- La piste d'audit complète.
- L'archivage chiffré et la vérification à long terme.
- L'intégration avec SynkriaOps et des logiciels partenaires.

La validité juridique exacte de chaque niveau de signature dépendra du droit applicable dans chaque pays ; KOFRA ne devra jamais promettre une équivalence juridique sans cadre réglementaire, preuve d'identité et mécanisme de conservation adaptés.

## Principes cryptographiques

### Zero knowledge par défaut

KOFRA est conçu de telle sorte que l'opérateur de la plateforme ne puisse pas lire les secrets métier de ses clients. Les données sensibles sont chiffrées côté client avant stockage. Une compromission de l'infrastructure ne doit pas révéler autre chose que des données cryptographiques inutilisables sans les clés appropriées.

### Pas de cryptographie improvisée

KOFRA n'invente pas ses algorithmes. Nous privilégions des primitives standardisées, éprouvées, documentées et maintenues : chiffrement authentifié moderne, dérivation de clés résistante, signatures numériques, échange de clés, rotation, révocation et séparation des clés.

Chaque évolution cryptographique doit être versionnée, compatible avec la migration des coffres existants et soumise à revue de sécurité indépendante.

### Clés sous contrôle utilisateur

La valeur de KOFRA réside dans le contrôle des clés et des politiques, pas dans la centralisation des secrets. Les mécanismes de récupération doivent être explicitement conçus : récupération multi-administrateur, seuil de validation, dispositifs de secours chiffrés et procédures d'urgence. Une architecture zero-knowledge sans récupération robuste peut devenir un risque opérationnel pour un cabinet.

### Le moindre privilège

Personne ne reçoit plus de droits que nécessaire. Les mandats sont limités par utilisateur, équipe, client, portail, appareil, durée et niveau de validation. La révocation doit être immédiate.

### La preuve sans exposition

KOFRA doit prouver qu'une action autorisée s'est produite sans enregistrer le mot de passe, la clé privée ou le contenu confidentiel qui a permis cette action.

## Limite de promesse

KOFRA doit être ambitieux sans mentir.

L'extension navigateur peut empêcher l'affichage normal, le copier-coller et le partage accidentel d'un mot de passe. Mais lorsqu'un navigateur authentifie réellement un utilisateur auprès d'un portail tiers, il manipule nécessairement un secret ou une donnée d'authentification équivalente.

La promesse responsable est donc :

> KOFRA réduit radicalement l'exposition des secrets et permet des accès délégués, limités, auditables et révocables, sans divulgation volontaire du mot de passe aux collaborateurs.

La protection contre un poste compromis, un navigateur infecté ou un utilisateur malveillant exige des couches complémentaires : appareils gérés, isolation de navigateur, détection d'anomalies, MFA, politiques de session et rotation des secrets.

## Vision finale

Construire la couche de confiance numérique qui permettra aux organisations africaines de déléguer, signer, prouver et coopérer sans perdre le contrôle de leurs secrets ni de leur identité.

KOFRA commence dans les cabinets comptables parce que leur problème est urgent, concret et sous-servi.

Demain, KOFRA peut devenir l'infrastructure utilisée par SynkriaOps, les cabinets, les PME, les banques, les administrations et les plateformes de services pour administrer les actifs numériques qui exigent le plus de confiance.

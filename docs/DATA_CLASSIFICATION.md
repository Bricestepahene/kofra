# KOFRA — Classification des données

Ce document fixe ce qui est public, interne, confidentiel, sensible et secret dans KOFRA. Il fait autorité pour toute décision de logging, de tooling support, d'analytics, de fixtures de test et de communication interne. `docs/execution/kofra-v1-backlog.yaml` EP-00.04 en dépend ; `docs/SECURITY_THREAT_MODEL.md` doit être cohérent avec cette classification.

## Règle non négociable

**Un secret KOFRA ne doit jamais finir dans un log, un ticket GitHub, une capture d'écran, un outil analytics ou un canal de support client.** Cette règle n'admet aucune exception "temporaire" ou "juste pour débugger" — cf. CLAUDE.md §0 et §4 ("Zero-knowledge"). Si un bug ne peut être reproduit qu'en manipulant un secret réel, la procédure est de demander au client de le faire régénérer après investigation, jamais de le faire transiter par un canal non chiffré côté KOFRA.

## Niveau : Secret

Jamais en clair où que ce soit hors du poste du client. Le control plane Go ne doit voir que des ciphertexts ou des enveloppes de clés (§4.1, §4.3 du design V1).

- Mots de passe et identifiants des portails clients (fiscaux, sociaux, bancaires, Mobile Money).
- Clés privées X25519/Ed25519 de l'utilisateur (`encrypted_private_key_bundles` — toujours chiffrées, jamais déchiffrées côté serveur).
- Vault Key (VK) et enveloppes de VK (`vault_key_envelopes`) une fois déballées.
- Data Encryption Keys (DEK) une fois déballées (`vault_data_keys` ne stocke que le `dek_ciphertext`).
- Contenu en clair des secrets et documents (`secrets` ne stocke que le ciphertext).
- Codes de récupération, secrets de second facteur, parts de récupération à seuil (§4.6) une fois reconstruites.

Ne doit **jamais** apparaître dans : logs applicatifs, messages d'erreur, traces d'observabilité, tickets GitHub, captures d'écran de debug, outils analytics tiers, messages Slack/e-mail internes, fixtures de test dérivées de données réelles, dumps de base pour environnement de dev. Une compromission de l'infrastructure ne doit révéler que des ciphertexts inutilisables sans les clés côté client.

## Niveau : Sensible

Métadonnées qui révèlent une structure d'accès mais pas le contenu. Manipulables par le control plane, mais leur exposition externe révèle qui a accès à quoi — donc à protéger comme un signal d'attaque potentiel (reconnaissance avant ciblage).

- Liste des portails associés à un client (métadonnées `secrets` : type, portail, dernière rotation).
- Structure des mandats (`mandates`) : qui, quel client, quel portail, quelle durée, quelles conditions.
- Qui a accès à quel coffre (`vault_key_envelopes.recipient_key_id`, membres de `recovery_groups`).
- Événements de preuve individuels (`proof_events`) : horodatage, identité de l'acteur, contexte d'une action précise.
- Politiques d'accès (`policies`) propres à un cabinet ou un client.

Ne peut apparaître dans un ticket GitHub public, un post Slack externe ou une capture d'écran partagée hors de l'équipe autorisée qu'après anonymisation (remplacement des identifiants réels par des pseudonymes). Autorisé dans les logs techniques internes à accès restreint, à condition de ne jamais y adjoindre une donnée Secret du même événement.

## Niveau : Confidentiel

Donnée métier réelle mais pas cryptographiquement critique — sa fuite est un incident de confidentialité contractuelle, pas une compromission cryptographique.

- Identité des cabinets et de leurs clients (`organizations`, `users` : noms, emails, rôles).
- Structure organisationnelle d'un cabinet (équipes, collaborateurs, hiérarchie de mandats).
- Contrats et engagements commerciaux (pilotes, conditions tarifaires).

Peut apparaître dans les tickets GitHub internes du dépôt privé et les échanges Slack/e-mail internes à l'équipe KOFRA, jamais dans un outil analytics tiers non couvert par un DPA (accord de traitement de données), jamais dans une capture publique.

## Niveau : Interne

Opérationnel KOFRA, sans lien direct avec un client identifiable.

- Métriques d'usage agrégées (adoption, volumes, latences — cf. EP-00.06).
- Logs techniques sans PII (identifiants internes, codes d'erreur, temps de réponse).
- Code source (`control-plane/`, `web/`, `extension/`, `packages/*`).

Librement partageable au sein de l'équipe et des outils internes (GitHub privé, CI). Reste soumis à la règle des secrets si un log technique venait à contenir accidentellement un identifiant utilisateur brut — dans ce cas la donnée redevient Confidentiel ou pire, pas Interne.

## Niveau : Public

- Manifeste (`docs/MANIFESTO.md`), documentation produit, contenu marketing, page de statut public (EP-10.10).
- ADR une fois publiés si KOFRA choisit de les rendre publics.

## Fixtures de test et vecteurs cryptographiques

`packages/kofra-crypto` (wrapper unique Web Crypto API, cf. CLAUDE.md §2) sera testé par vecteurs de test connus — `make test-crypto`. Règle de classification appliquée à ces vecteurs :

- **Les vecteurs de test publics et standardisés** (RFC, suites de test officielles d'Argon2id, X25519, Ed25519, AES-256-GCM, schéma à seuil audité) **ne sont pas des secrets réels** : ils peuvent et doivent être committés en clair dans le dépôt, avec leur source citée.
- **Toute donnée dérivée d'un compte réel** (capture d'un vrai Vault Key, d'une vraie clé privée utilisateur, d'un vrai mot de passe, même de test manuel sur un compte KOFRA existant) **ne peut jamais** devenir une fixture committée. Générer des fixtures synthétiques dédiées, produites par un script déterministe à partir de graines fictives documentées comme telles, jamais capturées depuis un environnement connecté à de vraies données client.
- Toute fixture générée pour reproduire un bug doit être passée en revue avant commit pour vérifier qu'elle ne contient aucun fragment d'un secret réel — un extrait de log de debug collé tel quel dans un fichier de test est le vecteur d'incident le plus fréquent de ce type.

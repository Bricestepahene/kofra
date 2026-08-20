# KOFRA — Modèle de menace V1

Ce document répond à EP-01.03 du backlog. Il remplace toute référence antérieure à `docs/THREAT_MODEL.md` — même document, nom final. Il n'est pas un exercice académique : chaque scénario pointe vers un composant réel de l'architecture (`docs/superpowers/specs/2026-08-20-kofra-v1-design.md`, `docs/ADR/`) et vers un statut honnête — mitigé par construction, mitigé par process, ou résiduel et accepté. Le manifeste (§"Limite de promesse") interdit explicitement de présenter une mitigation comme plus complète qu'elle ne l'est.

Pour chaque acteur : capacité présumée, impact si non mitigé, contre-mesure réelle déjà décidée dans l'architecture, et statut.

## 1. Opérateur KOFRA compromis (accès admin infra/DB détourné)

**Capacité** : accès direct à la base PostgreSQL de production, aux logs, ou à l'infrastructure via un compte administrateur détourné ou un employé malveillant.
**Impact non mitigé** : lecture de l'ensemble des secrets métier de tous les clients.
**Contre-mesure** : zero-knowledge par construction — le control plane Go ne stocke que des métadonnées, ciphertexts et enveloppes (design V1 §4.3 : `secrets`, `vault_data_keys`, `vault_key_envelopes` ne contiennent jamais de clair), et CLAUDE.md §4 interdit tout secret ou clé privée dans les logs, messages d'erreur ou outils de support.
**Statut** : mitigé par construction pour le contenu des coffres. Résiduel pour les métadonnées (qui est client de qui, structure organisationnelle, timing des usages) — accepté, car nécessaire au fonctionnement du produit.

## 2. Poste client compromis (malware, keylogger chez le comptable)

**Capacité** : capture clavier, lecture mémoire du navigateur, exfiltration du mot de passe maître ou de la Vault Key déchiffrée pendant une session active.
**Impact non mitigé** : déchiffrement local de tout ce que la session autorisait au moment de la compromission.
**Contre-mesure** : le manifeste (§"Limite de promesse") documente explicitement que KOFRA ne protège pas un poste déjà compromis — ce n'est pas un angle mort, c'est une limite assumée. Atténuation : MFA TOTP obligatoire ou fortement recommandé selon le rôle (design V1 §5), rotation de secrets, verrouillage automatique de session côté extension (EP-09.02), et révocation renforcée/critique disponible en cas de compromission avérée (design V1 §4.4).
**Statut** : résiduel et accepté — documenté comme limite de promesse, jamais présenté comme couvert.

## 3. Navigateur/extension compromis ou extension tierce malveillante imitant KOFRA

**Capacité** : une extension malveillante réclamant des permissions similaires, ou un navigateur infecté interceptant le remplissage local d'un champ.
**Impact non mitigé** : interception du secret au moment précis où l'extension le remplit dans un formulaire tiers.
**Contre-mesure** : Manifest V3 (ADR 0005), permissions strictement limitées à ce qui est nécessaire en Phase 1 (EP-09.01), session cryptographique éphémère et non persistante (service worker MV3, EP-09.02 — un redémarrage ne doit laisser aucun secret déchiffré résiduel en mémoire), et l'extension ne contourne jamais OTP, CAPTCHA ou l'authentification tierce.
**Statut** : mitigé par construction pour le canal KOFRA propre (pas d'affichage/export/copie du secret par défaut). Résiduel si le navigateur hôte est déjà compromis — recoupe le scénario 2.

## 4. Collaborateur de cabinet malveillant ou négligent

**Capacité** : usage d'un mandat légitimement accordé pour capturer ou exfiltrer un secret au-delà de l'usage prévu (capture d'écran, copie manuelle après remplissage, partage non autorisé).
**Impact non mitigé** : fuite d'un secret client sans détection immédiate, via un canal en apparence autorisé.
**Contre-mesure** : mandats strictement limités par utilisateur, équipe, client, portail, appareil, durée et niveau de validation (manifeste, "KOFRA Access"), révocation immédiate, et preuve d'usage systématique dans `proof_events` (design V1 §4.5) — le remplissage n'est jamais anonyme ni non tracé.
**Statut** : mitigé par process et traçabilité a posteriori — pas une prévention absolue. Un collaborateur autorisé conserve, par définition, une fenêtre d'usage légitime pendant la durée du mandat ; c'est un résiduel accepté, compensé par la preuve et la révocabilité immédiate.

## 5. Compromission de la chaîne de preuve (falsification d'événements passés)

**Capacité** : un attaquant avec accès privilégié à la base tente de modifier ou supprimer un événement historique de `proof_events` pour effacer une trace.
**Impact non mitigé** : perte de la valeur probante du registre d'audit — KOFRA Proof cesse d'être une preuve.
**Contre-mesure** : chaîne append-only et hash-chained (`event_hash = SHA-256(payload canonique || hash précédent || organization_id || numéro de séquence)`, design V1 §4.5), signature Ed25519 côté client pour les événements de consentement/approbation, signature serveur distincte, et séparation structurelle entre `internal/proof` (écriture) et `internal/audit` (lecture/export) — ce dernier ne doit jamais écrire dans la chaîne (CLAUDE.md §4). Toute altération d'un événement passé casse la continuité du hash et devient détectable.
**Statut** : mitigé par construction dès que `internal/proof` est implémenté et que la vérification asynchrone de la chaîne (job River périodique, design V1 §4.7) est opérationnelle. À la date de ce document, ce composant est spécifié mais pas encore codé — statut cible, pas encore vérifié en production.

## 6. Perte de la seule clé administrateur d'une organisation

**Capacité** : n'importe quel événement de perte (départ non anticipé, appareil détruit, oubli) plutôt qu'une attaque.
**Impact non mitigé** : dans un modèle zero-knowledge pur sans récupération, le coffre de l'organisation est définitivement perdu — l'ADR 0003 qualifie ce risque d'inacceptable commercialement.
**Contre-mesure** : groupe de récupération à seuil multi-administrateur (ex. 3 administrateurs, seuil 2/3), partage de clé par une bibliothèque à seuil auditée — jamais un Shamir maison — et reconstruction locale uniquement (design V1 §4.6). KOFRA ne détient jamais seule une part suffisante pour reconstruire une clé : la récupération n'est pas une porte dérobée.
**Statut** : mitigé par construction au niveau du design. Non encore implémenté — EP-01.08 (spec détaillée de récupération et de rotation) est un prérequis avant que ce statut passe de "conçu" à "vérifié".

## 7. Attaque de la chaîne de dépendances (paquet npm/Go compromis)

**Capacité** : compromission d'un mainteneur ou d'un paquet en amont (npm, modules Go) injectant du code malveillant dans une dépendance directe ou transitive.
**Impact non mitigé** : exécution de code arbitraire en build ou en production, avec risque d'exfiltration de clés d'infrastructure ou de secrets de configuration au moment du build.
**Contre-mesure** : SBOM généré en CI, Dependabot et GitHub Dependency Review actifs sur chaque PR, scans gosec/govulncheck/Trivy/CodeQL dans `security.yml` (CLAUDE.md §5), avec sévérité CRITICAL bloquante et HIGH nécessitant correctif ou exception documentée dans `docs/security-exceptions/`.
**Statut** : mitigé par process (détection systématique) — résiduel pour une compromission zero-day non encore publiée au moment du build.

## 8. Compromission de l'infrastructure de production (VPS, base de données)

**Capacité** : accès root ou hyperviseur, vol physique de disque, accès réseau interne non autorisé.
**Impact non mitigé** : lecture intégrale de la base — mais le zero-knowledge limite la valeur de ce contenu à des ciphertexts inexploitables sans les clés côté client. Le risque résiduel porte sur les métadonnées et sur des sauvegardes non chiffrées.
**Contre-mesure** : infrastructure explicitement isolée de celle de SynkriaOps (design V1 §8), fournisseur choisi via un ADR de déploiement dédié avant mise en production (région, chiffrement, sauvegardes chiffrées, restauration testée, accès privé — critères non négociables, fournisseur remplaçable).
**Statut** : partiellement mitigé par construction (contenu des coffres) et mitigé par process pour l'isolation infra. Le test de restauration complet (EP-10.08) et l'ADR de déploiement restent à réaliser avant le pilote — statut cible, pas encore vérifié.

## Traçabilité

Chaque contre-mesure listée ici doit rester traçable vers l'epic P04–P10 qui l'implémente (critère d'acceptation d'EP-01.03). Ce document est mis à jour à chaque fois qu'un epic change matériellement une contre-mesure décrite ici, et relu avant chaque jalon (`alpha-interne`, `pilote-ferme`).

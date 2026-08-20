# Politique de sécurité

KOFRA gère des secrets qui n'appartiennent pas à KOFRA : identifiants fiscaux,
sociaux, bancaires et métiers de cabinets d'expertise comptable et de leurs clients.
Le produit est conçu **zero-knowledge** : le chiffrement se fait côté client, le
control plane ne stocke, ne journalise et ne transporte jamais un secret en clair,
une clé privée en clair, ni un mot de passe. Une compromission de l'infrastructure ne
doit exposer que du ciphertext inexploitable — jamais une donnée métier lisible.
Détail complet : `docs/MANIFESTO.md` (section "Principes cryptographiques") et
`docs/SECURITY_POLICY.md`.

## Versions supportées

KOFRA est en Phase 1 de spécification/implémentation (voir `README.md`, section
"Statut") : il n'existe pas encore de release publique ni de version stable. Seule la
branche par défaut (`main`) est suivie du point de vue sécurité. Cette section sera
mise à jour dès la première release versionnée.

## Signaler une vulnérabilité

**Ne pas ouvrir d'issue publique pour signaler une vulnérabilité.**

La politique complète — périmètre, SLA de réponse par niveau de gravité, safe
harbor pour une recherche de bonne foi — est documentée dans
[`docs/VULNERABILITY_DISCLOSURE.md`](docs/VULNERABILITY_DISCLOSURE.md).

Canal de contact : **security@kofra.io**. Cette adresse est la cible officielle,
mais `docs/VULNERABILITY_DISCLOSURE.md` le précise explicitement : tant qu'elle
n'est pas confirmée comme supervisée (astreinte, accusé de réception), ne la
considérez pas comme garantissant une réponse immédiate. En cas de doute sur une
vulnérabilité critique et l'absence de retour, escaladez par un canal direct connu
de l'équipe plutôt que d'attendre en silence.

## Ce que couvre — et ne couvre pas — un signalement

Dans le périmètre : control plane, application web, extension navigateur,
bibliothèques partagées critiques pour la sécurité (`packages/kofra-crypto`,
`packages/kofra-contracts`), et toute vulnérabilité touchant la confidentialité,
l'intégrité, la révocation, la preuve ou la migration de protocole cryptographique.
Hors périmètre : ingénierie sociale, déni de service volumétrique, vulnérabilités
des plateformes tierces auxquelles KOFRA délègue un accès. Détail complet et SLA par
gravité (CRITICAL/HIGH/MEDIUM/LOW) : `docs/VULNERABILITY_DISCLOSURE.md`.

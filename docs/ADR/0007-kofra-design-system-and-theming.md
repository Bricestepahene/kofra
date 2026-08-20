# ADR 0007 — Design system KOFRA, thèmes et tokens sémantiques

- **Statut** : accepté
- **Date** : 2026-08-20

## Contexte

KOFRA doit communiquer confiance, maîtrise et précision — pas l'esthétique "cybersécurité agressive" ni le SaaS générique bleu-violet. Le produit couvre plusieurs surfaces (dashboard cabinet, portail client, PWA, extension navigateur) qui doivent rester visuellement et comportementalement cohérentes malgré des stacks et cycles de release différents (ADR 0001, ADR 0005). Sans système de tokens partagé défini avant le premier écran, chaque surface dérive indépendamment et la cohérence devient un problème de rattrapage plutôt qu'une propriété garantie dès le départ. Les WCAG exigent un contraste minimal de 4.5:1 pour le texte normal et 3:1 pour le grand texte et les composants non textuels — un seuil, pas une aspiration.

## Décision

### Positionnement visuel

KOFRA est un système de confiance institutionnel, plus proche d'un système bancaire moderne et transparent que d'un outil de hacking ou d'un gestionnaire de mots de passe ludique : interfaces calmes, couleur utilisée pour signifier et non décorer, hiérarchie nette identité → coffre → mandat → action → preuve, iconographie linéaire à coins légèrement arrondis, animations brèves et fonctionnelles. Pas de néon, de dégradés "IA", de violet SaaS générique ni de glassmorphism.

### Palette de marque

| Rôle | Nom | Valeur | Usage |
|---|---|---:|---|
| Marque primaire | `Kofra Deep` | `#123B45` | Logo, navigation active, boutons principaux en clair |
| Marque secondaire | `Kofra Teal` | `#0E6973` | Liens, éléments interactifs secondaires, graphiques |
| Marque lumineux | `Kofra Sky` | `#52B8C4` | Focus, état actif en sombre, indicateurs d'identité |
| Confiance validée | `Trust Jade` | `#14846A` | Mandat actif, preuve valide, succès |
| Attention | `Control Amber` | `#B66A08` | Expiration prochaine, MFA requis, approbation attendue |
| Danger | `Risk Red` | `#C53D45` | Révocation, échec, activité bloquée |
| Violet réservé | `Proof Indigo` | `#5A56C9` | Preuves cryptographiques, signatures — réservé, pas d'usage décoratif |

Règle : jamais plusieurs couleurs d'état dans une même carte sans nécessité ; la couleur complète toujours une icône et un libellé explicite, jamais le seul signal (non-négociable pour l'accessibilité et pour éviter la confusion entre gravités).

### Thèmes clair et sombre par tokens sémantiques

Le mode clair est le mode de travail principal ; le mode sombre est une variante sémantique définie indépendamment, jamais une inversion automatique des couleurs claires (une simple inversion produit typiquement des échecs de contraste). Les deux thèmes sont définis dès `packages/kofra-ui/tokens.css` (§"Tokens", ci-dessous) — c'est la seule manière de garantir la cohérence entre toutes les surfaces sans dupliquer de feuille de style.

Mode initial : préférence système (`prefers-color-scheme`), avec sélection utilisateur persistée et possibilité explicite de revenir à "système".

### Conformité WCAG AA comme seuil minimal

4.5:1 pour le texte normal, 3:1 pour le grand texte et les composants non textuels (icônes d'état, bordures porteuses de sens) — vérifié pour chaque paire texte/surface et chaque état sémantique (succès/attention/danger/preuve), dans les deux thèmes, avant qu'un token n'entre en usage.

### Aucun code hexadécimal directement dans les composants métier

Toute couleur utilisée dans `web/`, `extension/` ou tout futur portail consomme un token sémantique (`var(--color-*)` ou équivalent Tailwind `@theme`), jamais une valeur hexadécimale littérale. Une revue de code qui trouve un hex codé en dur dans un composant métier est un motif de rejet, pas une remarque de style.

### `packages/kofra-ui` comme système de composants partagé

Un design system minimal vit dans `packages/kofra-ui/` — jamais dispersé dans `web/` ou l'extension. Il se structure en trois couches :

```text
packages/kofra-ui/
├── tokens.css              # source de vérité des tokens clair/sombre
├── theme-provider.tsx
├── components/              # primitives génériques (button, input, dialog, data-table...)
├── security/                 # contrats UX de sécurité (vault-status, mandate-status,
│                              #   trust-indicator, proof-badge, device-trust,
│                              #   security-event, secret-reveal-guard)
└── patterns/                 # flux composés (secure-onboarding, mandate-approval,
                               #   vault-item-form, revoke-access-dialog,
                               #   recovery-setup, security-confirmation)
```

Les composants de `security/` et `patterns/` sont des **contrats UX de sécurité**, pas de simples composants visuels : ils encodent les règles UX non négociables ci-dessous et ne se recodent jamais page par page. Cette arborescence est documentée ici comme cible ; son implémentation réelle (composants, `theme-provider`) relève d'EP-08.01 quand P08 démarre (`docs/execution/kofra-v1-backlog.yaml`) — construire les composants avant que le lot ne soit actif produirait du code non testé, non consommé, qui dérive du besoin réel.

### Règles UX non négociables

- **Un secret n'est jamais une donnée "normale"** : masqué par défaut, jamais copiable par défaut, jamais dans une notification/toast/URL/log. Toute révélation exige une authentification renforcée et une durée limitée. Dans le flux de mandat, l'action s'appelle "Utiliser l'accès", jamais "Voir le mot de passe" — cohérent avec le remplissage sans affichage volontaire de l'extension (ADR 0005, design V1 §6).
- **L'utilisateur sait toujours qui agit, sur quoi, au nom de qui, avec quelle durée et quelle conséquence** avant toute confirmation d'action sensible (panneau d'autorisation type "Utiliser l'accès DGI").
- **Les actions destructives ralentissent** : bouton danger isolé, conséquence écrite explicitement, confirmation contextuelle, saisie du nom de l'entité pour toute destruction irréversible, authentification renforcée, résultat final lié à la preuve d'audit — cohérent avec les trois niveaux de révocation (design V1 §4.4) : l'UI ne doit jamais laisser croire qu'une révocation logique a l'effet d'une révocation renforcée ou critique.
- **L'audit est lisible avant d'être technique** : une phrase en langage naturel d'abord ("Marie N. a utilisé l'accès DGI de Société Atlas SARL"), le hash/signature/numéro de séquence dans une vue "Détails techniques" séparée destinée au responsable sécurité.
- **Le client ne voit jamais le vocabulaire interne** (`DEK`, `envelope`, `key rotation`) — seulement des intentions (accès, cabinet, personne autorisée, période, activité, révocation). Le glossaire interne (EP-01.02) et le vocabulaire client sont deux registres distincts, délibérément.

### Typographie et rythme

Police UI Inter ou Geist, police mono JetBrains Mono pour hashes/IDs/données techniques. Rayon `10px` composants / `14px` cartes. Grille en base `4px` (`4/8/12/16/24/32/48`). Ombres légères en clair, remplacées par bordures et variations de surface en sombre. Icônes Lucide, `16px` en contrôle, `20px` en navigation.

## Alternatives considérées

- **Palette bleu-violet SaaS générique** — écartée explicitement : le manifeste positionne KOFRA comme infrastructure de confiance institutionnelle, pas comme un outil "tech" parmi d'autres ; une identité visuelle interchangeable avec n'importe quel SaaS affaiblirait ce positionnement.
- **Mode sombre en inversion automatique des couleurs claires** — écarté : produit des échecs de contraste WCAG systématiques et incohérents ; chaque thème est défini comme un jeu de tokens sémantiques propre.
- **Composants de sécurité dupliqués par surface** (web, extension) — écarté : recoder `mandate-status` ou `secret-reveal-guard` séparément par surface est exactement le genre de divergence qu'un contrat UX de sécurité doit empêcher ; un seul jeu de composants dans `packages/kofra-ui`, consommé par toutes les surfaces TypeScript.

## Conséquences

- Aucune surface ne peut introduire une couleur ou un composant de sécurité hors de `packages/kofra-ui` sans passer par une revue explicite — la cohérence devient structurelle, pas une discipline à maintenir manuellement.
- `packages/kofra-ui/tokens.css` (créé par ce commit) est la référence unique consommée par `web/`, l'extension et tout futur portail — toute divergence de palette future passe par une modification de ce fichier, pas par un token local à une surface.
- L'implémentation des composants (`theme-provider`, `components/`, `security/`, `patterns/`) reste à faire lors d'EP-08.01 ; ce document fixe le contrat, pas le code.

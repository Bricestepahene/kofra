# @kofra/ui

Design system partagé KOFRA — voir `docs/ADR/0007-kofra-design-system-and-theming.md` pour la décision complète (palette, thèmes, règles UX non négociables).

**État actuel** : seuls les tokens (`tokens.css`) existent. `theme-provider.tsx`, `components/`, `security/` et `patterns/` sont documentés dans l'ADR comme cible mais pas encore implémentés — ce travail relève d'EP-08.01 (`docs/execution/kofra-v1-backlog.yaml`), quand P08 démarre.

Règle non négociable : aucune couleur hexadécimale codée en dur dans un composant métier — toujours `var(--color-*)`.

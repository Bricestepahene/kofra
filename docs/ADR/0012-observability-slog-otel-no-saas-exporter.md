# ADR 0012 — Observabilité V1 : `slog` JSON et fondation OpenTelemetry, sans exporteur SaaS distant

- **Statut** : accepté
- **Date** : 2026-08-20
- **Décision de référence** : D10 (`docs/DECISIONS_NEEDED.md`)

## Contexte

`.env.example` portait une variable `SENTRY_DSN` alors qu'**aucun ADR ni document ne choisissait Sentry**. `docs/OBSERVABILITY.md` ne le mentionnait pas et évoquait OpenTelemetry comme une intégration « future ». Il s'agissait selon toute vraisemblance d'un report depuis un projet voisin — une variable d'environnement pour un fournisseur jamais retenu.

Laisser cette variable en place revenait à documenter par accident un chemin de sortie de données vers un tiers.

## Décision

- La journalisation V1 du control plane utilise **`log/slog` avec un handler JSON**, seul backend de logs.
- Une **fondation OpenTelemetry** est posée (instrumentation, propagation de l'ID de corrélation) **sans aucun exporteur SaaS distant**.
- **`SENTRY_DSN` est retiré de `.env.example`.**

Aucune donnée de télémétrie ne quitte l'infrastructure KOFRA en V1.

## Alternatives considérées

- **Sentry (ou tout APM SaaS) dès la V1** — écarté. KOFRA manipule les secrets de tiers : cabinets d'expertise comptable et leurs clients. Un exporteur distant crée un chemin de sortie de données que `docs/DATA_CLASSIFICATION.md` devrait explicitement autoriser, et qui transporterait hors du périmètre KOFRA toute donnée sensible atterrissant accidentellement dans une charge utile d'erreur. Or `docs/OBSERVABILITY.md` pose que **tout champ non classifié est traité comme sensible par défaut** : la conséquence logique est qu'on ne peut pas envoyer un payload d'erreur à un tiers avant que le mécanisme de rédaction ne soit prouvé par test. Ce n'est pas un refus définitif de l'outillage APM, c'est un refus de l'introduire avant les garanties qui le rendent acceptable.
- **Aucune fondation OpenTelemetry (logs seuls)** — écarté. Rétrofiter l'instrumentation et la propagation de contexte après coup impose de retoucher chaque handler ; poser la fondation maintenant, sans exporteur, coûte peu et évite ce chantier.
- **Une bibliothèque de log tierce (zap, zerolog)** — écarté. `log/slog` est dans la bibliothèque standard depuis Go 1.21 : pas de dépendance supplémentaire à auditer sur un composant qui voit passer, par construction, toutes les structures de l'application (`docs/DEPENDENCY_POLICY.md`, « Ajouter une nouvelle dépendance »).

## Conséquences

- Le mécanisme de rédaction exigé par EP-03.09 et par `docs/OBSERVABILITY.md` s'implémente au niveau du handler `slog`, et son test automatisé porte sur cette sortie.
- **Introduire un exporteur distant, quel qu'il soit, exige une nouvelle ADR et une revue explicite au regard de `docs/DATA_CLASSIFICATION.md`.** Ce n'est pas une décision de configuration.
- Le choix d'un collecteur OpenTelemetry auto-hébergé (et de sa destination) reste ouvert et relève de l'exploitation (P10), pas de ce document.
- La séparation structurelle entre observabilité technique et chaîne de preuve (`docs/OBSERVABILITY.md`, section finale) demeure inchangée : `slog` n'a jamais accès en écriture à `internal/proof`.

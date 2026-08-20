# Code de conduite

KOFRA est aujourd'hui une petite équipe. Ce document existe pour que la façon de
travailler ensemble reste claire à mesure que l'équipe grandit : cabinets pilotes,
contractants, futurs employés, contributeurs externes. Il s'applique partout où le
projet vit — ce dépôt, les issues, les revues de code, les échanges liés à KOFRA sur
d'autres canaux (Slack, e-mail, appels).

## Ce qu'on attend

- Un désaccord technique se tranche sur des arguments, pas sur la personne qui les
  porte. La barre de sécurité fixée par `CLAUDE.md` §0 n'est pas négociable en revue
  — la faire respecter n'est jamais une attaque personnelle contre l'auteur d'une PR.
- Signaler un problème de sécurité, un doute de conformité ou un angle mort de
  spécification est un service rendu au projet, pas une gêne. Voir
  `docs/VULNERABILITY_DISCLOSURE.md` pour le canal dédié aux vulnérabilités.
- Donner et recevoir une critique de code de façon factuelle : ce qui ne va pas, dans
  quel fichier, avec quelle conséquence.
- Respecter la confidentialité des données auxquelles un accès de test ou de debug
  donne accès. KOFRA protège des secrets qui n'appartiennent pas à KOFRA (cabinets
  d'expertise comptable et leurs clients) — cette exigence ne s'arrête pas à la
  frontière du code, elle s'applique à toute personne qui touche au projet.
- Admettre une erreur rapidement plutôt que la couvrir. Un bug de sécurité signalé
  tôt coûte infiniment moins cher qu'un bug découvert en production.

## Ce qui est inacceptable

- Harcèlement, insultes, attaques personnelles, propos discriminatoires — sous
  quelque forme que ce soit, publique ou privée.
- Divulguer, exfiltrer ou utiliser à des fins personnelles des secrets, données de
  cabinet ou données client rencontrés dans le cadre du travail sur KOFRA.
- Contourner délibérément un garde-fou de sécurité (revue obligatoire, CI, gate
  d'approbation) sans l'accord explicite de la personne responsable, même "pour
  gagner du temps".
- Introduire sciemment du code, une dépendance ou une configuration dont on sait
  qu'elle affaiblit la posture zero-knowledge du produit, sans le signaler.
- Toute forme d'intimidation visant à décourager un signalement de bug ou de faille.

## Application

Un manquement à ce code de conduite peut être signalé à Brice (fondateur, cf.
`CLAUDE.md` §1) par le canal de contact habituel de l'équipe. Les signalements sont
traités confidentiellement, avec un retour à la personne qui signale sur la suite
donnée. Une violation peut entraîner un avertissement, un retrait d'accès temporaire
ou définitif au dépôt, ou la fin d'une collaboration, selon la gravité.

Ce document sera revu et étoffé (procédure d'escalade, comité de modération) quand
l'équipe et le nombre de contributeurs externes le justifieront. En attendant, la
règle simple ci-dessus s'applique intégralement.

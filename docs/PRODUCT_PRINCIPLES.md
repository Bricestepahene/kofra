# KOFRA — Principes produit

Dérivé du manifeste (`docs/MANIFESTO.md`) et de la trajectoire (`docs/VISION.md`). Ces principes tranchent toute décision de feature, en Phase 1 comme dans les phases suivantes. En cas de conflit avec une intuition produit ponctuelle, ce document fait foi — une exception se justifie par écrit, jamais implicitement.

## Zero-knowledge : une contrainte produit, pas seulement technique

Le manifeste interdit à KOFRA de lire les secrets métier de ses clients. Ce n'est pas une propriété d'infrastructure protégée après coup — c'est un filtre qui s'applique avant même d'écrire une spec.

Toute feature qui, pour fonctionner, exigerait que le control plane lise un secret en clair (recherche plein texte serveur sur un contenu de coffre, prévisualisation serveur d'un document chiffré, "assistant" analysant un contenu déchiffré, export en clair déclenché côté serveur) est rejetée par construction — pas discutée au cas par cas, pas acceptée "temporairement" pour livrer plus vite. La bonne réponse n'est pas de contourner le zero-knowledge : c'est de redessiner la feature pour qu'elle s'exécute côté client, ou de la refuser. Cela borne aussi les futures features "intelligentes" : elles opèrent sur des métadonnées non sensibles ou en contexte client, jamais sur du contenu déchiffré côté serveur.

## Preuve sans exposition, appliquée au design produit

La promesse de prouver une action sans exposer le secret qui l'a permise se traduit par une règle de conception d'écran : un écran de preuve raconte qui, quoi, quand, dans quel mandat — jamais ce qu'il affiche du contenu protégé. Si une feature d'audit semble avoir besoin du contenu en clair pour être compréhensible, c'est qu'elle est mal conçue, pas qu'une exception est justifiée.

## Trois niveaux de révocation : principe de non-sur-promesse

Le design V1 (§4.4) distingue révocation logique, renforcée et critique — trois garanties réellement différentes. C'est un principe produit qui interdit d'afficher une garantie plus forte que ce que le système a réellement exécuté. Un texte de confirmation de révocation ne doit jamais laisser croire qu'un geste logique a neutralisé un secret déjà copié hors de KOFRA. Avant d'écrire une phrase de confirmation, la question est toujours : quel niveau exact ce bouton déclenche-t-il ? Sans réponse, la feature n'est pas prête à livrer. Ce principe borne aussi tout texte marketing : la limite de promesse du manifeste ("réduit radicalement l'exposition... sans divulgation volontaire du mot de passe") est un plafond, jamais élargi pour une accroche plus vendeuse.

## Le point d'entrée cabinet CEMAC comme filtre de priorisation

KOFRA V1 sert un point d'entrée précis : le cabinet CEMAC, sa multiplicité de clients, ses équipes variables, sa responsabilité professionnelle. Toute feature proposée avant qu'un socle Phase 1 solide ne soit en production doit répondre : sert-elle directement le cabinet à utiliser les accès de ses clients sans les disperser ? Si elle anticipe un besoin de Phase 2-4 sans que la Phase 1 ne l'exige, elle est suspecte par défaut (cf. règle de séquencement, `docs/VISION.md`) — reportée et justifiée explicitement, jamais glissée dans un lot Phase 1 parce qu'elle est techniquement adjacente.

## Le client ne voit jamais le vocabulaire interne

L'ADR 0007 pose que le client ne voit jamais `DEK`, `envelope`, `key rotation` — seulement des intentions (accès, cabinet, personne autorisée, période, activité, révocation). Ce principe couvre toute surface utilisateur : notifications, e-mails, erreurs, aide, support. Règle pratique : avant d'exposer un concept, demander s'il décrit une intention ou une mécanique interne — seule l'intention traverse la frontière produit, même quand un terme technique semble "assez clair".

## Trancher vélocité produit contre rigueur sécurité

CLAUDE.md §0 : la barre de sécurité ne baisse jamais pour aller plus vite. Quand une feature désirable entre en tension avec un invariant (zero-knowledge, hiérarchie de clés, chaîne de preuve, séparation proof/audit), la réponse n'est pas un compromis à la marge — c'est un arrêt et une remontée explicite. La vélocité se gagne en redessinant la feature pour respecter l'invariant (déplacer un traitement côté client, ajouter un niveau de mandat), pas en l'assouplissant. Si aucune reformulation ne fonctionne, la feature attend. Toute exception réelle suit le même chemin que la sécurité : documentée, datée, révisable, jamais silencieuse.

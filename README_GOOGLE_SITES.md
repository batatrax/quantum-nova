# QUANTUM-NOVA — Édition étudiant / Google Sites

## Version retenue

Cette version part de `V6_bis`, car c'est la plus proche d'un vrai outil utilisable par un étudiant : menu plus visible, mode matrices activé, historique cliquable, clavier plus lisible, autocomplétion segmentée et page de droite déjà préparée.

La version `_repo` est plus sobre et légèrement plus prudente visuellement, mais elle laisse les matrices en mode "bientôt" et donne moins de repères immédiats à un étudiant.

## Ce qui a été fusionné / corrigé

- Base fonctionnelle : `V6_bis`.
- Conservation de l'architecture modulaire existante.
- Conservation du mode graphique et de son aide visuelle.
- Conservation du mode matrices activé.
- Correction du module matrices pour être plus exploitable en cours :
  - les cellules acceptent maintenant `1/2`, `-3`, `sqrt(2)` et les décimales avec virgule ;
  - `DET(A)` affiche la formule pour les matrices 2×2 et 3×3 ;
  - `RÉSOUDRE A·x = b` ne se contente plus de montrer le pivot : il conclut clairement sur la solution unique, aucune solution ou infinité de solutions ;
  - la documentation du panneau matrices a été réécrite pour un usage étudiant.
- Retrait d'un message trompeur qui disait que la zone spécialisée matrices arriverait plus tard.
- Titre et statut initial clarifiés pour l'édition étudiant.

## Contrainte Google Sites

Google Sites n'est pas l'endroit idéal pour servir directement un projet multi-fichiers complexe. La voie la plus robuste est :

1. héberger ce dossier tel quel sur GitHub Pages, Netlify, Cloudflare Pages ou équivalent ;
2. dans Google Sites, utiliser `Insertion → Intégrer → URL` ;
3. intégrer `index.html` pour la calculatrice ;
4. intégrer `panel.html` dans une colonne à droite si tu veux conserver la page de droite.

Pour une page Google Sites en deux colonnes :

- colonne gauche : `index.html` ;
- colonne droite : `panel.html`.

Les deux doivent être hébergés au même endroit pour que `BroadcastChannel` synchronise correctement l'aide, le mode graphique, l'export et les matrices.

## À tester dans le navigateur

- Menu `≡ MODES`.
- Mode Calcul : saisie simple, `ANS`, historique cliquable.
- Mode Graphique : `f(x)=sin(x)`, zoom, déplacement, aide à droite.
- Mode Matrices :
  - créer A en 2×2 ;
  - tester `DET(A)` ;
  - tester une cellule `1/2` ;
  - activer `Système A·x = b` ;
  - tester `RÉSOUDRE A·x = b`.
- Intégration dans Google Sites avec deux embeds côte à côte.

## Note importante

Cette version reste un outil pédagogique web. Elle peut aider à comprendre et vérifier les méthodes, mais son usage en évaluation dépend toujours des règles du professeur ou de l'établissement.

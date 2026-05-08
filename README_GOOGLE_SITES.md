# QUANTUM-NOVA V6 — Édition étudiant / Google Sites

## URL stable (à utiliser dans Google Sites)

Le projet est hébergé sur **GitHub Pages** depuis le dépôt
[batatrax/quantum-nova](https://github.com/batatrax/quantum-nova). L'URL
ne change pas entre les versions : elle pointe toujours sur la dernière
version publiée sur la branche `main`.

| Cible                   | URL d'embed                                           |
|-------------------------|-------------------------------------------------------|
| Calculatrice (gauche)   | `https://batatrax.github.io/quantum-nova/index.html`  |
| Panneau d'aide (droite) | `https://batatrax.github.io/quantum-nova/panel.html`  |
| Démo deux iframes       | `https://batatrax.github.io/quantum-nova/demo.html`   |

Pour publier une nouvelle version : commit + push sur `main`. Le workflow
GitHub Actions (`.github/workflows/static.yml`) déploie automatiquement.
L'URL reste la même.

## Contenu de la V6

- **Architecture modulaire** : un répertoire par mode
  (`modes/calc/`, `modes/graph/`, `modes/scientific/`, `modes/matrix/`,
  `modes/stats/`), chaque mode défini par 4 fichiers numérotés
  (`01_mode_*`, `02_keyb_*`, `03_doc_*`, `04_examples_*`).
- **5 modes** :
  - **Calcul** — calcul standard, `ANS`, historique cliquable.
  - **Scientifique** — trigonométrie, log/exp, panneau `MATH ▾`,
    DÉRIVER / SIMPLIFIER / FACTORISER.
  - **Graphique** — tracé de fonctions (V5 préservé), aide visuelle à droite.
  - **Matrices** — wizard 2 étapes, pivot de Gauss étape par étape rendu KaTeX,
    DET(A), INV(A), Aᵀ, TR(A), A+B, A−B, A·B, RREF, RÉSOUDRE A·x=b avec
    conclusion (unique / aucune / infinité de solutions), saisie tolérante
    (`1/2`, `-3`, `sqrt(2)`, virgule), fractions exactes (1/3 plutôt que
    0,333), persistance localStorage.
  - **Statistiques** — module à venir.
- **Clavier intelligent par mode** (`core/loader.js`) :
  - `calc` / `scientific` : grille fixe (chiffres + opérateurs) + zone
    swipeable horizontale (fonctions). Drag-souris + chevron animé.
  - `matrix` : tout en grille fixe 4 colonnes (le pavé numérique de gauche
    serait inutile, les chiffres se tapent dans les cellules).
- **Cosmétique** : touches 3D, transitions fluides, 4 thèmes (Clair par
  défaut, Cyber, Phosphor, Plasma).

## Intégration dans Google Sites

Page Google Sites en deux colonnes :

- **colonne gauche** : intégrer `index.html`
- **colonne droite** : intégrer `panel.html`

Les deux iframes communiquent via `BroadcastChannel('quantum-nova')` :
elles doivent être servies depuis la **même origine** (ici GitHub Pages,
donc `https://batatrax.github.io`) pour que la synchronisation marche
(thème, aide, mode matrices, export…).

Dimensions conseillées :
- iframe gauche : largeur ~400 px, hauteur ~1000 px
- iframe droite : largeur ~480+ px, hauteur ~1000 px

## À tester rapidement après embed

1. Bouton `≡ MODES` ouvre le menu des modules.
2. Mode **Calcul** : taper `2 + 3 × 4 =`, vérifier que le résultat apparaît,
   cliquer dessus dans l'historique, vérifier qu'il se réinjecte.
3. Mode **Graphique** : saisir `f(x) = sin(x)`, voir la courbe à gauche,
   l'aide à droite.
4. Mode **Matrices** :
   - wizard à droite : taille de A = 2×2, "Non, juste A", Continuer.
   - cocher `Système A·x = b`. Remplir : `3, 2, 7` puis `1, -1, 1`.
   - cliquer `RÉSOUDRE A·x = b` à gauche.
   - vérifier que la conclusion arrive : `x = 9/5, y = 4/5` (avec
     `Fractions exactes` coché).

## Note pédagogique

Cet outil aide à comprendre et vérifier les méthodes (le pivot de Gauss
montre chaque opération sur les lignes). Son usage en évaluation reste
soumis aux règles du professeur ou de l'établissement.

## Tag de sauvegarde

L'historique antérieur (V5.1 + une V6 ratée à structure `apps/`) a été
préservé sous le tag `v5-and-failed-v6-archive`. Pour le récupérer :
```
git checkout v5-and-failed-v6-archive
```

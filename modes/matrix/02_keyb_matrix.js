/**
 * modes/matrix/02_keyb_matrix.js
 * Clavier dédié au mode MATRICES.
 *
 * En mode Matrices, la saisie ne va PAS dans la barre #screen mais dans
 * les cellules de A et B affichées dans le panneau de droite. Le pavé
 * numérique de la calc est donc inutile ici — on ne montre que les
 * opérations matricielles. C'est moins de bruit, plus lisible.
 *
 * Le clavier passe en grille fixe 4 colonnes (loader.js désactive le
 * swipe pour le mode matrix).
 */

window.KEYBOARD_MATRIX = {
    columns: 4,
    keys: [
        // Opérations unaires sur A
        { label: 'DET(A)', action: 'matrix-det',   cls: 'key-act', title: 'Déterminant de A — affiche aussi la formule pour 2×2 et 3×3' },
        { label: 'INV(A)', action: 'matrix-inv',   cls: 'key-act', title: 'Inverse A⁻¹ (matrice carrée seulement)' },
        { label: 'Aᵀ',     action: 'matrix-trans', cls: 'key-act', title: 'Transposée de A' },
        { label: 'TR(A)',  action: 'matrix-trace', cls: 'key-act', title: 'Trace de A (somme de la diagonale)' },

        // Opérations binaires A ∘ B
        { label: 'A + B',  action: 'matrix-add', cls: 'key-act', title: 'Somme A + B' },
        { label: 'A − B',  action: 'matrix-sub', cls: 'key-act', title: 'Différence A − B' },
        { label: 'A × B',  action: 'matrix-mul', cls: 'key-act', title: 'Produit matriciel A × B' },
        { label: 'RREF',   action: 'matrix-rref', cls: 'key-act', title: 'Forme échelonnée réduite (pivot de Gauss complet)' },

        // Résolution + retour aux tailles
        { label: 'RÉSOUDRE A·x = b', action: 'matrix-solve', cls: 'key-act', span: 3, title: 'Résout le système. Conclut : solution unique, aucune ou infinité.' },
        { label: '↻ TAILLES', action: 'matrix-define-a', cls: 'key-mem', span: 1, title: 'Modifier les tailles de A et B (les valeurs saisies sont conservées)' }
    ]
};

/**
 * keyboards/stats.js
 * Clavier dédié au mode STATISTIQUES (séries de données + lois usuelles).
 * Les formulaires de saisie (n, k, p, μ, σ) vivent dans la zone graphique ;
 * ce clavier sert au pavé numérique + boutons de calcul.
 */

window.KEYBOARD_STATS = {
    columns: 4,
    keys: [
        // Boutons de calcul par section
        { label: 'STATS DESCRIPTIVES',     action: 'stats-descriptive',  cls: 'key-act', span: 4, title: 'Moyenne, médiane, écart-type, variance' },
        { label: 'COMBINATOIRE n!, nCr, nPr', action: 'stats-comb',     cls: 'key-act', span: 4, title: 'Factorielle, combinaisons, arrangements' },
        { label: 'LOI BINOMIALE B(n, p)',  action: 'stats-binomial',     cls: 'key-act', span: 4, title: 'P(X=k), P(X≤k), espérance, variance' },
        { label: 'LOI NORMALE N(μ, σ)',    action: 'stats-normal',       cls: 'key-act', span: 4, title: 'Densité f(x) et P(X≤x)' },

        // Édition
        { label: 'C',  action: 'clear',     cls: 'key-clear' },
        { label: '⌫',  action: 'backspace', cls: 'key-clear' },
        { label: '−',  insert: '-',         cls: 'key-op',    title: 'Signe négatif' },
        { label: '.',  insert: '.',         cls: 'key-num' },

        // Pavé numérique + virgule pour saisir des séries "12, 15, 10"
        { label: '7', insert: '7', cls: 'key-num' },
        { label: '8', insert: '8', cls: 'key-num' },
        { label: '9', insert: '9', cls: 'key-num' },
        { label: ',', insert: ',', cls: 'key-sci', title: 'Séparateur de série' },

        { label: '4', insert: '4', cls: 'key-num' },
        { label: '5', insert: '5', cls: 'key-num' },
        { label: '6', insert: '6', cls: 'key-num' },
        { label: '⏎', action: 'evaluate', cls: 'key-act', title: 'Valider [Entrée]' },

        { label: '1', insert: '1', cls: 'key-num' },
        { label: '2', insert: '2', cls: 'key-num' },
        { label: '3', insert: '3', cls: 'key-num' },
        { label: '0', insert: '0', cls: 'key-num' }
    ]
};

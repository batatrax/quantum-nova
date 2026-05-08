/**
 * keyboards/algebra.js
 * Clavier ALGÈBRE — inspiré de la NumWorks : peu de touches à l'écran,
 * les fonctions courantes seulement. Une touche MATH ouvre un panneau
 * thématique pour les fonctions rares (trigo inverse, hyperboliques,
 * racines, nombres) et les actions formelles (dériver, simplifier,
 * factoriser) pour ne pas encombrer l'écran principal.
 *
 * Layout 6 colonnes × 7 lignes :
 *   • cols 1-3 : fonctions courantes
 *   • cols 4-6 : pavé numérique compact
 *   • dernière ligne : ⏎ ÉVALUER full-width
 */

window.KEYBOARD_SCIENTIFIC = {
    columns: 6,
    keys: [
        /* ----- Ligne 1 : trigo + chiffres 7-8-9 ----- */
        { label: 'sin',  insert: 'sin(',  cls: 'key-sci', title: 'Sinus' },
        { label: 'cos',  insert: 'cos(',  cls: 'key-sci', title: 'Cosinus' },
        { label: 'tan',  insert: 'tan(',  cls: 'key-sci', title: 'Tangente' },
        { label: '7',    insert: '7',     cls: 'key-num' },
        { label: '8',    insert: '8',     cls: 'key-num' },
        { label: '9',    insert: '9',     cls: 'key-num' },

        /* ----- Ligne 2 : logs + chiffres 4-5-6 ----- */
        { label: 'ln',   insert: 'log(',  cls: 'key-sci', title: 'Logarithme népérien (base e)' },
        { label: 'log',  insert: 'log10(',cls: 'key-sci', title: 'Logarithme décimal (base 10)' },
        { label: 'exp',  insert: 'exp(',  cls: 'key-sci', title: 'Exponentielle e^x' },
        { label: '4',    insert: '4',     cls: 'key-num' },
        { label: '5',    insert: '5',     cls: 'key-num' },
        { label: '6',    insert: '6',     cls: 'key-num' },

        /* ----- Ligne 3 : puissances/racines + chiffres 1-2-3 ----- */
        { label: 'x²',   insert: '^2',    cls: 'key-sci', title: 'Carré' },
        { label: '√',    insert: 'sqrt(', cls: 'key-sci', title: 'Racine carrée' },
        { label: 'xⁿ',   insert: '^',     cls: 'key-sci', title: 'Puissance' },
        { label: '1',    insert: '1',     cls: 'key-num' },
        { label: '2',    insert: '2',     cls: 'key-num' },
        { label: '3',    insert: '3',     cls: 'key-num' },

        /* ----- Ligne 4 : constantes/variable + ± 0 . ----- */
        { label: 'π',    insert: 'pi',    cls: 'key-sci', title: 'Constante π' },
        { label: 'e',    insert: 'e',     cls: 'key-sci', title: 'Constante e' },
        { label: 'x',    insert: 'x',     cls: 'key-mem', title: 'Variable x' },
        { label: '±',    action: 'negate',cls: 'key-mem', title: 'Inverser le signe' },
        { label: '0',    insert: '0',     cls: 'key-num' },
        { label: '.',    insert: '.',     cls: 'key-num' },

        /* ----- Ligne 5 : MATH + ANS + = + opérateurs ÷ × − ----- */
        { label: 'MATH ▾', action: 'open-math', cls: 'key-act', title: 'Fonctions avancées : trigo inverse, hyperboliques, racines, |x|, n!, dériver, simplifier, factoriser' },
        { label: 'ANS',    action: 'ans',       cls: 'key-mem', title: 'Dernier résultat' },
        { label: '=',      insert: '=',         cls: 'key-mem', title: 'Égalité (ex : a = 3)' },
        { label: '÷',      insert: '/',         cls: 'key-op' },
        { label: '×',      insert: '*',         cls: 'key-op' },
        { label: '−',      insert: '-',         cls: 'key-op' },

        /* ----- Ligne 6 : édition + parenthèses + virgule + + ----- */
        { label: '⌫',    action: 'backspace', cls: 'key-clear', title: 'Effacer le dernier caractère' },
        { label: 'C',    action: 'clear',     cls: 'key-clear', title: 'Effacer la saisie' },
        { label: '(',    insert: '(',         cls: 'key-sci' },
        { label: ')',    insert: ')',         cls: 'key-sci' },
        { label: ',',    insert: ',',         cls: 'key-sci', title: 'Séparateur d\'arguments' },
        { label: '+',    insert: '+',         cls: 'key-op' },

        /* ----- Ligne 7 : ÉVALUER full-width ----- */
        { label: '⏎  ÉVALUER', action: 'evaluate', cls: 'key-act', span: 6, title: 'Évaluer la saisie [Entrée]' }
    ]
};

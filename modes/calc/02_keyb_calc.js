/**
 * keyboards/base.js
 * Clavier "calculatrice standard" — utilisé par le mode CALCUL et comme
 * défaut au démarrage. Volontairement minimal pour qu'un collégien le
 * comprenne en 2 secondes.
 *
 * Ajouts par rapport à la V5 : %, ± — les deux touches que l'on retrouve
 * sur toute calculatrice basique.
 */

window.KEYBOARD_CALC = {
    columns: 5,
    keys: [
        // Swipeable functions
        { label: '√',   insert: 'sqrt(',      cls: 'key-sci',   title: 'Racine carrée' },
        { label: 'x²',  insert: '^2',         cls: 'key-sci',   title: 'Carré' },
        { label: 'π',   insert: 'pi',         cls: 'key-sci',   title: 'Nombre Pi' },
        { label: '%',   action: 'percent',    cls: 'key-sci',   title: 'Pourcentage' },
        { label: '(',   insert: '(',          cls: 'key-sci' },
        { label: ')',   insert: ')',          cls: 'key-sci' },
        { label: '±',   action: 'negate',     cls: 'key-sci',   title: 'Inverser le signe' },

        // Main Grid (Fixed)
        { label: '7',   insert: '7',         cls: 'key-num' },
        { label: '8',   insert: '8',         cls: 'key-num' },
        { label: '9',   insert: '9',         cls: 'key-num' },
        { label: '÷',   insert: '/',         cls: 'key-op' },
        { label: 'C',   action: 'clear',     cls: 'key-clear' },

        { label: '4',   insert: '4',         cls: 'key-num' },
        { label: '5',   insert: '5',         cls: 'key-num' },
        { label: '6',   insert: '6',         cls: 'key-num' },
        { label: '×',   insert: '*',         cls: 'key-op' },
        { label: '⌫',   action: 'backspace', cls: 'key-clear' },

        { label: '1',   insert: '1',         cls: 'key-num' },
        { label: '2',   insert: '2',         cls: 'key-num' },
        { label: '3',   insert: '3',         cls: 'key-num' },
        { label: '−',   insert: '-',         cls: 'key-op' },
        { label: 'ANS', action: 'ans',       cls: 'key-act' },

        { label: '0',   insert: '0',         cls: 'key-num' },
        { label: '.',   insert: '.',         cls: 'key-num' },
        { label: 'EXE', action: 'evaluate',  cls: 'key-act', span: 2 },
        { label: '+',   insert: '+',         cls: 'key-op' }
    ]
};

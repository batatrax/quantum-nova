/**
 * modes/graph/02_keyb_graph.js
 * Le mode GRAPHIQUE réutilise le clavier scientifique (mêmes touches sin,
 * cos, log, MATH ▾, chiffres). Au lieu de dupliquer la définition, on
 * pose un alias : KEYBOARD_GRAPH = KEYBOARD_SCIENTIFIC.
 *
 * Le jour où le mode Graphique aura besoin de touches qui lui sont
 * propres, on remplacera l'alias par une vraie définition de clavier ici.
 */

// L'alias est résolu au moment du loadKeyboard, pas ici, car KEYBOARD_SCIENTIFIC
// peut être chargé après ce fichier. On expose un getter.
Object.defineProperty(window, 'KEYBOARD_GRAPH', {
    configurable: true,
    get() { return window.KEYBOARD_SCIENTIFIC; }
});

/**
 * modes/calc/mode.js
 * Mode CALCUL — calculatrice standard, mode permanent par défaut.
 *
 * Plus de carte dans le menu : ce mode est toujours actif en arrière-plan.
 * L'évaluation passe par mathjs et le résultat est consigné via le service
 * partagé QNHistory (core/history.js) qui rend le DOM dans #calcHistory.
 */

window.MODE_HANDLERS = window.MODE_HANDLERS || {};

(function () {
    'use strict';

    /**
     * Évalue une expression numérique simple via mathjs.
     * @returns {{ok: true, value: string} | {ok: false, error: string}}
     */
    function evaluateSimple(expression) {
        if (typeof math === 'undefined' || !math || typeof math.evaluate !== 'function') {
            return { ok: false, error: 'Moteur math indisponible' };
        }
        try {
            const v = math.evaluate(expression);
            return { ok: true, value: math.format(v, { precision: 10 }) };
        } catch (e) {
            return { ok: false, error: e.message || 'expression invalide' };
        }
    }

    /**
     * Hook : valide la saisie courante et consigne le résultat dans QNHistory.
     * Appelé soit par le bouton ⏎ ÉVALUER (via keyboards/loader.js), soit par
     * l'intercepteur Entrée du clavier physique (ci-dessous).
     */
    function onEvaluate() {
        const screen = document.getElementById('screen');
        if (!screen) return;

        // Auto-fermeture des parenthèses oubliées avant évaluation.
        // Pratique pour `sqrt(9` → `sqrt(9)` sans avoir à taper `)`.
        if (window.QNAutocomplete && QNAutocomplete.autoCloseParens) {
            QNAutocomplete.autoCloseParens(screen);
        }

        const expr = (screen.value || '').trim();
        if (!expr) return;

        const out = evaluateSimple(expr);
        if (out.ok) {
            QNHistory.add(expr, out.value, { source: 'calc' });
        } else {
            QNHistory.add(expr, out.error, { isError: true, source: 'calc' });
        }
        // La saisie reste affichée pour permettre la correction. On la
        // sélectionne pour que la prochaine frappe la remplace facilement.
        screen.focus();
        screen.select();
    }

    function getLastResult() {
        return QNHistory.getLast();
    }

    window.MODE_HANDLERS.calc = {
        label: 'CALCUL',

        apply() {
            const screen = document.getElementById('screen');
            if (screen) screen.placeholder = 'Tape ton calcul (ex : 2 + 3 × 4)';
        },

        // Méthodes utilisées par keyboards/loader.js
        onEvaluate,
        getLastResult
    };

    /**
     * Interception de la touche Entrée du clavier physique en capture-phase
     * pour court-circuiter le listener V5 (qui appelle executer() — utile
     * uniquement en mode Graphique). Le mode Graphique est exclu de cette
     * interception.
     */
    document.addEventListener('DOMContentLoaded', () => {
        const screen = document.getElementById('screen');
        if (!screen) return;

        screen.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            const cls = (document.body && document.body.className) || '';
            const mode = (cls.match(/\bmode-([a-z]+)\b/) || [])[1] || 'calc';
            if (mode === 'graph') return;     // V5 gère seul (tracé)
            e.stopPropagation();
            e.preventDefault();
            onEvaluate();
        }, true);
    });
})();

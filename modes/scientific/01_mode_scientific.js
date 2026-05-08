/**
 * modes/algebra.js
 * Mode ALGÈBRE — calcul formel symbolique.
 * Gère aussi le panneau MATH ▾ qui regroupe les fonctions avancées
 * (trigo inverse, hyperboliques, racines, nombres, calcul formel)
 * pour ne pas encombrer le clavier principal.
 */

window.MODE_HANDLERS = window.MODE_HANDLERS || {};

(function () {
    'use strict';

    function getToolbox() {
        return document.getElementById('scientificToolbox');
    }

    function ouvrirMath() {
        const tb = getToolbox();
        if (tb) tb.classList.add('open');
    }

    function fermerMath() {
        const tb = getToolbox();
        if (tb) tb.classList.remove('open');
    }

    function toggleMath() {
        const tb = getToolbox();
        if (!tb) return;
        tb.classList.toggle('open');
    }

    /**
     * Délégation des clics dans le panneau MATH :
     *   • data-fn  → insère le snippet dans la saisie
     *   • data-action → déclenche une action via le dispatch loader
     *     (derive / simplify / rationalize)
     */
    function bindToolboxActions() {
        const tb = getToolbox();
        if (!tb) return;
        tb.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-fn], button[data-action]');
            if (!btn) return;

            if (btn.dataset.fn !== undefined) {
                if (typeof inserer === 'function') inserer(btn.dataset.fn);
                fermerMath();
                const screen = document.getElementById('screen');
                if (screen) screen.focus();
                return;
            }

            if (btn.dataset.action) {
                fermerMath();
                wrapAndEval(btn.dataset.action);
            }
        });
    }

    /**
     * Enrobe la saisie courante avec une fonction de calcul formel,
     * puis évalue. Identique à la logique de keyboards/loader.js mais
     * accessible aussi depuis le panneau MATH.
     */
    function wrapAndEval(actionId) {
        const screen = document.getElementById('screen');
        if (!screen) return;
        const v = (screen.value || '').trim();
        if (!v) {
            if (typeof ajouterLog === 'function') {
                ajouterLog('Scientifique', 'Saisis d\'abord une expression dans la barre.', 'var(--text-warn, orange)');
            }
            return;
        }

        let prefix = '', suffix = '';
        if (actionId === 'derive')           { prefix = 'derivative('; suffix = ', x)'; }
        else if (actionId === 'simplify')    { prefix = 'simplify(';   suffix = ')'; }
        else if (actionId === 'rationalize') { prefix = 'rationalize('; suffix = ')'; }
        else return;

        screen.value = prefix + v + suffix;
        // Le résultat va dans la zone CALCULATRICE visible du menu, pas
        // dans le log V5 masqué.
        if (window.MODE_HANDLERS && window.MODE_HANDLERS.calc
                && typeof window.MODE_HANDLERS.calc.onEvaluate === 'function') {
            window.MODE_HANDLERS.calc.onEvaluate();
        } else if (typeof executer === 'function') {
            executer();
        }
    }

    window.MODE_HANDLERS.scientific = {
        label: 'SCIENTIFIQUE',
        apply() {
            const screen = document.getElementById('screen');
            if (screen) screen.placeholder = 'Tape une expression (ex : sin(45 deg) ou x^2 + 3x)';
            // S'assurer que le panneau est fermé en entrant dans le mode
            fermerMath();
        }
    };

    window.ouvrirMath = ouvrirMath;
    window.fermerMath = fermerMath;
    window.toggleMath = toggleMath;

    document.addEventListener('DOMContentLoaded', bindToolboxActions);
})();

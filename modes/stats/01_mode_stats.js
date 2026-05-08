/**
 * modes/stats.js
 * Mode STATISTIQUES — séries descriptives, combinatoire, lois usuelles.
 *
 * Étape actuelle : placeholder uniquement. Les formulaires de saisie
 * (n, k, p, μ, σ) viendront s'ajouter dans la zone graphique à
 * l'étape suivante.
 */

window.MODE_HANDLERS = window.MODE_HANDLERS || {};

window.MODE_HANDLERS.stats = {
    label: 'STATISTIQUES',

    apply() {
        const screen = document.getElementById('screen');
        if (screen) screen.placeholder = 'Saisis une série (ex : 12, 15, 10) puis lance un calcul';
    }
};

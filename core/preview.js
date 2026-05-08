/**
 * core/preview.js
 * Aperçu graphique en temps réel de la saisie (#screen) au-dessus de la
 * barre de saisie. Utilise math.js pour parser l'expression, puis KaTeX
 * pour rendre le LaTeX correspondant.
 *
 * Pipeline :
 *   #screen.value  ──[ math.parse(...).toTex() ]──→  LaTeX  ──[ katex.render ]──→  formule
 *
 * Si l'expression est syntaxiquement invalide, on affiche un état atténué
 * "syntaxe en cours…" plutôt qu'une grosse erreur — l'utilisateur est en
 * train de taper, c'est normal qu'elle soit incomplète.
 */

(function () {
    'use strict';

    function tryRender(expr, host) {
        if (!host) return;
        host.replaceChildren();

        if (!expr) return;

        if (typeof math === 'undefined' || typeof katex === 'undefined') {
            host.textContent = '(KaTeX en chargement…)';
            return;
        }

        let tex = '';
        try {
            tex = math.parse(expr).toTex({ parenthesis: 'auto', implicit: 'show' });
        } catch (e) {
            const span = document.createElement('span');
            span.className = 'latex-preview-pending';
            span.textContent = expr;     // affiche le brut tant que pas parsable
            host.appendChild(span);
            return;
        }

        try {
            // KaTeX gère lui-même son rendu DOM. Pas de risque XSS car
            // tex est généré par math.js (lib contrôlée), pas par l'utilisateur.
            katex.render(tex, host, {
                throwOnError: false,
                displayMode: false,
                output: 'htmlAndMathml'
            });
        } catch (e) {
            host.textContent = expr;
        }
    }

    function setup() {
        const screen = document.getElementById('screen');
        const host = document.getElementById('latexPreview');
        if (!screen || !host) return;

        const update = () => tryRender(screen.value, host);
        screen.addEventListener('input', update);
        update();   // rendu initial si déjà du contenu
    }

    document.addEventListener('DOMContentLoaded', setup);

    // Expose pour que d'autres modules (historique, export) puissent
    // demander un rendu LaTeX d'une expression arbitraire.
    window.QNPreview = {
        toLatex(expr) {
            if (!expr || typeof math === 'undefined') return '';
            try {
                return math.parse(expr).toTex({ parenthesis: 'auto', implicit: 'show' });
            } catch (e) {
                return '';
            }
        },
        renderInto(latex, host, opts) {
            if (!host) return;
            host.replaceChildren();
            if (typeof katex === 'undefined' || !latex) return;
            try {
                katex.render(latex, host, Object.assign({
                    throwOnError: false,
                    displayMode: false,
                    output: 'htmlAndMathml'
                }, opts || {}));
            } catch (e) { /* silencieux */ }
        }
    };
})();

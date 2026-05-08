/**
 * core/canvas-resize.js
 * Garantit que le canvas du grapheur reste calé sur la taille réelle du
 * container, même quand le layout change sans déclencher window.resize :
 *   - bascule de mode (le canvas passe de masqué à visible et le container
 *     prend brusquement sa hauteur de flex-grow)
 *   - bascule responsive du layout tout-en-un (.qn-app passe row → column)
 *   - changement de classe sur body (mode-graph appliquée tardivement)
 *
 * Sans ça : la fonction resizeCanvas() de engine.js n'est rappelée qu'au
 * resize de la fenêtre, donc le canvas garde des coords internes périmées
 * → on voit une bande noire en bas et le glisser-déposer ne fonctionne
 * que sur la zone correspondant aux anciennes dimensions internes.
 */

(function () {
    'use strict';

    let lastW = 0, lastH = 0;
    let pending = null;

    function callResize() {
        if (typeof window.resizeCanvas === 'function') window.resizeCanvas();
    }

    function schedule() {
        if (pending) cancelAnimationFrame(pending);
        pending = requestAnimationFrame(() => {
            pending = null;
            callResize();
        });
    }

    function init() {
        const container = document.getElementById('canvasContainer');
        if (!container) return;

        if (typeof ResizeObserver === 'function') {
            const obs = new ResizeObserver(entries => {
                for (const e of entries) {
                    const r = e.contentRect;
                    // Ignore les micro-changements (≤ 1 px) qui peuvent venir
                    // de variations de scrollbar et déclencher des boucles.
                    if (Math.abs(r.width - lastW) < 1 && Math.abs(r.height - lastH) < 1) continue;
                    lastW = r.width; lastH = r.height;
                    schedule();
                }
            });
            obs.observe(container);
        }

        // Filet de sécurité : si la classe mode-graph est posée tardivement
        // sur body (après le DOMContentLoaded), on force un resize.
        const bodyObs = new MutationObserver(muts => {
            for (const m of muts) {
                if (m.attributeName === 'class') { schedule(); break; }
            }
        });
        if (document.body) bodyObs.observe(document.body, { attributes: true });

        // Et un resize initial après que tout est en place.
        schedule();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

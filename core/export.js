/**
 * core/export.js
 * Bouton 📤 EXPORT du brand-header. Au clic, on collecte un instantané
 * de l'état exportable de la calc (historique des calculs, saisie courante,
 * graphique éventuel, mode actif) et on l'envoie au panel annexe via
 * BroadcastChannel. Le panel affiche alors la VUE EXPORT (choix du contenu,
 * choix du format, prévisualisation, téléchargement).
 *
 * Tout le rendu vit côté panel — ici on se contente de pousser les données.
 */

(function () {
    'use strict';

    let chan = null;
    try { chan = new BroadcastChannel('quantum-nova'); } catch (e) { chan = null; }

    /** Récupère le mode actif depuis la classe du body (mode-<id>) */
    function getCurrentMode() {
        const cls = (document.body && document.body.className) || '';
        const m = cls.match(/\bmode-([a-z]+)\b/);
        return m ? m[1] : 'calc';
    }

    /** Encode le canvas du grapheur en data-URL PNG (si présent et non vide) */
    function captureCanvas() {
        const canvas = document.getElementById('mathCanvas');
        if (!canvas) return null;
        try {
            return canvas.toDataURL('image/png');
        } catch (e) {
            return null;
        }
    }

    /**
     * Construit le snapshot exportable :
     *   - mode courant
     *   - saisie courante (#screen.value)
     *   - historique des calculs (depuis QNHistory)
     *   - graphique (PNG data-URL)
     */
    function buildSnapshot() {
        const screen = document.getElementById('screen');
        const history = (window.QNHistory && QNHistory.getEntries)
            ? QNHistory.getEntries()
            : [];
        return {
            mode: getCurrentMode(),
            expression: screen ? (screen.value || '') : '',
            history,
            canvasPng: captureCanvas(),
            ts: new Date().toISOString()
        };
    }

    function open() {
        const data = buildSnapshot();
        const msg = { type: 'show-export', data };
        let delivered = false;
        if (chan) { try { chan.postMessage(msg); delivered = true; } catch (e) {} }
        try { window.dispatchEvent(new CustomEvent('qn-bus', { detail: msg })); delivered = true; } catch (e) {}
        // Fallback ultime si aucun canal n'a accepté le message
        if (!delivered) window.print();
    }

    window.QNExport = { open, buildSnapshot };
})();

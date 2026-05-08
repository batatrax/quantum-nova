/**
 * modes/graph.js
 * Mode GRAPHIQUE — grapheur de fonctions (cœur historique de la V5).
 *
 * Le clavier scientifique de l'algèbre est réutilisé tel quel ; la touche
 * "Outils ▾" de la barre de saisie révèle un panneau dédié regroupant
 * les actions propres au tracé (vue, effacement, ombrage, analyse, export).
 * Ces actions sont déléguées au moteur V5 (resetVue, effacerGraphe…).
 */

window.MODE_HANDLERS = window.MODE_HANDLERS || {};

(function () {
    'use strict';

    let graphHelpChannel = null;
    try { graphHelpChannel = new BroadcastChannel('quantum-nova'); } catch (e) { graphHelpChannel = null; }

    function showGraphHelpInSidePanel() {
        if (!graphHelpChannel) return;
        try { graphHelpChannel.postMessage({ type: 'show-help', section: 'graph' }); }
        catch (e) { /* panneau annexe indisponible */ }
    }

    function getPanel()  { return document.getElementById('graphToolsPanel'); }
    function getButton() { return document.getElementById('graphToolsBtn'); }

    function ouvrirGraphTools() {
        const p = getPanel(); if (p) p.classList.add('open');
        const b = getButton(); if (b) b.classList.add('is-open');
    }

    function fermerGraphTools() {
        const p = getPanel(); if (p) p.classList.remove('open');
        const b = getButton(); if (b) b.classList.remove('is-open');
    }

    function toggleGraphTools() {
        const p = getPanel(); if (!p) return;
        const open = p.classList.toggle('open');
        const b = getButton(); if (b) b.classList.toggle('is-open', open);
    }

    /**
     * Dispatch d'une action de la barre d'outils tracé vers la fonction
     * V5 correspondante. Toutes ces fonctions vivent dans engine.js / ui.js
     * et opèrent directement sur le canvas.
     */
    function dispatchGraphAction(action) {
        switch (action) {
            case 'reset-view':
                if (typeof resetVue === 'function') resetVue();
                break;
            case 'clear-graph':
                if (typeof effacerGraphe === 'function') effacerGraphe();
                break;
            case 'export-png':
                if (typeof exportPNG === 'function') exportPNG();
                break;
            case 'shade-area':
                if (typeof promptShade === 'function') promptShade();
                break;
            case 'analyse':
                if (typeof setAnalyse === 'function' && typeof analyseEnabled !== 'undefined') {
                    setAnalyse(!analyseEnabled);
                }
                break;
        }
        // Le panneau se ferme après l'action — l'utilisateur veut voir
        // l'effet sur le canvas, pas garder le menu ouvert par-dessus.
        fermerGraphTools();
    }

    function detacherGraphPanneau() {
        // Stub palier 1 : la logique de détachement (popup + intra-calc)
        // arrive au palier 2. On consigne l'intention dans le log V5.
        if (typeof ajouterLog === 'function') {
            ajouterLog('Graphique', 'Détachement du panneau : disponible au prochain palier.', 'var(--text-warn, orange)');
        }
    }

    function bindActions() {
        const p = getPanel(); if (!p) return;
        p.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-graph-action]');
            if (!btn) return;
            dispatchGraphAction(btn.dataset.graphAction);
        });
    }

    window.MODE_HANDLERS.graph = {
        label: 'GRAPHIQUE',

        apply() {
            const screen = document.getElementById('screen');
            if (screen) screen.placeholder = 'f(x) = sin(x)   |   tape une fonction puis ⏎';

            // La page de droite devient automatiquement le mémo du mode graphique.
            showGraphHelpInSidePanel();

            // Le canvas vient peut-être d'apparaître (display:none → block via
            // body.mode-graph). Ses coords internes peuvent être périmées. On
            // force un resize avant le redessin pour éviter la zone noire en
            // bas et le glisser partiel.
            if (typeof window.resizeCanvas === 'function') {
                requestAnimationFrame(() => {
                    try { window.resizeCanvas(); } catch (e) { /* moteur pas prêt */ }
                    if (typeof dessiner === 'function') {
                        try { dessiner(); } catch (e) {}
                    }
                });
            } else if (typeof dessiner === 'function') {
                try { dessiner(); } catch (e) {}
            }

            // S'assurer que le panneau est fermé en entrant dans le mode
            fermerGraphTools();
        }
    };

    window.toggleGraphTools = toggleGraphTools;
    window.fermerGraphTools = fermerGraphTools;
    window.detacherGraphPanneau = detacherGraphPanneau;

    document.addEventListener('DOMContentLoaded', bindActions);
})();

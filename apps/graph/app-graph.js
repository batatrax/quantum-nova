/**
 * app-graph.js
 * Logique d'encapsulation du grapheur V5 pour la V6.
 */

const GraphApp = {
    canvas: null,
    ctx: null,
    _initialized: false,

    init() {
        console.log("Graph App Initialisée");
        this.canvas = document.getElementById('mathCanvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });

        // On branche les références globales attendues par le code V5
        window.canvas = this.canvas;
        window.ctx = this.ctx;
        window.inputScreen = document.getElementById('screen');
        window.coordsText = document.getElementById('coordsText');
        window.statusLed = document.getElementById('led');
        window.statusText = document.getElementById('statusText');
        window.historyLog = document.getElementById('historyLog');
        window.angleModeBtn = document.getElementById('angleModeBtn');
        window.angleModeLabel = document.getElementById('angleModeLabel');

        // Initialisation du moteur V5 (réutilisé) — toujours rejouée car le
        // template tpl-graph est cloné à neuf à chaque entrée dans la vue.
        if (typeof resizeCanvas === 'function') resizeCanvas();
        if (typeof setupMouseEvents === 'function') setupMouseEvents();
        if (typeof setupTouchEvents === 'function') setupTouchEvents();
        if (typeof setupKeyboardEvents === 'function') setupKeyboardEvents();
        if (typeof setupResizeHandle === 'function') setupResizeHandle();

        // Loaders à n'exécuter qu'une seule fois par session (lecture
        // localStorage / URL). Le DOMContentLoaded de engine.js a été
        // shunté pour éviter un crash sur canvas absent → on rattrape ici.
        if (!this._initialized) {
            if (typeof loadKeyboardProfile === 'function') loadKeyboardProfile();
            if (typeof loadScreenHeight === 'function') loadScreenHeight();
            if (typeof loadInteractionPreferences === 'function') loadInteractionPreferences();
            if (typeof loadStateFromURL === 'function') loadStateFromURL();
            this._initialized = true;
        }

        // Message de bienvenue spécifique
        ajouterLog('Grapheur', 'Moteur STELLAR V5 chargé. Prêt pour le tracé.', 'var(--v6-accent)');

        if (typeof dessiner === 'function') dessiner();

        // Focus auto
        window.inputScreen.focus();
    }
};

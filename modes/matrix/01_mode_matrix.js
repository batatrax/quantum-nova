/**
 * modes/matrix/01_mode_matrix.js
 * Mode MATRICES — côté calculatrice principale.
 *
 * L'éditeur (wizard + grilles + résultat KaTeX) vit dans le panneau de
 * droite (panel.html, voir 05_panel_matrix.js). Cette face-ci est
 * minimaliste :
 *   - elle affiche un récap dans la zone graphique ("A : 3×3, B : 3×3 —
 *     remplis dans le panneau de droite");
 *   - elle traduit les clics du clavier en messages BroadcastChannel ;
 *   - elle reçoit les changements d'état du panneau pour mettre à jour
 *     ce récap et griser/dégriser les boutons binaires (A+B, A·B, A−B)
 *     selon que l'utilisateur a défini une matrice B ou non.
 */

(function () {
    'use strict';

    const STATE = {
        hasB: 'same', augmented: false,
        rowsA: 3, colsA: 3, rowsB: 3, colsB: 3,
        step: 'setup'
    };

    let chan = null;
    try { chan = new BroadcastChannel('quantum-nova'); } catch (e) { chan = null; }

    function send(msg) {
        if (chan) { try { chan.postMessage(msg); } catch (e) {} }
        // Fallback intra-fenêtre : essentiel pour le mode tout-en-un (un
        // seul iframe contenant calc + panneau intégré).
        try { window.dispatchEvent(new CustomEvent('qn-bus', { detail: msg })); } catch (e) {}
    }

    // ===========================================================
    // RÉCAP dans canvasContainer
    // ===========================================================
    function ensureRecap() {
        let r = document.getElementById('matrixRecap');
        if (r) return r;
        r = document.createElement('div');
        r.id = 'matrixRecap';
        r.className = 'matrix-recap';
        const canvas = document.getElementById('canvasContainer');
        (canvas || document.body).appendChild(r);
        return r;
    }

    function renderRecap() {
        const r = ensureRecap();
        r.replaceChildren();

        const arrow = document.createElement('div');
        arrow.className = 'matrix-recap-arrow';
        arrow.textContent = '→';
        arrow.title = 'Édition dans le panneau de droite';

        const card = document.createElement('div');
        card.className = 'matrix-recap-card';

        const h = document.createElement('h3');
        h.textContent = 'Mode Matrices';
        card.appendChild(h);

        const dims = document.createElement('div');
        dims.className = 'matrix-recap-dims';
        const aDim = `A : ${STATE.rowsA} × ${STATE.colsA}` + (STATE.augmented ? '  | b' : '');
        const bDim = STATE.hasB === 'none' ? 'pas de B' : `B : ${STATE.rowsB} × ${STATE.colsB}`;
        dims.textContent = `${aDim}   •   ${bDim}`;
        card.appendChild(dims);

        const tip = document.createElement('p');
        tip.className = 'matrix-recap-tip';
        tip.textContent = STATE.step === 'setup'
            ? 'Choisis les tailles dans le panneau de droite, puis clique « Continuer ».'
            : 'Remplis tes matrices à droite, puis clique sur une opération du clavier ci-dessous.';
        card.appendChild(tip);

        r.appendChild(card);
        r.appendChild(arrow);
    }

    // ===========================================================
    // ÉTAT DU CLAVIER (boutons B grisés si pas de B)
    // ===========================================================
    function updateKeyboardState() {
        const noB = STATE.hasB === 'none';
        const needsB = new Set(['matrix-add', 'matrix-sub', 'matrix-mul']);
        document.querySelectorAll('.main-grid .key').forEach(btn => {
            const action = btn.dataset.action || '';
            if (needsB.has(action)) {
                btn.disabled = noB;
                btn.classList.toggle('key-disabled', noB);
                btn.title = noB
                    ? 'Active une matrice B (↻ Modifier les tailles dans le panneau) pour utiliser cette opération'
                    : (btn.dataset.titleOriginal || '');
            }
        });
    }

    // ===========================================================
    // ÉCOUTE de l'état envoyé par le panneau
    // ===========================================================
    function onIncomingMessage(msg) {
        if (!msg) return;
        if (msg.type === 'matrix-state' && msg.state) {
            Object.assign(STATE, msg.state);
            if (document.body.classList.contains('mode-matrix')) {
                renderRecap();
                updateKeyboardState();
            }
        }
    }
    if (chan) {
        chan.addEventListener('message', ev => onIncomingMessage(ev.data || {}));
    }
    window.addEventListener('qn-bus', ev => onIncomingMessage(ev.detail || {}));

    // ===========================================================
    // HANDLERS du clavier (broadcast vers le panneau)
    // ===========================================================
    function action(name) { return () => send({ type: 'matrix-action', action: name }); }

    // ===========================================================
    // Enregistrement du mode
    // ===========================================================
    window.MODE_HANDLERS = window.MODE_HANDLERS || {};
    window.MODE_HANDLERS.matrix = {
        label: 'MATRICES',
        apply() {
            renderRecap();
            updateKeyboardState();
            send({ type: 'matrix-show' });
            const screen = document.getElementById('screen');
            if (screen) screen.placeholder = 'Mode Matrices — édition dans le panneau de droite';
        },
        onPivot:     action('pivot'),
        onTranspose: action('transpose'),
        onTrace:     action('trace'),
        onDet:       action('det'),
        onInv:       action('inv'),
        onAdd:       action('add'),
        onSub:       action('sub'),
        onMul:       action('mul'),
        onSolve:     action('solve'),
        onDefineA:   action('define-a'),
        onDefineB:   action('define-b')
    };
})();

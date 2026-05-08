/**
 * modes/matrix/05_panel_matrix.js
 * Vue MATRICES côté panneau (panel.html).
 *
 * Reçoit via BroadcastChannel('quantum-nova') les commandes émises par la
 * calculatrice principale (01_mode_matrix.js) :
 *   { type: 'matrix-show' }                 → afficher le wizard ou l'édition
 *   { type: 'matrix-action', action: 'pivot' | 'det' | 'inv' | 'transpose'
 *     | 'trace' | 'add' | 'sub' | 'mul' | 'solve' | 'define-a' | 'define-b' }
 *
 * Émet en retour :
 *   { type: 'matrix-state', state: { rowsA, colsA, rowsB, colsB, hasB,
 *     augmented, step } }
 * pour que la calc puisse afficher un récap et griser les boutons B
 * lorsque l'utilisateur a choisi "juste A".
 */

(function () {
    'use strict';

    // Le panneau utilise math.js (det/inv/add/multiply) et KaTeX (rendu LaTeX).
    // S'ils ne sont pas encore chargés, on attend.

    const state = {
        step: 'setup',
        hasB: 'same',
        rowsA: 3, colsA: 3,
        rowsB: 3, colsB: 3,
        valuesA: null,
        valuesB: null,
        augmented: false,
        useFractions: true     // affichage en fractions exactes (1/3 plutôt que 0,333)
    };

    let chan = null;
    try { chan = new BroadcastChannel('quantum-nova'); } catch (e) { chan = null; }

    // ===========================================================
    // PERSISTANCE localStorage — éviter de tout reperdre au reload
    // ===========================================================
    const STORAGE_KEY = 'qn:matrix-state';
    let saveTimer = null;

    function saveState() {
        try {
            // Synchronise les valeurs DOM → state avant d'écrire.
            if (state.step === 'edit') {
                preserveValues('A');
                if (state.hasB !== 'none') preserveValues('B');
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                hasB: state.hasB,
                rowsA: state.rowsA, colsA: state.colsA,
                rowsB: state.rowsB, colsB: state.colsB,
                valuesA: state.valuesA, valuesB: state.valuesB,
                augmented: state.augmented,
                useFractions: state.useFractions,
                hadSetup: state.step === 'edit'
            }));
        } catch (e) { /* localStorage indisponible (quota / privé) */ }
    }

    function scheduleSave() {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(saveState, 400);
    }

    function loadPersistedState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return false;
            const saved = JSON.parse(raw);
            if (!saved || typeof saved !== 'object') return false;
            Object.assign(state, saved);
            // Si on avait des valeurs saisies, on reprend directement en édition.
            if (saved.hadSetup) state.step = 'edit';
            return true;
        } catch (e) { return false; }
    }

    // ===========================================================
    // MOTEUR
    // ===========================================================
    class MatrixEngine {
        static round(v) {
            if (Math.abs(v) < 1e-12) return 0;
            return Math.round(v * 1000) / 1000;
        }

        static isZero(v) { return Math.abs(v) < 1e-10; }

        static formatNumber(v) {
            const x = this.round(v);
            if (Number.isInteger(x)) return String(x);
            return String(x).replace('.', ',');
        }

        /**
         * Rend un nombre en LaTeX. Si state.useFractions est actif, on tente
         * math.fraction(v) — si le dénominateur est ≤ 1000, on affiche
         * \frac{n}{d} pour conserver la précision pédagogique (1/3 plutôt
         * que 0,333). Sinon on revient à formatNumber (virgule française).
         */
        static formatLatex(v) {
            if (this.isZero(v)) return '0';
            if (state.useFractions && typeof math !== 'undefined' && math.fraction) {
                try {
                    const f = math.fraction(v);
                    const n = Number(f.n) * (f.s < 0 ? -1 : 1);
                    const d = Number(f.d);
                    if (d === 1) return String(n);
                    if (d > 0 && d <= 1000 && Number.isFinite(n) && Number.isFinite(d)) {
                        return `\\frac{${n}}{${d}}`;
                    }
                } catch (e) { /* fallback ci-dessous */ }
            }
            return this.formatNumber(v);
        }

        static parseCell(raw) {
            const txt = String(raw || '').trim();
            if (!txt) return 0;
            const normalized = txt.replace(',', '.');
            try {
                if (typeof math !== 'undefined' && typeof math.evaluate === 'function') {
                    const val = math.evaluate(normalized);
                    const n = typeof val === 'number' ? val : Number(val);
                    if (Number.isFinite(n)) return n;
                }
            } catch (e) { /* fallback ci-dessous */ }
            const n = Number(normalized);
            if (Number.isFinite(n)) return n;
            throw new Error(`Valeur non numérique dans une cellule : ${txt}`);
        }

        static analyzeLinearSystem(rrefMatrix) {
            const rows = rrefMatrix.length;
            const cols = rrefMatrix[0].length;
            const vars = cols - 1;
            let rank = 0;
            const solution = Array(vars).fill(null);

            for (let i = 0; i < rows; i++) {
                let pivotCol = -1;
                for (let j = 0; j < vars; j++) {
                    if (!this.isZero(rrefMatrix[i][j])) { pivotCol = j; break; }
                }

                const rhs = rrefMatrix[i][cols - 1];
                if (pivotCol === -1) {
                    if (!this.isZero(rhs)) {
                        return { kind: 'none', message: 'Aucune solution : une ligne impose 0 = ' + this.formatNumber(rhs) + '.' };
                    }
                    continue;
                }

                rank++;
                if (this.isZero(rrefMatrix[i][pivotCol] - 1)) {
                    solution[pivotCol] = rhs;
                }
            }

            if (rank < vars) {
                return {
                    kind: 'infinite',
                    message: `Infinité de solutions : ${rank} pivot(s) pour ${vars} inconnue(s).`
                };
            }

            return { kind: 'unique', solution };
        }

        static toLaTeX(matrix, augmentedCols = 0) {
            if (!matrix || !matrix.length || !matrix[0] || !matrix[0].length) return '';
            const cols = matrix[0].length;
            let align = 'c'.repeat(cols - augmentedCols);
            if (augmentedCols > 0) align += '|' + 'c'.repeat(augmentedCols);
            let tex = `\\left[\\begin{array}{${align}}`;
            for (let i = 0; i < matrix.length; i++) {
                tex += matrix[i].map(v => this.formatLatex(v)).join(' & ');
                if (i < matrix.length - 1) tex += ' \\\\ ';
            }
            tex += '\\end{array}\\right]';
            return tex;
        }

        static transpose(m) { return m[0].map((_, c) => m.map(row => row[c])); }

        static gaussPivotSteps(matrix) {
            const m = matrix.map(row => row.slice());
            const rows = m.length, cols = m[0].length;
            const steps = [{ matrix: m.map(r => r.slice()), desc: '\\text{Matrice initiale}' }];
            let lead = 0;
            for (let r = 0; r < rows; r++) {
                if (lead >= cols) break;
                let i = r;
                while (Math.abs(m[i][lead]) < 1e-12) {
                    i++;
                    if (i === rows) {
                        i = r; lead++;
                        if (lead === cols) return steps;
                    }
                }
                if (i !== r) {
                    [m[i], m[r]] = [m[r], m[i]];
                    steps.push({ matrix: m.map(row => row.slice()),
                                 desc: `L_{${r + 1}} \\leftrightarrow L_{${i + 1}}` });
                }
                const val = m[r][lead];
                if (Math.abs(val - 1) > 1e-12) {
                    for (let j = 0; j < cols; j++) m[r][j] /= val;
                    steps.push({ matrix: m.map(row => row.slice()),
                                 desc: `L_{${r + 1}} \\leftarrow \\tfrac{1}{${this.formatLatex(val)}} L_{${r + 1}}` });
                }
                for (let k = 0; k < rows; k++) {
                    if (k === r) continue;
                    const factor = m[k][lead];
                    if (Math.abs(factor) < 1e-12) continue;
                    for (let j = 0; j < cols; j++) m[k][j] -= factor * m[r][j];
                    const sign = factor > 0 ? '-' : '+';
                    steps.push({ matrix: m.map(row => row.slice()),
                                 desc: `L_{${k + 1}} \\leftarrow L_{${k + 1}} ${sign} ${this.formatLatex(Math.abs(factor))} L_{${r + 1}}` });
                }
                lead++;
            }
            return steps;
        }
    }

    // ===========================================================
    // UTIL
    // ===========================================================
    function clampDim(v) {
        let n = parseInt(v, 10);
        if (isNaN(n) || n < 1) n = 1;
        if (n > 9) n = 9;
        return n;
    }

    function broadcastState() {
        const payload = {
            type: 'matrix-state',
            state: {
                step: state.step,
                hasB: state.hasB,
                rowsA: state.rowsA, colsA: state.colsA,
                rowsB: state.rowsB, colsB: state.colsB,
                augmented: state.augmented
            }
        };
        if (chan) { try { chan.postMessage(payload); } catch (e) {} }
        // Fallback intra-fenêtre (mode tout-en-un)
        try { window.dispatchEvent(new CustomEvent('qn-bus', { detail: payload })); } catch (e) {}
    }

    function preserveValues(target) {
        const grid = document.getElementById('matrixGrid' + target);
        if (!grid) return;
        const inputs = grid.querySelectorAll('input');
        const rows = state['rows' + target];
        const totalCols = state['cols' + target] + (target === 'A' && state.augmented ? 1 : 0);
        const m = [];
        for (let i = 0; i < rows; i++) {
            const row = [];
            for (let j = 0; j < totalCols; j++) {
                const inp = inputs[i * totalCols + j];
                row.push(inp ? (inp.value || '') : '');
            }
            m.push(row);
        }
        state['values' + target] = m;
    }

    function getRoot() { return document.getElementById('panelContent'); }

    function ensureContainer() {
        const root = getRoot();
        if (!root) return null;
        let c = document.getElementById('matrixContainer');
        if (c) return c;
        root.replaceChildren();
        c = document.createElement('div');
        c.id = 'matrixContainer';
        c.classList.add('matrix-container-panel');
        root.appendChild(c);
        return c;
    }

    // ===========================================================
    // ÉTAPE 1 : SETUP
    // ===========================================================
    function renderSetup() {
        state.step = 'setup';
        const c = ensureContainer();
        if (!c) return;
        c.replaceChildren();
        c.classList.remove('matrix-edit');
        c.classList.add('matrix-setup');

        const card = document.createElement('div');
        card.className = 'matrix-wizard';

        const title = document.createElement('h3');
        title.textContent = 'Configuration des matrices';
        card.appendChild(title);

        // Ligne A
        const rowA = document.createElement('div');
        rowA.className = 'wizard-row';
        rowA.append(
            spanLabel('Taille de A :'),
            numInput('setupRowsA', state.rowsA),
            spanX(),
            numInput('setupColsA', state.colsA)
        );
        card.appendChild(rowA);

        // Choix B
        const rowB = document.createElement('div');
        rowB.className = 'wizard-row wizard-stack';
        const lblB = document.createElement('div');
        lblB.className = 'wizard-label';
        lblB.textContent = 'Une seconde matrice B ?';
        rowB.appendChild(lblB);

        const choices = document.createElement('div');
        choices.className = 'wizard-choices';
        [
            ['same',      'Oui, même taille que A'],
            ['different', 'Oui, taille différente'],
            ['none',      'Non, juste A']
        ].forEach(([val, txt]) => {
            const lbl = document.createElement('label');
            lbl.className = 'wizard-choice';
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'hasB';
            radio.value = val;
            if (state.hasB === val) radio.checked = true;
            const span = document.createElement('span');
            span.textContent = txt;
            lbl.append(radio, span);
            choices.appendChild(lbl);
        });
        rowB.appendChild(choices);
        card.appendChild(rowB);

        // Ligne B
        const rowBSize = document.createElement('div');
        rowBSize.className = 'wizard-row';
        rowBSize.id = 'setupBSize';
        rowBSize.append(
            spanLabel('Taille de B :'),
            numInput('setupRowsB', state.rowsB),
            spanX(),
            numInput('setupColsB', state.colsB)
        );
        rowBSize.style.display = state.hasB === 'different' ? '' : 'none';
        card.appendChild(rowBSize);

        const actions = document.createElement('div');
        actions.className = 'wizard-row wizard-actions';
        const cta = document.createElement('button');
        cta.type = 'button';
        cta.className = 'wizard-cta';
        cta.textContent = 'Continuer →';
        cta.addEventListener('click', commitSetup);
        actions.appendChild(cta);
        card.appendChild(actions);

        c.appendChild(card);

        choices.addEventListener('change', e => {
            if (e.target.name === 'hasB') {
                state.hasB = e.target.value;
                rowBSize.style.display = state.hasB === 'different' ? '' : 'none';
                broadcastState();
            }
        });

        card.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); commitSetup(); }
        });

        broadcastState();
    }

    function spanLabel(txt) { const s = document.createElement('span'); s.className = 'wizard-label'; s.textContent = txt; return s; }
    function spanX() { const s = document.createElement('span'); s.className = 'wizard-x'; s.textContent = '×'; return s; }
    function numInput(id, value) {
        const inp = document.createElement('input');
        inp.type = 'number'; inp.min = '1'; inp.max = '9';
        inp.id = id; inp.className = 'wizard-num'; inp.value = String(value);
        return inp;
    }

    function commitSetup() {
        state.rowsA = clampDim(document.getElementById('setupRowsA').value);
        state.colsA = clampDim(document.getElementById('setupColsA').value);
        if (state.hasB === 'different') {
            state.rowsB = clampDim(document.getElementById('setupRowsB').value);
            state.colsB = clampDim(document.getElementById('setupColsB').value);
        } else if (state.hasB === 'same') {
            state.rowsB = state.rowsA;
            state.colsB = state.colsA;
        }
        renderEdit();
        scheduleSave();
    }

    // ===========================================================
    // ÉTAPE 2 : EDIT
    // ===========================================================
    function renderEdit() {
        state.step = 'edit';
        const c = ensureContainer();
        if (!c) return;
        c.replaceChildren();
        c.classList.remove('matrix-setup');
        c.classList.add('matrix-edit');

        const header = document.createElement('div');
        header.className = 'matrix-edit-header';

        const back = document.createElement('button');
        back.type = 'button';
        back.className = 'matrix-back';
        back.textContent = '↻ Modifier les tailles';
        back.title = 'Revenir au choix des tailles (les valeurs saisies sont conservées)';
        back.addEventListener('click', () => {
            preserveValues('A');
            if (state.hasB !== 'none') preserveValues('B');
            renderSetup();
        });
        header.appendChild(back);

        const sysLbl = document.createElement('label');
        sysLbl.className = 'matrix-system-toggle';
        sysLbl.title = 'Ajoute une colonne | b à droite de A pour résoudre A·x = b';
        const sysIn = document.createElement('input');
        sysIn.type = 'checkbox';
        sysIn.id = 'systemToggle';
        sysIn.checked = state.augmented;
        const sysSpan = document.createElement('span');
        sysSpan.textContent = 'Système A·x = b';
        sysLbl.append(sysIn, sysSpan);
        sysLbl.addEventListener('change', () => {
            preserveValues('A');
            state.augmented = sysIn.checked;
            renderEdit();
            scheduleSave();
        });
        header.appendChild(sysLbl);

        const fracLbl = document.createElement('label');
        fracLbl.className = 'matrix-system-toggle';
        fracLbl.title = 'Affiche 1/3 plutôt que 0,333 quand le résultat est une fraction exacte';
        const fracIn = document.createElement('input');
        fracIn.type = 'checkbox';
        fracIn.id = 'fractionsToggle';
        fracIn.checked = state.useFractions;
        const fracSpan = document.createElement('span');
        fracSpan.textContent = 'Fractions exactes';
        fracLbl.append(fracIn, fracSpan);
        fracLbl.addEventListener('change', () => {
            state.useFractions = fracIn.checked;
            scheduleSave();
            // Pas besoin de re-render : les prochains calculs utiliseront le toggle.
        });
        header.appendChild(fracLbl);
        c.appendChild(header);

        const blocks = document.createElement('div');
        blocks.className = 'matrix-blocks';
        blocks.appendChild(buildEditBlock('A'));
        if (state.hasB !== 'none') blocks.appendChild(buildEditBlock('B'));
        c.appendChild(blocks);

        const hint = document.createElement('div');
        hint.className = 'matrix-hint';
        hint.textContent = state.hasB === 'none'
            ? 'Remplis A puis clique sur une opération du clavier (DET, INV, Aᵀ, TR, RREF…) à gauche.'
            : 'Remplis A et B puis clique sur une opération du clavier à gauche.';
        c.appendChild(hint);

        const out = document.createElement('div');
        out.id = 'matrixOutput';
        out.className = 'matrix-output';
        const empty = document.createElement('div');
        empty.className = 'matrix-empty';
        empty.textContent = 'Le résultat apparaîtra ici.';
        out.appendChild(empty);
        c.appendChild(out);

        broadcastState();
    }

    function buildEditBlock(target) {
        const block = document.createElement('section');
        block.className = 'matrix-block';
        block.dataset.target = target;
        const rows = state['rows' + target];
        const cols = state['cols' + target];
        const augNote = (target === 'A' && state.augmented) ? '  [A | b]' : '';
        const title = document.createElement('h4');
        title.textContent = `Matrice ${target}  ${rows} × ${cols}${augNote}`;
        block.appendChild(title);

        const totalCols = cols + (target === 'A' && state.augmented ? 1 : 0);
        const grid = document.createElement('div');
        grid.id = 'matrixGrid' + target;
        grid.className = 'matrix-grid';
        grid.style.gridTemplateColumns = `repeat(${totalCols}, minmax(40px, 1fr))`;

        const saved = state['values' + target];
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < totalCols; j++) {
                const inp = document.createElement('input');
                inp.type = 'text';
                inp.inputMode = 'decimal';
                inp.placeholder = (target === 'A' && state.augmented && j === cols) ? 'b' : '';
                if (saved && saved[i] && saved[i][j] !== undefined && saved[i][j] !== '') {
                    inp.value = saved[i][j];
                }
                if (target === 'A' && state.augmented && j === cols) {
                    inp.classList.add('matrix-cell-aug');
                }
                grid.appendChild(inp);
            }
        }
        block.appendChild(grid);
        return block;
    }

    // ===========================================================
    // LECTURE DES GRILLES
    // ===========================================================
    function getMatrix(target, includeAug = false) {
        const grid = document.getElementById('matrixGrid' + target);
        if (!grid) throw new Error(`${target} non définie`);
        const rows = state['rows' + target];
        const dataCols = state['cols' + target];
        const totalCols = dataCols + (target === 'A' && state.augmented ? 1 : 0);
        const readCols = (target === 'A' && state.augmented && includeAug) ? totalCols : dataCols;
        const inputs = grid.querySelectorAll('input');
        const m = [];
        for (let i = 0; i < rows; i++) {
            const row = [];
            for (let j = 0; j < readCols; j++) {
                const raw = inputs[i * totalCols + j].value || '0';
                row.push(MatrixEngine.parseCell(raw));
            }
            m.push(row);
        }
        return m;
    }

    // ===========================================================
    // RENDU KaTeX
    // ===========================================================
    function renderTex(host, latex, displayMode = true) {
        if (typeof katex === 'undefined') { host.textContent = latex; return; }
        try { katex.render(latex, host, { throwOnError: false, displayMode }); }
        catch (e) { host.textContent = latex; }
    }
    function clearOutput() { const out = document.getElementById('matrixOutput'); if (out) out.replaceChildren(); return out; }
    function showSteps(title, steps, augmentedCols = 0) {
        const out = clearOutput(); if (!out) return;
        const h = document.createElement('h4'); h.textContent = title; out.appendChild(h);
        steps.forEach((step, idx) => {
            const div = document.createElement('div'); div.className = 'matrix-step';
            const label = document.createElement('div'); label.className = 'matrix-step-desc';
            const txt = document.createElement('span'); txt.textContent = `Étape ${idx} — `;
            label.appendChild(txt);
            const descSpan = document.createElement('span');
            renderTex(descSpan, step.desc, false);
            label.appendChild(descSpan);
            div.appendChild(label);
            const mat = document.createElement('div'); mat.className = 'matrix-step-mat';
            renderTex(mat, MatrixEngine.toLaTeX(step.matrix, augmentedCols));
            div.appendChild(mat);
            out.appendChild(div);
        });
    }
    function showSingle(title, latex, descTex) {
        const out = clearOutput(); if (!out) return;
        const h = document.createElement('h4'); h.textContent = title; out.appendChild(h);
        const div = document.createElement('div'); div.className = 'matrix-step';
        if (descTex) {
            const lbl = document.createElement('div'); lbl.className = 'matrix-step-desc';
            renderTex(lbl, descTex, false); div.appendChild(lbl);
        }
        const mat = document.createElement('div'); mat.className = 'matrix-step-mat';
        renderTex(mat, latex); div.appendChild(mat);
        out.appendChild(div);
    }

    function showFormula(title, formulaTex) {
        const out = clearOutput(); if (!out) return;
        const h = document.createElement('h4'); h.textContent = title; out.appendChild(h);
        const div = document.createElement('div'); div.className = 'matrix-step';
        const mat = document.createElement('div'); mat.className = 'matrix-step-mat';
        renderTex(mat, formulaTex); div.appendChild(mat);
        out.appendChild(div);
    }

    function appendSolveConclusion(analysis) {
        const out = document.getElementById('matrixOutput'); if (!out || !analysis) return;
        const card = document.createElement('div');
        card.className = 'matrix-conclusion matrix-conclusion-' + analysis.kind;
        const title = document.createElement('strong');
        title.textContent = 'Conclusion';
        card.appendChild(title);

        if (analysis.kind === 'unique') {
            const list = document.createElement('div');
            list.className = 'matrix-solution-list';
            const parts = analysis.solution.map((v, i) => `x_{${i + 1}} = ${MatrixEngine.formatLatex(v)}`);
            renderTex(list, parts.join('\\quad '));
            card.appendChild(list);
        } else {
            const p = document.createElement('p');
            p.textContent = analysis.message;
            card.appendChild(p);
        }
        out.appendChild(card);
    }

    function showSolve(title, steps, augmentedCols = 1) {
        showSteps(title, steps, augmentedCols);
        const last = steps.length ? steps[steps.length - 1].matrix : null;
        if (last) appendSolveConclusion(MatrixEngine.analyzeLinearSystem(last));
    }
    function showError(msg) {
        const out = clearOutput(); if (!out) return;
        const div = document.createElement('div'); div.className = 'matrix-error';
        div.textContent = `⚠ ${msg}`; out.appendChild(div);
    }
    function showInfo(msg) {
        const out = clearOutput(); if (!out) return;
        const div = document.createElement('div'); div.className = 'matrix-empty';
        div.textContent = msg; out.appendChild(div);
    }

    // ===========================================================
    // ACTIONS
    // ===========================================================
    function checkSquare(M, op) { if (M.length !== M[0].length) throw new Error(`${op} nécessite une matrice carrée`); }
    function ensureEditView(needB = false) {
        if (state.step !== 'edit') renderEdit();
        if (needB && state.hasB === 'none') { showError('Pas de matrice B. Clique sur ↻ Modifier les tailles pour en ajouter une.'); return false; }
        return true;
    }

    const ACTIONS = {
        pivot() {
            if (!ensureEditView()) return;
            try {
                const A = getMatrix('A', true);
                const aug = state.augmented ? 1 : 0;
                const steps = MatrixEngine.gaussPivotSteps(A);
                showSteps(`Pivot de Gauss — ${steps.length} étape(s)`, steps, aug);
            } catch (e) { showError(e.message); }
        },
        transpose() {
            if (!ensureEditView()) return;
            try {
                const T = MatrixEngine.transpose(getMatrix('A'));
                showSingle('Transposée de A', MatrixEngine.toLaTeX(T), 'A^{T}');
            } catch (e) { showError(e.message); }
        },
        trace() {
            if (!ensureEditView()) return;
            try {
                const A = getMatrix('A'); checkSquare(A, 'TR');
                let s = 0; for (let i = 0; i < A.length; i++) s += A[i][i];
                showSingle('Trace de A', MatrixEngine.formatLatex(s), '\\mathrm{tr}(A)');
            } catch (e) { showError(e.message); }
        },
        det() {
            if (!ensureEditView()) return;
            try {
                const A = getMatrix('A'); checkSquare(A, 'DET');
                showSingle('Déterminant', MatrixEngine.formatLatex(math.det(A)), '\\det(A)');
            } catch (e) { showError(e.message); }
        },
        inv() {
            if (!ensureEditView()) return;
            try {
                const A = getMatrix('A'); checkSquare(A, 'INV');
                showSingle('Inverse de A', MatrixEngine.toLaTeX(math.inv(A)), 'A^{-1}');
            } catch (e) { showError(e.message); }
        },
        add() {
            if (!ensureEditView(true)) return;
            try {
                const A = getMatrix('A'), B = getMatrix('B');
                if (A.length !== B.length || A[0].length !== B[0].length) throw new Error('A + B : dimensions incompatibles');
                showSingle('Somme', MatrixEngine.toLaTeX(math.add(A, B)), 'A + B');
            } catch (e) { showError(e.message); }
        },
        sub() {
            if (!ensureEditView(true)) return;
            try {
                const A = getMatrix('A'), B = getMatrix('B');
                if (A.length !== B.length || A[0].length !== B[0].length) throw new Error('A − B : dimensions incompatibles');
                showSingle('Différence', MatrixEngine.toLaTeX(math.subtract(A, B)), 'A - B');
            } catch (e) { showError(e.message); }
        },
        mul() {
            if (!ensureEditView(true)) return;
            try {
                const A = getMatrix('A'), B = getMatrix('B');
                if (A[0].length !== B.length) throw new Error(`A × B : cols(A)=${A[0].length} ≠ lignes(B)=${B.length}`);
                showSingle('Produit matriciel', MatrixEngine.toLaTeX(math.multiply(A, B)), 'A \\times B');
            } catch (e) { showError(e.message); }
        },
        solve() {
            if (!ensureEditView()) return;
            if (!state.augmented) {
                preserveValues('A');
                state.augmented = true;
                renderEdit();
                showInfo('Une colonne | b a été ajoutée à droite de A. Remplis-la, puis re-clique sur RÉSOUDRE.');
                return;
            }
            try {
                const A = getMatrix('A', true);
                const steps = MatrixEngine.gaussPivotSteps(A);
                showSolve('Résolution de A·x = b', steps, 1);
            } catch (e) { showError(e.message); }
        },
        'define-a'() {
            preserveValues('A');
            if (state.hasB !== 'none') preserveValues('B');
            renderSetup();
        },
        'define-b'() { ACTIONS['define-a'](); }
    };

    // ===========================================================
    // ÉCOUTE BroadcastChannel
    // ===========================================================
    function onMessage(msg) {
        if (!msg) return;
        if (msg.type === 'matrix-show') {
            // À la prise de mode : si jamais commencé → setup, sinon edit
            if (state.step === 'edit') renderEdit();
            else renderSetup();
            broadcastState();
            return;
        }
        if (msg.type === 'matrix-action' && msg.action) {
            const fn = ACTIONS[msg.action];
            if (fn) fn();
            return;
        }
    }

    if (chan) {
        chan.addEventListener('message', ev => onMessage(ev.data || {}));
    }
    // Fallback intra-fenêtre : essentiel pour le mode tout-en-un.
    window.addEventListener('qn-bus', ev => onMessage(ev.detail || {}));

    // Restaure l'état depuis localStorage (si dispo) avant le premier
    // matrix-show. La calc enverra le show au switch de mode et la vue
    // partira directement en "edit" si on avait des valeurs saisies.
    loadPersistedState();

    // Délégué input : toute frappe dans une cellule de matrice déclenche
    // une sauvegarde différée (debounce 400ms).
    document.addEventListener('input', ev => {
        const t = ev.target;
        if (!t || !t.matches) return;
        if (t.matches('#matrixContainer .matrix-grid input')) {
            scheduleSave();
        }
    });

    // Expose pour debug
    window.QNMatrixPanel = { state, renderSetup, renderEdit, ACTIONS,
                              saveState, loadPersistedState };
})();

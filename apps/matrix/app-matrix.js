/**
 * app-matrix.js
 * Logique de l'application de calcul matriciel.
 * Inspiré de NumWorks Epsilon (architecture en apps) et Diopman22 (UI grille).
 */

const MatrixApp = {
    init() {
        console.log("Matrix App Initialisée");
        this.setupEventListeners();
    },

    setupEventListeners() {
        const btnGenA = document.getElementById('matrix-gen-a');
        if (btnGenA) {
            btnGenA.addEventListener('click', () => this.generateGrid('A'));
        }
        const btnGenB = document.getElementById('matrix-gen-b');
        if (btnGenB) {
            btnGenB.addEventListener('click', () => this.generateGrid('B'));
        }

        // Opérations unaires + binaires
        document.querySelectorAll('.matrix-op-btn').forEach(btn => {
            btn.addEventListener('click', () => this.executeOperation(btn.dataset.op));
        });

        // Génération initiale automatique de B (A est généré via initAppLogic)
        this.generateGrid('B');
    },

    /**
     * Génère dynamiquement une grille d'inputs HTML.
     * @param {'A'|'B'} target
     */
    generateGrid(target) {
        const t = target.toLowerCase();
        const rows = parseInt(document.getElementById(`matrix-${t}-rows`).value);
        const cols = parseInt(document.getElementById(`matrix-${t}-cols`).value);
        const container = document.getElementById(`matrix-grid-${t}`);

        if (isNaN(rows) || isNaN(cols) || rows < 1 || cols < 1) return;

        container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        container.replaceChildren();

        for (let i = 0; i < rows * cols; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.inputMode = 'decimal';
            input.className = 'matrix-input';
            input.value = '0';
            container.appendChild(input);
        }
    },

    /**
     * Récupère les données de la grille et les transforme en tableau 2D.
     */
    getMatrixFromGrid(target) {
        const t = target.toLowerCase();
        const cols = parseInt(document.getElementById(`matrix-${t}-cols`).value);
        const inputs = document.querySelectorAll(`#matrix-grid-${t} .matrix-input`);

        let data = [];
        let currentRow = [];

        inputs.forEach((input) => {
            const v = parseFloat((input.value || '0').replace(',', '.'));
            currentRow.push(isNaN(v) ? 0 : v);
            if (currentRow.length === cols) {
                data.push(currentRow);
                currentRow = [];
            }
        });

        return data;
    },

    /**
     * Affiche un résultat (scalaire, matrice, ou message d'erreur) dans la
     * zone dédiée. Utilise uniquement textContent / createElement pour
     * éviter toute injection HTML.
     */
    displayResult(res, label = '', isError = false) {
        const output = document.getElementById('matrix-result-output');
        if (!output) return;
        output.replaceChildren();

        if (isError) {
            const errBox = document.createElement('div');
            errBox.className = 'res-error';
            errBox.textContent = String(res);
            output.appendChild(errBox);
            return;
        }

        if (label) {
            const lbl = document.createElement('div');
            lbl.className = 'res-label';
            lbl.textContent = `${label} =`;
            output.appendChild(lbl);
        }

        if (typeof res === 'number') {
            const box = document.createElement('div');
            box.className = 'res-value qn-copyable';
            box.title = 'Cliquer pour copier';
            box.dataset.copy = math.format(res, { precision: 6 });
            const strong = document.createElement('strong');
            strong.textContent = math.format(res, { precision: 6 });
            box.append('Résultat : ', strong);
            output.appendChild(box);
            if (window.QNSession) window.QNSession.push('matrix', label, strong.textContent);
        } else if (Array.isArray(res)) {
            const grid = document.createElement('div');
            grid.className = 'res-matrix qn-copyable';
            grid.title = 'Cliquer pour copier (format CSV)';
            grid.dataset.copy = res.map(row =>
                row.map(v => math.format(v, { precision: 6 })).join(',')
            ).join('\n');
            res.forEach(row => {
                const r = document.createElement('div');
                r.className = 'res-row';
                row.forEach(val => {
                    const cell = document.createElement('span');
                    cell.textContent = math.format(val, { precision: 4 });
                    r.appendChild(cell);
                });
                grid.appendChild(r);
            });
            output.appendChild(grid);
            if (window.QNSession) {
                window.QNSession.push('matrix', label, `[${res.length}×${res[0].length}]`);
            }
        }
    },

    executeOperation(op) {
        try {
            const A = this.getMatrixFromGrid('A');
            let B = null;
            let result;
            let label = '';

            // Les opérations binaires nécessitent B
            if (op === 'add' || op === 'sub' || op === 'mul') {
                B = this.getMatrixFromGrid('B');
            }

            switch (op) {
                case 'det':
                    if (A.length !== A[0].length) throw new Error("DET nécessite une matrice carrée");
                    result = math.det(A);
                    label = 'det(A)';
                    break;
                case 'inv':
                    if (A.length !== A[0].length) throw new Error("INV nécessite une matrice carrée");
                    result = math.inv(A);
                    label = 'A⁻¹';
                    break;
                case 'trans':
                    result = math.transpose(A);
                    label = 'Aᵀ';
                    break;
                case 'trace': {
                    if (A.length !== A[0].length) throw new Error("TRACE nécessite une matrice carrée");
                    let sum = 0;
                    for (let i = 0; i < A.length; i++) sum += A[i][i];
                    result = sum;
                    label = 'tr(A)';
                    break;
                }
                case 'add':
                    if (A.length !== B.length || A[0].length !== B[0].length) {
                        throw new Error("A + B : dimensions incompatibles");
                    }
                    result = math.add(A, B);
                    label = 'A + B';
                    break;
                case 'sub':
                    if (A.length !== B.length || A[0].length !== B[0].length) {
                        throw new Error("A − B : dimensions incompatibles");
                    }
                    result = math.subtract(A, B);
                    label = 'A − B';
                    break;
                case 'mul':
                    if (A[0].length !== B.length) {
                        throw new Error(`A × B : colonnes A (${A[0].length}) ≠ lignes B (${B.length})`);
                    }
                    result = math.multiply(A, B);
                    label = 'A × B';
                    break;
                case 'rref': {
                    const showSteps = this.shouldShowSteps();
                    const { matrix, steps, rank } = this.gaussianElimination(A, false, showSteps);
                    this.displayGauss('RREF(A)', matrix, steps, { rank });
                    return;
                }
                case 'solve': {
                    if (A[0].length < 2) {
                        throw new Error("Pour résoudre, A doit avoir au moins 2 colonnes (coefficients + second membre)");
                    }
                    const showSteps = this.shouldShowSteps();
                    const { matrix, steps, rank } = this.gaussianElimination(A, true, showSteps);
                    const interpretation = this.interpretSystem(matrix, rank);
                    this.displayGauss('Système A·x = b', matrix, steps, interpretation);
                    return;
                }
                default:
                    throw new Error(`Opération inconnue : ${op}`);
            }

            this.displayResult(result, label);
        } catch (err) {
            console.error(err);
            this.displayResult("Erreur : " + err.message, '', true);
        }
    },

    shouldShowSteps() {
        const cb = document.getElementById('matrix-show-steps');
        return cb ? cb.checked : true;
    },

    /**
     * Élimination de Gauss-Jordan avec pivot partiel.
     * Retourne la forme échelonnée réduite (RREF) + la trace des étapes.
     *
     * Pédagogique : chaque opération élémentaire est consignée avec sa
     * description (échange Lᵢ↔Lⱼ, Lᵢ ← (1/k)·Lᵢ, Lᵢ ← Lᵢ − k·Lⱼ).
     *
     * @param {number[][]} input matrice de départ
     * @param {boolean} augmented si true, dernière colonne = second membre
     * @param {boolean} traceSteps si true, conserve l'historique
     * @returns {{matrix: number[][], steps: Array, rank: number}}
     */
    gaussianElimination(input, augmented, traceSteps) {
        const M = input.map(row => row.slice());
        const m = M.length;
        const n = M[0].length;
        const coefCols = augmented ? n - 1 : n;
        const steps = [];
        const EPS = 1e-10;
        let rank = 0;

        const snapshot = (description) => {
            if (!traceSteps) return;
            steps.push({
                description,
                matrix: M.map(row => row.slice())
            });
        };

        if (traceSteps) snapshot('Matrice de départ');

        let row = 0;
        for (let col = 0; col < coefCols && row < m; col++) {
            // 1. Pivot partiel : on cherche la ligne avec |pivot| max sur la colonne
            let pivotRow = row;
            let pivotVal = Math.abs(M[row][col]);
            for (let r = row + 1; r < m; r++) {
                const v = Math.abs(M[r][col]);
                if (v > pivotVal) {
                    pivotVal = v;
                    pivotRow = r;
                }
            }

            // Pas de pivot non nul sur cette colonne → on passe à la suivante
            if (pivotVal < EPS) continue;

            // 2. Échange si besoin
            if (pivotRow !== row) {
                [M[row], M[pivotRow]] = [M[pivotRow], M[row]];
                snapshot(`Échange L${row + 1} ↔ L${pivotRow + 1}`);
            }

            // 3. Normalisation du pivot à 1
            const pivot = M[row][col];
            if (Math.abs(pivot - 1) > EPS) {
                for (let c = 0; c < n; c++) {
                    M[row][c] = M[row][c] / pivot;
                }
                snapshot(`L${row + 1} ← (1/${this.fmtNum(pivot)})·L${row + 1}`);
            }

            // 4. Élimination dans les autres lignes
            for (let r = 0; r < m; r++) {
                if (r === row) continue;
                const factor = M[r][col];
                if (Math.abs(factor) < EPS) continue;
                for (let c = 0; c < n; c++) {
                    M[r][c] = M[r][c] - factor * M[row][c];
                }
                // Nettoyage des -0 et bruit numérique
                for (let c = 0; c < n; c++) {
                    if (Math.abs(M[r][c]) < EPS) M[r][c] = 0;
                }
                const sign = factor >= 0 ? '−' : '+';
                snapshot(`L${r + 1} ← L${r + 1} ${sign} ${this.fmtNum(Math.abs(factor))}·L${row + 1}`);
            }

            rank++;
            row++;
        }

        return { matrix: M, steps, rank };
    },

    /**
     * Interprète la RREF d'un système augmenté [A|b].
     */
    interpretSystem(rref, rankFull) {
        const m = rref.length;
        const n = rref[0].length;
        const coefCols = n - 1;
        const EPS = 1e-10;

        // Rang de la sous-matrice des coefficients (sans la dernière colonne)
        let rankCoef = 0;
        for (let r = 0; r < m; r++) {
            for (let c = 0; c < coefCols; c++) {
                if (Math.abs(rref[r][c]) > EPS) { rankCoef++; break; }
            }
        }

        // Système incohérent : ligne [0 ... 0 | b≠0]
        for (let r = 0; r < m; r++) {
            let allCoefZero = true;
            for (let c = 0; c < coefCols; c++) {
                if (Math.abs(rref[r][c]) > EPS) { allCoefZero = false; break; }
            }
            if (allCoefZero && Math.abs(rref[r][coefCols]) > EPS) {
                return {
                    nature: 'aucune-solution',
                    summary: 'Système incompatible — aucune solution.',
                    detail: `Ligne ${r + 1} équivaut à 0 = ${this.fmtNum(rref[r][coefCols])}, ce qui est impossible.`,
                    rank: rankCoef
                };
            }
        }

        // Solution unique : rang = nombre d'inconnues
        if (rankCoef === coefCols) {
            const sol = new Array(coefCols).fill(0);
            for (let r = 0; r < m; r++) {
                for (let c = 0; c < coefCols; c++) {
                    if (Math.abs(rref[r][c] - 1) < EPS) {
                        sol[c] = rref[r][coefCols];
                        break;
                    }
                }
            }
            return {
                nature: 'unique',
                summary: 'Solution unique :',
                solution: sol,
                rank: rankCoef
            };
        }

        // Solution paramétrique
        return {
            nature: 'infinie',
            summary: `Infinité de solutions (${coefCols - rankCoef} paramètre(s) libre(s)).`,
            detail: 'Les colonnes sans pivot correspondent aux inconnues libres ; lis chaque ligne pivot pour l\'expression des autres.',
            rank: rankCoef
        };
    },

    /**
     * Affiche le résultat d'une élimination de Gauss : matrice finale,
     * étapes intermédiaires (optionnelles), interprétation pédagogique.
     */
    displayGauss(label, finalMatrix, steps, info) {
        const output = document.getElementById('matrix-result-output');
        if (!output) return;
        output.replaceChildren();

        // Étiquette
        const lbl = document.createElement('div');
        lbl.className = 'res-label';
        lbl.textContent = label;
        output.appendChild(lbl);

        // Étapes intermédiaires
        if (steps && steps.length > 1) {
            const stepBox = document.createElement('details');
            stepBox.className = 'gauss-steps';
            stepBox.open = true;

            const sum = document.createElement('summary');
            sum.textContent = `${steps.length} étape(s) — clique pour replier`;
            stepBox.appendChild(sum);

            steps.forEach((s, idx) => {
                const wrap = document.createElement('div');
                wrap.className = 'gauss-step';

                const title = document.createElement('div');
                title.className = 'gauss-step-title';
                title.textContent = `${idx === 0 ? '0' : idx}. ${s.description}`;
                wrap.appendChild(title);

                wrap.appendChild(this.buildMatrixNode(s.matrix, /*augmented*/ label.startsWith('Système')));
                stepBox.appendChild(wrap);
            });

            output.appendChild(stepBox);
        }

        // Matrice finale
        const finalLbl = document.createElement('div');
        finalLbl.className = 'gauss-final-label';
        finalLbl.textContent = '➜ Forme finale (RREF)';
        output.appendChild(finalLbl);
        output.appendChild(this.buildMatrixNode(finalMatrix, label.startsWith('Système'), /*copyable*/ true));

        // Interprétation
        if (info) {
            const summary = document.createElement('div');
            summary.className = 'gauss-summary';
            summary.textContent = info.summary || '';
            output.appendChild(summary);

            if (info.solution) {
                const solBox = document.createElement('div');
                solBox.className = 'gauss-solution qn-copyable';
                solBox.title = 'Cliquer pour copier';
                const lines = info.solution.map((v, i) => `x${i + 1} = ${this.fmtNum(v)}`);
                solBox.dataset.copy = lines.join('\n');
                lines.forEach(line => {
                    const div = document.createElement('div');
                    div.textContent = line;
                    solBox.appendChild(div);
                });
                output.appendChild(solBox);

                if (window.QNSession) {
                    window.QNSession.push('matrix', label, lines.join(' ; '));
                }
            }

            if (info.detail) {
                const detail = document.createElement('div');
                detail.className = 'gauss-detail';
                detail.textContent = info.detail;
                output.appendChild(detail);
            }

            if (typeof info.rank === 'number') {
                const rk = document.createElement('div');
                rk.className = 'gauss-rank';
                rk.textContent = `rang = ${info.rank}`;
                output.appendChild(rk);
            }
        } else if (window.QNSession) {
            window.QNSession.push('matrix', label, `RREF [${finalMatrix.length}×${finalMatrix[0].length}]`);
        }
    },

    /**
     * Construit le noeud DOM d'une matrice. Si `augmented`, sépare visuellement
     * la dernière colonne (le second membre) par une barre verticale.
     */
    buildMatrixNode(M, augmented = false, copyable = false) {
        const grid = document.createElement('div');
        grid.className = 'res-matrix';
        if (copyable) {
            grid.classList.add('qn-copyable');
            grid.title = 'Cliquer pour copier (format CSV)';
            grid.dataset.copy = M.map(row =>
                row.map(v => this.fmtNum(v)).join(',')
            ).join('\n');
        }
        const lastCoefIdx = M[0].length - (augmented ? 2 : 1);
        M.forEach(row => {
            const r = document.createElement('div');
            r.className = 'res-row';
            row.forEach((val, c) => {
                const cell = document.createElement('span');
                cell.textContent = this.fmtNum(val);
                if (augmented && c === lastCoefIdx) {
                    cell.classList.add('augmented-sep');
                }
                r.appendChild(cell);
            });
            grid.appendChild(r);
        });
        return grid;
    },

    fmtNum(v) {
        if (Math.abs(v) < 1e-10) return '0';
        // Affichage compact : entiers sans décimales, sinon 4 chiffres significatifs
        if (Math.abs(v - Math.round(v)) < 1e-10) return String(Math.round(v));
        return math.format(v, { precision: 4 });
    }
};

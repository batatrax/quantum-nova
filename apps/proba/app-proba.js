/**
 * app-proba.js
 * Logique de l'application Statistiques et Probabilités.
 * Inspiré de ProbaStat (M. Wilhelm) pour la couverture conceptuelle.
 */

const ProbaApp = {
    init() {
        console.log("Proba App Initialisée");
        this.setupEventListeners();
    },

    setupEventListeners() {
        const bind = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', fn);
        };

        bind('proba-calc-stats', () => this.calculateStats());
        bind('proba-calc-comb', () => this.calculateCombinatorics());
        bind('proba-calc-bin', () => this.calculateBinomial());
        bind('proba-calc-norm', () => this.calculateNormal());
    },

    /* ========== Helpers DOM safes ========== */
    renderGrid(containerId, items, sessionTag = null) {
        const host = document.getElementById(containerId);
        if (!host) return;
        host.replaceChildren();

        const grid = document.createElement('div');
        grid.className = 'proba-res-grid';

        items.forEach(([label, value]) => {
            const cell = document.createElement('div');
            cell.className = 'res-item qn-copyable';
            cell.title = 'Cliquer pour copier';
            cell.dataset.copy = value;

            const lbl = document.createElement('span');
            lbl.textContent = label;
            cell.appendChild(lbl);
            cell.appendChild(document.createTextNode(' '));

            const strong = document.createElement('strong');
            strong.textContent = value;
            cell.appendChild(strong);

            grid.appendChild(cell);
        });

        host.appendChild(grid);

        if (sessionTag && window.QNSession) {
            const summary = items.map(([l, v]) => `${l} ${v}`).join(' | ');
            window.QNSession.push('proba', sessionTag, summary);
        }
    },

    renderError(containerId, msg) {
        const host = document.getElementById(containerId);
        if (!host) return;
        host.replaceChildren();
        const errBox = document.createElement('div');
        errBox.className = 'res-error';
        errBox.textContent = 'Erreur : ' + msg;
        host.appendChild(errBox);
    },

    fmt(v, p = 4) {
        return math.format(v, p);
    },

    /* ========== Statistiques descriptives ========== */
    calculateStats() {
        const input = document.getElementById('proba-stats-input').value;
        if (!input.trim()) return;

        try {
            const data = input.split(/[,;\s]+/)
                .map(v => parseFloat((v || '').replace(',', '.')))
                .filter(v => !isNaN(v));

            if (data.length === 0) throw new Error("aucune donnée valide");

            this.renderGrid('proba-res-stats', [
                ['Effectif :', String(data.length)],
                ['Moyenne :', this.fmt(math.mean(data))],
                ['Médiane :', this.fmt(math.median(data))],
                ['Écart-type :', this.fmt(math.std(data))],
                ['Variance :', this.fmt(math.variance(data))],
                ['Min / Max :', `${this.fmt(math.min(data))} / ${this.fmt(math.max(data))}`]
            ], `stats série[${data.length}]`);
        } catch (err) {
            this.renderError('proba-res-stats', err.message);
        }
    },

    /* ========== Combinatoire ========== */
    calculateCombinatorics() {
        const n = parseInt(document.getElementById('proba-n').value, 10);
        const k = parseInt(document.getElementById('proba-k').value, 10);

        try {
            if (isNaN(n) || n < 0) throw new Error("n doit être un entier ≥ 0");

            const items = [['n! :', this.fmt(math.factorial(n))]];

            if (!isNaN(k) && k >= 0 && k <= n) {
                items.push(['nCr (Comb.) :', this.fmt(math.combinations(n, k))]);
                items.push(['nPr (Perm.) :', this.fmt(math.permutations(n, k))]);
            } else {
                items.push(['nCr (Comb.) :', 'k invalide']);
                items.push(['nPr (Perm.) :', 'k invalide']);
            }

            this.renderGrid('proba-res-comb', items, `comb(n=${n}, k=${k})`);
        } catch (err) {
            this.renderError('proba-res-comb', err.message);
        }
    },

    /* ========== Loi Binomiale ========== */
    calculateBinomial() {
        const n = parseInt(document.getElementById('proba-bin-n').value, 10);
        const k = parseInt(document.getElementById('proba-bin-k').value, 10);
        const p = parseFloat(document.getElementById('proba-bin-p').value);

        try {
            if (isNaN(n) || n < 0) throw new Error("n doit être un entier ≥ 0");
            if (isNaN(k) || k < 0 || k > n) throw new Error("k doit vérifier 0 ≤ k ≤ n");
            if (isNaN(p) || p < 0 || p > 1) throw new Error("p doit être dans [0, 1]");

            const pmf = math.combinations(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);

            // Cumulative P(X ≤ k)
            let cdf = 0;
            for (let i = 0; i <= k; i++) {
                cdf += math.combinations(n, i) * Math.pow(p, i) * Math.pow(1 - p, n - i);
            }

            const mean = n * p;
            const variance = n * p * (1 - p);

            this.renderGrid('proba-res-bin', [
                ['P(X = k) :', this.fmt(pmf)],
                ['P(X ≤ k) :', this.fmt(cdf)],
                ['Espérance :', this.fmt(mean)],
                ['Variance :', this.fmt(variance)],
                ['Écart-type :', this.fmt(Math.sqrt(variance))]
            ], `B(n=${n}, p=${p}) | k=${k}`);
        } catch (err) {
            this.renderError('proba-res-bin', err.message);
        }
    },

    /* ========== Loi Normale ==========
     * f(x)  = (1 / σ√(2π)) · exp(−(x − μ)² / 2σ²)
     * P(X ≤ x) = ½ · (1 + erf((x − μ) / σ√2))
     */
    calculateNormal() {
        const mu = parseFloat(document.getElementById('proba-norm-mu').value);
        const sigma = parseFloat(document.getElementById('proba-norm-sigma').value);
        const x = parseFloat(document.getElementById('proba-norm-x').value);

        try {
            if (isNaN(mu)) throw new Error("μ invalide");
            if (isNaN(sigma) || sigma <= 0) throw new Error("σ doit être > 0");
            if (isNaN(x)) throw new Error("x invalide");

            const z = (x - mu) / sigma;
            const density = (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
            const cdf = 0.5 * (1 + ProbaApp.erf(z / Math.sqrt(2)));

            this.renderGrid('proba-res-norm', [
                ['z (centré-réduit) :', this.fmt(z)],
                ['Densité f(x) :', this.fmt(density)],
                ['P(X ≤ x) :', this.fmt(cdf)],
                ['P(X > x) :', this.fmt(1 - cdf)]
            ], `N(μ=${mu}, σ=${sigma}) | x=${x}`);
        } catch (err) {
            this.renderError('proba-res-norm', err.message);
        }
    },

    /**
     * Approximation de la fonction d'erreur (Abramowitz & Stegun 7.1.26).
     * Précision ~1.5e-7 — largement suffisant pour usage pédagogique.
     */
    erf(x) {
        const sign = x < 0 ? -1 : 1;
        const ax = Math.abs(x);
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;
        const t = 1 / (1 + p * ax);
        const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
        return sign * y;
    }
};

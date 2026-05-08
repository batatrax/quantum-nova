/**
 * app-algebra.js
 * Logique de l'application d'Algèbre (Calcul formel via math.js).
 */

const AlgebraApp = {
    init() {
        console.log("Algebra App Initialisée");
        this.setupEventListeners();
    },

    setupEventListeners() {
        const btnCalc = document.getElementById('algebra-execute');
        if (btnCalc) {
            btnCalc.addEventListener('click', () => this.calculate());
        }

        const input = document.getElementById('algebra-input');
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.calculate();
            });
        }

        // Insertion rapide d'une fonction autour de l'expression courante
        document.querySelectorAll('.algebra-quick-fn').forEach(btn => {
            btn.addEventListener('click', () => {
                const fn = btn.dataset.fn;
                const inputEl = document.getElementById('algebra-input');
                inputEl.value = fn + '(' + inputEl.value + ')';
                inputEl.focus();
            });
        });
    },

    calculate() {
        const input = document.getElementById('algebra-input').value;
        const mode = document.getElementById('algebra-mode').value;
        const resultArea = document.getElementById('algebra-result-display');

        if (!input.trim()) return;

        resultArea.replaceChildren();

        try {
            let res;
            let modeLabel = mode;
            switch (mode) {
                case 'derive':
                    res = math.derivative(input, 'x').toString();
                    modeLabel = 'd/dx';
                    break;
                case 'simplify':
                    res = math.simplify(input).toString();
                    modeLabel = 'simplification';
                    break;
                case 'rationalize':
                    res = math.rationalize(input).toString();
                    modeLabel = 'forme rationnelle';
                    break;
                case 'eval':
                default:
                    res = math.evaluate(input).toString();
                    modeLabel = 'évaluation';
                    break;
            }

            const box = document.createElement('div');
            box.className = 'algebra-res-box';

            const label = document.createElement('span');
            label.className = 'label';
            label.textContent = `Résultat (${modeLabel}) :`;
            box.appendChild(label);

            const value = document.createElement('div');
            value.className = 'value qn-copyable';
            value.title = 'Cliquer pour copier';
            value.textContent = res;
            box.appendChild(value);

            resultArea.appendChild(box);

            if (window.QNSession) window.QNSession.push('algebra', `${modeLabel}: ${input}`, res);
        } catch (err) {
            const errBox = document.createElement('div');
            errBox.className = 'res-error';
            errBox.textContent = 'Erreur : ' + AlgebraApp.humanizeError(err);
            resultArea.appendChild(errBox);
        }
    },

    humanizeError(err) {
        const m = err && err.message ? String(err.message) : String(err);
        if (/Undefined symbol/i.test(m)) return "symbole non défini — ajoutez sa valeur ou utilisez x.";
        if (/Unexpected/i.test(m)) return "syntaxe invalide — vérifiez les parenthèses.";
        return m;
    }
};

/**
 * app-calc.js
 * Logique de la calculatrice standard pour la V6.
 * Utilise math.js pour le parsing et l'évaluation.
 */

const CalcApp = {
    screen: null,
    history: [],
    _keydownBound: false,

    init() {
        console.log("Calc App Initialisée");
        this.screen = document.getElementById('calc-display');
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Intercepter les clics sur le clavier virtuel (template re-cloné à
        // chaque entrée → handler à rebrancher systématiquement)
        const keyboard = document.querySelector('.calc-keyboard');
        if (keyboard) {
            keyboard.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;

                const val = btn.dataset.val;
                const action = btn.dataset.action;

                if (action) {
                    this.executeAction(action);
                } else if (val) {
                    this.appendToScreen(val);
                }
            });
        }

        // Support du clavier physique (attaché à `document` → ne le brancher
        // qu'une fois par session pour éviter les doublons à chaque navigation)
        if (!this._keydownBound) {
            document.addEventListener('keydown', (e) => {
                if (!window.qnApp || window.qnApp.currentApp !== 'calc') return;

                if (e.key >= '0' && e.key <= '9' || '+-*/.()^'.includes(e.key)) {
                    this.appendToScreen(e.key);
                } else if (e.key === 'Enter') {
                    this.evaluate();
                } else if (e.key === 'Backspace') {
                    this.executeAction('backspace');
                } else if (e.key === 'Escape') {
                    this.executeAction('clear');
                }
            });
            this._keydownBound = true;
        }
    },

    appendToScreen(val) {
        if (this.screen.value === '0' && val !== '.') {
            this.screen.value = val;
        } else {
            this.screen.value += val;
        }
        this.screen.scrollLeft = this.screen.scrollWidth;
    },

    executeAction(action) {
        switch (action) {
            case 'clear':
                this.screen.value = '0';
                break;
            case 'backspace':
                if (this.screen.value.length > 1) {
                    this.screen.value = this.screen.value.slice(0, -1);
                } else {
                    this.screen.value = '0';
                }
                break;
            case 'evaluate':
                this.evaluate();
                break;
            case 'ans':
                if (this.history.length > 0) {
                    this.appendToScreen(this.history[this.history.length - 1]);
                }
                break;
        }
    },

    evaluate() {
        const expr = this.screen.value;
        if (!expr || expr === '0') return;

        try {
            const result = math.evaluate(expr);
            const formattedResult = math.format(result, { precision: 10 });

            // Ajouter à l'historique visuel + session globale
            this.addToHistory(expr, formattedResult);
            if (window.QNSession) window.QNSession.push('calc', expr, formattedResult);

            // Mettre à jour l'écran avec le résultat
            this.screen.value = formattedResult;
            this.history.push(formattedResult);

        } catch (err) {
            console.error(err);
            this.screen.value = "Erreur";
            setTimeout(() => { this.screen.value = expr; }, 1500);
        }
    },

    addToHistory(expr, res) {
        const historyList = document.getElementById('calc-history-list');
        if (!historyList) return;

        const item = document.createElement('div');
        item.className = 'history-item';

        const exprSpan = document.createElement('span');
        exprSpan.className = 'expr';
        exprSpan.textContent = expr + ' =';

        const resSpan = document.createElement('span');
        resSpan.className = 'res';
        resSpan.textContent = res;

        item.append(exprSpan, resSpan);
        historyList.prepend(item);

        // Limiter à 10 items
        if (historyList.children.length > 10) {
            historyList.removeChild(historyList.lastChild);
        }
    }
};

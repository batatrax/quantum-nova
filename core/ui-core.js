/**
 * ui-core.js
 * Logique UI partagée pour le Shell V6.
 */

// Session globale : tous les modules y déposent leurs calculs pour que
// l'export et l'historique soient cross-modules.
window.QNSession = window.QNSession || {
    history: [],
    push(module, expression, result) {
        this.history.push({
            module,
            expression: String(expression),
            result: String(result),
            ts: new Date().toISOString()
        });
        if (this.history.length > 200) this.history.shift();
    }
};

const UICore = {
    themes: ['cyber', 'light', 'phosphor', 'plasma'],
    // Index 1 = 'light' : thème clair par défaut, conformément au design produit.
    currentThemeIndex: 1,

    init() {
        console.log("UI Core Initialisé");
        this.loadTheme();
        this.setupGlobalEvents();
        this.setupResultCopy();
    },

    /**
     * Délégation globale : tout élément portant la classe `qn-copyable`
     * peut être copié dans le presse-papier d'un clic. Le module n'a qu'à
     * ajouter `class="qn-copyable"` sur sa boîte de résultat.
     */
    setupResultCopy() {
        document.addEventListener('click', async (e) => {
            const target = e.target.closest('.qn-copyable');
            if (!target) return;
            const text = target.dataset.copy || target.textContent.trim();
            if (!text) return;
            try {
                await navigator.clipboard.writeText(text);
                target.classList.add('qn-copied');
                setTimeout(() => target.classList.remove('qn-copied'), 800);
            } catch (err) {
                console.warn('Clipboard indisponible :', err);
            }
        });
    },

    setupGlobalEvents() {
        // Bouton Aide
        document.getElementById('btn-help').addEventListener('click', () => {
            window.qnApp.loadView('help');
        });

        // Bouton Thème
        document.getElementById('btn-theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Bouton Export (Basique: Télécharge l'historique de calcul)
        document.getElementById('btn-export-all').addEventListener('click', () => {
            this.exportSession();
        });

        // Raccourcis clavier globaux. On évite d'intercepter quand l'utilisateur
        // tape dans un champ texte ou que le module Calc/Graph utilise déjà
        // Escape comme touche d'effacement.
        document.addEventListener('keydown', (e) => {
            const tag = (e.target.tagName || '').toUpperCase();
            const inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
            const app = window.qnApp ? window.qnApp.currentApp : null;

            // Esc : retour home (sauf si une app a déjà le focus dans un champ
            // ou utilise sa propre touche Escape — calc l'utilise pour clear)
            if (e.key === 'Escape' && !inField && app !== 'calc') {
                window.qnApp.loadView('home');
                e.preventDefault();
                return;
            }

            // ? ou F1 : ouvre l'aide
            if ((e.key === '?' || e.key === 'F1') && !inField) {
                window.qnApp.loadView('help');
                e.preventDefault();
                return;
            }

            // Alt+1..5 : lance un module directement (Alt évite les conflits
            // avec les pavés numériques de la calc)
            if (e.altKey && !e.ctrlKey && !e.metaKey) {
                const map = { '1': 'calc', '2': 'graph', '3': 'matrix', '4': 'algebra', '5': 'proba' };
                if (map[e.key]) {
                    window.qnApp.loadView(map[e.key]);
                    e.preventDefault();
                }
            }
        });
    },

    exportSession() {
        // Compose un export de session multi-modules : on agrège l'historique
        // partagé QNSession + l'historique du grapheur (DOM-only).
        const lines = [
            'QUANTUM-NOVA V6 — EXPORT DE SESSION',
            'Date : ' + new Date().toLocaleString(),
            '',
            '─── HISTORIQUE MULTI-MODULES ───'
        ];

        const items = (window.QNSession && window.QNSession.history) || [];
        if (items.length === 0) {
            lines.push('(aucun calcul enregistré)');
        } else {
            items.forEach(it => {
                lines.push(`[${it.module}] ${it.expression} = ${it.result}`);
            });
        }

        const graphLog = document.getElementById('historyLog');
        if (graphLog && graphLog.innerText.trim()) {
            lines.push('', '─── LOG GRAPHEUR ───', graphLog.innerText.trim());
        }

        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qn_v6_export_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    },

    toggleTheme() {
        this.currentThemeIndex = (this.currentThemeIndex + 1) % this.themes.length;
        const newTheme = this.themes[this.currentThemeIndex];

        // Si le moteur V5 est chargé, on délègue : setTheme() persiste,
        // redessine le canvas, met à jour la légende et synchronise l'UI.
        if (typeof setTheme === 'function') {
            setTheme(newTheme);
            return;
        }

        // Fallback : moteur V5 absent (ne devrait pas arriver en pratique).
        document.documentElement.setAttribute('data-theme', newTheme);
        try {
            localStorage.setItem('qn:theme', newTheme);
        } catch (e) {
            // Silencieux : navigation privée stricte ou quota dépassé.
        }
    },

    loadTheme() {
        let saved = null;
        try {
            saved = localStorage.getItem('qn:theme');
        } catch (e) {
            // localStorage indisponible : on reste sur le défaut.
        }
        if (saved && this.themes.includes(saved)) {
            this.currentThemeIndex = this.themes.indexOf(saved);
            document.documentElement.setAttribute('data-theme', saved);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => UICore.init());

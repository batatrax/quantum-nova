/**
 * app-manager.js
 * Gère la navigation entre le menu principal et les applications modulaires.
 */

class AppManager {
    constructor() {
        this.viewport = document.getElementById('view-viewport');
        this.breadcrumb = document.getElementById('breadcrumb');
        this.currentApp = null;
        this.history = [];

        // Libellés humains pour le fil d'Ariane du header.
        this.appLabels = {
            home: '',
            calc: 'CALCUL',
            graph: 'TRACÉ',
            matrix: 'MATRICES',
            algebra: 'ALGÈBRE',
            proba: 'STATISTIQUES',
            help: 'MANUEL'
        };

        this.initEventListeners();
        this.loadView('home');
        this.startClock();
    }

    initEventListeners() {
        // Boutons de navigation globale
        document.getElementById('btn-home').addEventListener('click', () => this.loadView('home'));
        document.getElementById('btn-back').addEventListener('click', () => this.goBack());
        
        // Délégation d'événement pour le menu d'accueil
        this.viewport.addEventListener('click', (e) => {
            const launchBtn = e.target.closest('.qn-launch-card');
            if (launchBtn) {
                const appName = launchBtn.dataset.app;
                this.loadView(appName);
            }
        });
    }

    /**
     * Charge une vue (soit le home, soit une application spécifique)
     */
    loadView(viewId) {
        if (this.currentApp === viewId) return;

        console.log(`Chargement de la vue : ${viewId}`);

        // 1. Chercher le template
        const template = document.getElementById(`tpl-${viewId}`);
        if (!template) {
            this.viewport.innerHTML = `<div class="error">Erreur: Module "${viewId}" non implémenté.</div>`;
            return;
        }

        // 2. Vider le viewport et injecter le nouveau contenu
        this.viewport.innerHTML = '';
        this.viewport.classList.remove('app-transition');
        void this.viewport.offsetWidth; // Trigger reflow
        this.viewport.classList.add('app-transition');
        
        const clone = template.content.cloneNode(true);
        this.viewport.appendChild(clone);

        // 3. Mettre à jour l'état
        if (this.currentApp) this.history.push(this.currentApp);
        this.currentApp = viewId;

        // 4. Synchroniser le breadcrumb et l'état du bouton BACK
        this.updateChrome();

        // 5. Initialiser la logique spécifique à l'app si nécessaire
        this.initAppLogic(viewId);
    }

    updateChrome() {
        // Breadcrumb : on n'affiche rien sur la home, sinon "› MODULE"
        if (this.breadcrumb) {
            const label = this.appLabels[this.currentApp];
            this.breadcrumb.textContent = label ? `› ${label}` : '';
        }

        // Bouton BACK désactivé quand pile vide
        const backBtn = document.getElementById('btn-back');
        if (backBtn) {
            backBtn.disabled = this.history.length === 0;
        }
    }

    goBack() {
        if (this.history.length > 0) {
            const previous = this.history.pop();
            this.loadView(previous);
        } else {
            this.loadView('home');
        }
    }

    initAppLogic(appId) {
        // C'est ici qu'on branchera les initialiseurs de chaque application
        if (appId === 'home') {
            if (typeof window.qnRenderExampleList === 'function') {
                window.qnRenderExampleList();
            }
        } else if (appId === 'matrix') {
            MatrixApp.init();
            MatrixApp.generateGrid('A'); // Génère par défaut 3x3
        } else if (appId === 'algebra') {
            AlgebraApp.init();
        } else if (appId === 'calc') {
            CalcApp.init();
        } else if (appId === 'graph') {
            GraphApp.init();
        } else if (appId === 'proba') {
            ProbaApp.init();
        }
    }

    startClock() {
        const clockEl = document.getElementById('clock');
        const update = () => {
            const now = new Date();
            clockEl.textContent = now.getHours().toString().padStart(2, '0') + ':' + 
                                 now.getMinutes().toString().padStart(2, '0');
        };
        setInterval(update, 1000);
        update();
    }
}

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    window.qnApp = new AppManager();
});

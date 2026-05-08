/**
 * mode-menu.js
 * Pilote l'overlay de sélection de mode (V6 evolution sur base V5).
 *
 * Pour ajouter un module en V7 : compléter le tableau MODES ci-dessous.
 * Aucune autre intervention HTML n'est nécessaire.
 *
 * Étape 1 : seul le mode "graph" est fonctionnel — il révèle le canvas V5.
 * Les autres modes (calc, matrix, stats, algebra, …) seront branchés ensuite.
 */

(function () {
    'use strict';

    // ------------------------------------------------------------------
    // Catalogue des modes — point d'extension principal pour la V7+
    // ------------------------------------------------------------------
    // - id        : identifiant interne (snake-case court)
    // - icon      : emoji ou caractère unicode affiché à gauche
    // - title     : libellé court (FR), une à deux paroles max
    // - desc      : sous-titre (FR), une phrase courte
    // - status    : 'ready' = branché ; 'soon' = visible mais désactivé
    // - label     : libellé à utiliser dans le statusText (forme courte MAJ)
    // ------------------------------------------------------------------
    // La carte "Calcul" est intentionnellement absente : c'est le mode par
    // défaut, toujours actif. On en sort en choisissant un module spécialisé.
    // SVG sinusoïde + axes pour le mode Graphique. Monochrome (currentColor)
    // donc s'adapte à la couleur du thème.
    const ICON_SINUSOIDE = `
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
             stroke="currentColor" stroke-width="1.5"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="2"  y1="12" x2="22" y2="12" stroke-opacity="0.35"/>
            <line x1="12" y1="2"  x2="12" y2="22" stroke-opacity="0.35"/>
            <path d="M2 12 C 5 4, 8 4, 12 12 C 16 20, 19 20, 22 12"/>
        </svg>
    `;

    const MODES = [
        { id: 'calc',     icon: '🔢', title: 'Calculatrice',  desc: 'Calculs simples et avancés',    status: 'ready', label: 'CALCUL' },
        { id: 'graph',    iconSvg: ICON_SINUSOIDE, title: 'Tracé Graphique', desc: 'Fonctions et courbes', status: 'ready', label: 'GRAPHIQUE' },
        { id: 'scientific', icon: 'ƒ',  title: 'Scientifique',  desc: 'Trigo, log, complexes',         status: 'ready', label: 'SCIENTIFIQUE' },
        { id: 'matrix',   icon: '🔲', title: 'Matrices',      desc: 'Systèmes d’équations',          status: 'ready', label: 'MATRICES' },
        { id: 'stats',    icon: '🎲', title: 'Statistiques',  desc: 'Probabilités et séries',        status: 'soon',  label: 'STATISTIQUES' }
    ];

    // ------------------------------------------------------------------
    // Construction des cartes (DOM safe, pas d'innerHTML sur entrée externe)
    // ------------------------------------------------------------------
    function buildCards() {
        const grid = document.getElementById('modeMenuGrid');
        if (!grid) return;
        grid.replaceChildren();

        MODES.forEach(mode => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'mode-card';
            card.dataset.mode = mode.id;
            // Tooltip natif : la description (cachée visuellement pour
            // gagner de la place) reste accessible au survol.
            if (mode.desc) card.title = mode.desc;
            if (mode.status === 'soon') card.classList.add('mode-card-soon');

            const icon = document.createElement('span');
            icon.className = 'mode-icon';
            if (mode.iconSvg) {
                // SVG inline contrôlé par nous-même — pas de saisie utilisateur,
                // donc createContextualFragment est sûr ici.
                const range = document.createRange();
                icon.appendChild(range.createContextualFragment(mode.iconSvg));
                icon.classList.add('mode-icon-svg');
            } else {
                icon.textContent = mode.icon;
            }
            card.appendChild(icon);

            const title = document.createElement('span');
            title.className = 'mode-title';
            title.textContent = mode.title;
            card.appendChild(title);

            const desc = document.createElement('span');
            desc.className = 'mode-desc';
            desc.textContent = mode.desc;
            card.appendChild(desc);

            card.addEventListener('click', () => selectionnerMode(mode));
            grid.appendChild(card);
        });
    }

    // ------------------------------------------------------------------
    // Affichage / masquage de l'overlay
    // ------------------------------------------------------------------
    function getMenu() { return document.getElementById('modeMenu'); }

    function fermerMenuModes() {
        const menu = getMenu();
        if (menu) menu.classList.remove('open');
    }

    function ouvrirMenuModes() {
        // Cliquer sur ≡ MENU revient toujours à l'état "calculatrice
        // classique + menu ouvert" : on repasse en mode CALCUL, on recharge
        // son clavier, on ferme un éventuel sous-panneau (MATH du mode
        // scientifique) puis on affiche le menu.
        appliquerClasseMode('calc');
        if (window.MODE_HANDLERS && window.MODE_HANDLERS.calc
                && typeof window.MODE_HANDLERS.calc.apply === 'function') {
            window.MODE_HANDLERS.calc.apply();
        }
        if (typeof window.loadKeyboard === 'function') {
            window.loadKeyboard('calc');
        }
        if (typeof window.fermerMath === 'function') {
            window.fermerMath();
        }
        const status = document.getElementById('statusText');
        if (status) status.textContent = 'MODE CALCUL // ACTIF';

        const menu = getMenu();
        if (menu) menu.classList.add('open');
    }

    /**
     * Applique la classe `mode-<id>` sur le body pour piloter la visibilité
     * des éléments propres à chaque mode (ex. function-legend / log-module
     * uniquement en mode Tracé).
     */
    function appliquerClasseMode(modeId) {
        const body = document.body;
        if (!body) return;
        // On retire toutes les classes mode-* précédentes
        Array.from(body.classList)
            .filter(c => c.startsWith('mode-'))
            .forEach(c => body.classList.remove(c));
        body.classList.add(`mode-${modeId}`);
    }

    // ------------------------------------------------------------------
    // Sélection d'un mode
    // ------------------------------------------------------------------
    function selectionnerMode(mode) {
        const status = document.getElementById('statusText');
        if (status) status.textContent = `MODE ${mode.label} // ACTIF`;

        appliquerClasseMode(mode.id);

        // Recharge le clavier dédié au mode choisi.
        if (typeof window.loadKeyboard === 'function') {
            window.loadKeyboard(mode.id);
        }

        // Applique l'UI propre au mode (placeholder, panneaux dédiés, etc.).
        // Chaque mode est défini dans modes/<id>.js et s'enregistre dans
        // window.MODE_HANDLERS au chargement de son fichier.
        if (window.MODE_HANDLERS && window.MODE_HANDLERS[mode.id]
                && typeof window.MODE_HANDLERS[mode.id].apply === 'function') {
            window.MODE_HANDLERS[mode.id].apply();
        }

        // Le menu reste ouvert pour les modes "calculatrice" (calc,
        // scientifique) afin de garder l'historique visible. Pour les
        // modes qui ont leur propre zone d'édition dans le canvas
        // (graph, matrix, et plus tard stats), on ferme le menu pour
        // libérer la place.
        if (mode.id === 'graph' || mode.id === 'matrix' || mode.id === 'stats') {
            fermerMenuModes();
        } else {
            const menu = getMenu();
            if (menu) menu.classList.add('open');
        }

        // Le mode Tracé bénéficie du canvas V5 directement.
        // Les autres modes affichent leur clavier dédié, l'interface
        // spécifique (grilles matrices, formulaires stats…) sera branchée
        // à l'étape suivante.
        const inputScreen = document.getElementById('screen');
        if (inputScreen) inputScreen.focus();

        if (mode.id !== 'graph' && mode.id !== 'calc' && mode.id !== 'scientific') {
            if (typeof ajouterLog === 'function') {
                ajouterLog(
                    `Mode ${mode.label}`,
                    'Clavier chargé — la zone de saisie spécialisée arrive à l\'étape suivante.',
                    'var(--text-warn, orange)'
                );
            }
        }
    }

    // Exposition globale pour l'attribut onclick="ouvrirMenuModes()"
    window.ouvrirMenuModes = ouvrirMenuModes;

    /**
     * Pilotage du sélecteur de thème custom : bouton-icône + dropdown.
     * Le bouton ne montre rien d'autre que son icône ; au survol, le tooltip
     * indique le thème courant. Le dropdown s'ouvre au clic et liste les
     * 4 thèmes ; l'option active a une coche.
     */
    const THEME_LABELS = {
        light:    'Clair',
        cyber:    'Cyber',
        phosphor: 'Phosphor',
        plasma:   'Plasma'
    };

    function getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme') || 'light';
    }

    function refreshThemeUI() {
        const trigger = document.getElementById('themeTrigger');
        const dropdown = document.getElementById('themeDropdown');
        const current = getCurrentTheme();

        if (trigger) {
            trigger.title = `Thème : ${THEME_LABELS[current] || current}`;
        }
        if (dropdown) {
            dropdown.querySelectorAll('button[data-theme]').forEach(b => {
                b.classList.toggle('active', b.dataset.theme === current);
            });
        }
    }

    function setupThemeControl() {
        const ctrl = document.getElementById('themeControl');
        const trigger = document.getElementById('themeTrigger');
        const dropdown = document.getElementById('themeDropdown');
        if (!ctrl || !trigger || !dropdown) return;

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const opening = dropdown.hasAttribute('hidden');
            if (opening) dropdown.removeAttribute('hidden');
            else dropdown.setAttribute('hidden', '');
            trigger.setAttribute('aria-expanded', opening ? 'true' : 'false');
        });

        dropdown.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-theme]');
            if (!btn) return;
            const theme = btn.dataset.theme;
            if (typeof setTheme === 'function') setTheme(theme);
            else document.documentElement.setAttribute('data-theme', theme);
            dropdown.setAttribute('hidden', '');
            trigger.setAttribute('aria-expanded', 'false');
            refreshThemeUI();
        });

        // Click n'importe où ailleurs ferme le dropdown
        document.addEventListener('click', (e) => {
            if (e.target.closest('#themeControl')) return;
            dropdown.setAttribute('hidden', '');
            trigger.setAttribute('aria-expanded', 'false');
        });

        refreshThemeUI();
    }

    /**
     * Diffuse le thème courant vers tout abonné (panel.html notamment).
     * On observe data-theme sur <html> et on émet à chaque changement.
     */
    function setupThemeBroadcast() {
        let chan = null;
        try { chan = new BroadcastChannel('quantum-nova'); } catch (e) { /* fallback CustomEvent uniquement */ }

        // Mémorise le dernier thème émis pour éviter d'émettre deux fois
        // d'affilée la même valeur — anti-boucle quand panel.js (intégré
        // dans la même fenêtre) ré-écrit data-theme.
        let lastEmitted = null;

        const emit = () => {
            const theme = document.documentElement.getAttribute('data-theme') || 'light';
            if (theme === lastEmitted) return;
            lastEmitted = theme;
            const msg = { type: 'theme-change', theme };
            if (chan) { try { chan.postMessage(msg); } catch (e) {} }
            try { window.dispatchEvent(new CustomEvent('qn-bus', { detail: msg })); } catch (e) {}
        };

        emit();   // émission initiale pour synchro au démarrage du panel

        const obs = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.attributeName === 'data-theme') {
                    emit();
                    refreshThemeUI();    // tooltip + coche actif
                    break;
                }
            }
        });
        obs.observe(document.documentElement, { attributes: true });
    }

    document.addEventListener('DOMContentLoaded', () => {
        buildCards();
        setupThemeControl();
        setupThemeBroadcast();

        // Mode CALCUL actif par défaut → calculatrice utilisable d'emblée
        appliquerClasseMode('calc');
        if (window.MODE_HANDLERS && window.MODE_HANDLERS.calc
                && typeof window.MODE_HANDLERS.calc.apply === 'function') {
            window.MODE_HANDLERS.calc.apply();
        }
        const status = document.getElementById('statusText');
        if (status) status.textContent = 'MODE CALCUL // ACTIF';

        // Menu visible au démarrage : l'utilisateur voit immédiatement
        // les modules disponibles tout en pouvant utiliser la calculatrice.
        ouvrirMenuModes();
    });
})();

/**
 * core/help.js
 * Bouton AIDE de la calculatrice — affiche un SOMMAIRE de navigation
 * (et rien d'autre). Le contenu effectif est rendu dans le PANNEAU ANNEXE
 * (panel.html) en iframe à côté de la calc.
 *
 * Communication via BroadcastChannel('quantum-nova') :
 *   { type: 'show-help', section: 'graph' }       → panel affiche cette section
 *   { type: 'show-help', section: 'graph-examples' }  → panel affiche les exemples
 *
 * Au démarrage du panel, sa page d'accueil est "Premiers pas" (start) — donc
 * "start" n'apparaît PAS dans le sommaire de la calc.
 *
 * Si le panel n'est pas connecté (ouvert seul, sans demo.html / Sites
 * 2 iframes), le sommaire reste utilisable mais sans rendu de contenu —
 * c'est attendu : la calc seule n'est pas conçue pour héberger la doc
 * en grand format.
 */

(function () {
    'use strict';

    /**
     * Sections affichées dans le sommaire de la calc, dans l'ordre.
     * Chaque entrée :
     *   - id      : section principale (clé QNHelp)
     *   - label   : ce qu'on écrit sur le bouton
     *   - examples: id de la sous-section "Exemples" (optionnel)
     *
     * "start" n'est PAS listé — il sert de page d'accueil dans panel.html.
     */
    const SOMMAIRE = [
        { id: 'calc',       label: 'Calcul' },
        { id: 'graph',      label: 'Graphique',     examples: 'graph-examples' },
        { id: 'scientific', label: 'Scientifique',  examples: 'scientific-examples' },
        { id: 'matrix',     label: 'Matrices',      examples: 'matrix-examples' },
        { id: 'stats',      label: 'Statistiques',  examples: 'stats-examples' },
        { id: 'shortcuts',  label: 'Raccourcis' }
    ];

    /* ----- Communication avec panel.html ----- */
    let chan = null;
    try { chan = new BroadcastChannel('quantum-nova'); } catch (e) { chan = null; }

    function emitShowHelp(sectionId) {
        if (chan) {
            try { chan.postMessage({ type: 'show-help', section: sectionId }); }
            catch (e) { /* ignoré */ }
        }
    }

    /* ----- Construction du panneau-sommaire ----- */
    function buildPanel() {
        const panel = document.createElement('div');
        panel.id = 'helpPanel';
        panel.className = 'help-panel';

        const header = document.createElement('div');
        header.className = 'help-panel-header';

        const back = document.createElement('button');
        back.type = 'button';
        back.className = 'help-panel-back';
        back.textContent = '← Retour';
        back.title = 'Retour à la calculatrice';
        back.addEventListener('click', closeHelp);
        header.appendChild(back);

        const title = document.createElement('div');
        title.className = 'help-panel-title';
        title.textContent = 'Sommaire';
        header.appendChild(title);

        panel.appendChild(header);

        const list = document.createElement('nav');
        list.className = 'help-summary-list';

        SOMMAIRE.forEach(item => {
            const row = document.createElement('div');
            row.className = 'help-summary-row';

            const main = document.createElement('button');
            main.type = 'button';
            main.className = 'help-summary-main';
            main.textContent = item.label;
            main.addEventListener('click', () => emitShowHelp(item.id));
            row.appendChild(main);

            if (item.examples) {
                const ex = document.createElement('button');
                ex.type = 'button';
                ex.className = 'help-summary-examples';
                ex.textContent = 'Exemples';
                ex.title = `Exemples du mode ${item.label}`;
                ex.addEventListener('click', () => emitShowHelp(item.examples));
                row.appendChild(ex);
            }

            list.appendChild(row);
        });

        panel.appendChild(list);
        return panel;
    }

    function openHelp() {
        let panel = document.getElementById('helpPanel');
        if (!panel) {
            panel = buildPanel();
            const ws = document.querySelector('.workstation');
            (ws || document.body).appendChild(panel);
        }
        panel.classList.add('open');
    }

    function closeHelp() {
        const panel = document.getElementById('helpPanel');
        if (panel) panel.classList.remove('open');
    }

    window.ouvrirAide = openHelp;
    window.fermerAide = closeHelp;
})();

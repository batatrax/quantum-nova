/**
 * core/erase.js
 * Effacement contextuel + mini-panneau MÉMOIRE.
 *
 * - 🗑 EFFACER : selon le mode actif, efface le contenu pertinent
 *   (historique calculs / courbes graphique / etc.) et pousse un snapshot
 *   restaurable dans QNMemory.
 * - 💾 MÉMOIRE : ouvre un dropdown listant les snapshots de TOUS les modes,
 *   chacun cliquable pour restaurer. Bouton "Tout réinitialiser" en bas.
 *
 * Toute la logique est centralisée ici pour qu'un futur mode (ex : Matrices,
 * Statistiques) n'ait qu'à enregistrer son handler dans HANDLERS.
 */

(function () {
    'use strict';

    /* ---------------------------------------------------------------
       HANDLERS d'effacement par mode.
       Chaque handler doit :
         - retourner un snapshot (objet sérialisable)
         - effacer le contenu courant
         - être accompagné d'un restorer qui remet l'état depuis le snapshot
       --------------------------------------------------------------- */

    const HANDLERS = {
        calc: {
            label: 'Historique calculs',
            erase() {
                const items = (window.QNHistory && QNHistory.getEntries) ? QNHistory.getEntries() : [];
                if (window.QNHistory) QNHistory.clear();
                return items;
            },
            restore(snapshot) {
                if (!Array.isArray(snapshot) || !window.QNHistory) return;
                snapshot.forEach(it => QNHistory.add(it.expression, it.result, {
                    isError: it.isError, source: it.source
                }));
            }
        },

        scientific: {
            label: 'Historique scientifique',
            erase() {
                // Mêmes données que calc (l'historique est partagé)
                return HANDLERS.calc.erase();
            },
            restore(snapshot) { return HANDLERS.calc.restore(snapshot); }
        },

        graph: {
            label: 'Courbes tracées',
            erase() {
                // V5 expose `fonctionsAffichees` côté window. On en sauve une copie
                // et on appelle effacerGraphe() qui les vide.
                const snap = (typeof fonctionsAffichees !== 'undefined' && Array.isArray(fonctionsAffichees))
                    ? fonctionsAffichees.slice()
                    : [];
                if (typeof effacerGraphe === 'function') effacerGraphe();
                return snap;
            },
            restore(snapshot) {
                if (!Array.isArray(snapshot)) return;
                if (typeof fonctionsAffichees !== 'undefined') {
                    fonctionsAffichees.length = 0;
                    snapshot.forEach(f => fonctionsAffichees.push(f));
                }
                if (typeof updateLegende === 'function') updateLegende();
                if (typeof dessiner === 'function') dessiner();
            }
        }

        // matrix, stats : à brancher quand leurs UI auront un état effaçable.
    };

    function getCurrentMode() {
        const cls = (document.body && document.body.className) || '';
        const m = cls.match(/\bmode-([a-z]+)\b/);
        return m ? m[1] : 'calc';
    }

    /* ---------------------------------------------------------------
       Effacement contextuel
       --------------------------------------------------------------- */
    function eraseCurrent() {
        const mode = getCurrentMode();
        const handler = HANDLERS[mode];
        if (!handler) return;

        const data = handler.erase();
        if (!data || (Array.isArray(data) && data.length === 0)) return;   // rien à sauver

        if (window.QNMemory) {
            QNMemory.save({
                category: mode,
                label: `${handler.label} — ${formatNow()}`,
                data,
                restore: handler.restore
            });
        }

        renderMemoryPanel();      // rafraîchit si ouvert
    }

    function formatNow() {
        const d = new Date();
        return d.getHours().toString().padStart(2, '0') + ':' +
               d.getMinutes().toString().padStart(2, '0') + ':' +
               d.getSeconds().toString().padStart(2, '0');
    }

    /* ---------------------------------------------------------------
       Panneau MÉMOIRE
       --------------------------------------------------------------- */
    function toggleMemoryPanel() {
        const panel = document.getElementById('memoryPanel');
        if (!panel) return;
        if (panel.hasAttribute('hidden')) {
            renderMemoryPanel();
            positionPanel();
            panel.removeAttribute('hidden');
        } else {
            panel.setAttribute('hidden', '');
        }
    }

    /** Place le panneau juste sous le bouton MÉMOIRE, aligné à droite. */
    function positionPanel() {
        const btn = document.getElementById('memoryBtn');
        const panel = document.getElementById('memoryPanel');
        if (!btn || !panel) return;
        const rect = btn.getBoundingClientRect();
        panel.style.top = (rect.bottom + 4) + 'px';
        panel.style.right = Math.max(8, window.innerWidth - rect.right) + 'px';
        panel.style.left = 'auto';
    }

    function closeMemoryPanel() {
        const panel = document.getElementById('memoryPanel');
        if (panel) panel.setAttribute('hidden', '');
    }

    function renderMemoryPanel() {
        const panel = document.getElementById('memoryPanel');
        if (!panel) return;
        panel.replaceChildren();

        const items = (window.QNMemory && QNMemory.list) ? QNMemory.list() : [];

        const head = document.createElement('div');
        head.className = 'memory-panel-head';
        head.textContent = items.length
            ? `${items.length} snapshot${items.length > 1 ? 's' : ''}`
            : 'Aucun effacement à restaurer';
        panel.appendChild(head);

        if (items.length) {
            const list = document.createElement('ul');
            list.className = 'memory-list';
            items.forEach(snap => {
                const li = document.createElement('li');

                const main = document.createElement('button');
                main.type = 'button';
                main.className = 'memory-restore';
                main.textContent = `↺  ${snap.label}`;
                main.title = `Restaurer (${snap.category})`;
                main.addEventListener('click', () => {
                    QNMemory.restore(snap.id);
                    closeMemoryPanel();
                });
                li.appendChild(main);

                const del = document.createElement('button');
                del.type = 'button';
                del.className = 'memory-delete';
                del.textContent = '✕';
                del.title = 'Supprimer ce snapshot';
                del.addEventListener('click', (e) => {
                    e.stopPropagation();
                    QNMemory.remove(snap.id);
                    renderMemoryPanel();
                });
                li.appendChild(del);

                list.appendChild(li);
            });
            panel.appendChild(list);
        }

        // Bouton "Tout réinitialiser" — équivaut à purgerMemoire V5
        const reset = document.createElement('button');
        reset.type = 'button';
        reset.className = 'memory-reset';
        reset.textContent = '⚠ Tout réinitialiser';
        reset.title = 'Efface variables + courbes + historique (action V5 purgerMemoire)';
        reset.addEventListener('click', () => {
            if (!confirm('Tout réinitialiser : variables, courbes et historique seront effacés. Continuer ?')) return;
            if (typeof purgerMemoire === 'function') purgerMemoire();
            if (window.QNHistory) QNHistory.clear();
            if (window.QNMemory) QNMemory.clearAll();
            closeMemoryPanel();
        });
        panel.appendChild(reset);
    }

    /* Click ailleurs ferme le panneau */
    document.addEventListener('click', (e) => {
        const panel = document.getElementById('memoryPanel');
        if (!panel || panel.hasAttribute('hidden')) return;
        if (e.target.closest('#memoryPanel') || e.target.closest('#memoryBtn')) return;
        closeMemoryPanel();
    });

    /* Re-render automatique quand QNMemory change */
    document.addEventListener('DOMContentLoaded', () => {
        if (window.QNMemory && QNMemory.subscribe) {
            QNMemory.subscribe(() => renderMemoryPanel());
        }
    });

    window.QNErase = { eraseCurrent, toggleMemoryPanel };
})();

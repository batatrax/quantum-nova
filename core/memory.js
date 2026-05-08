/**
 * core/memory.js
 * Service de mémoire / snapshots — API en place pour le palier 1.5.
 *
 * À chaque "effacement" d'un mode (courbes effacées, série stats vidée,
 * grille matrice réinitialisée, historique calc vidé...), le mode peut
 * pousser un snapshot ici. Le bouton 💾 MÉMOIRE listera les snapshots
 * et permettra à l'utilisateur de les restaurer.
 *
 * Pour l'instant : implémentation in-memory uniquement (perdue au refresh).
 * Le palier 3 ajoutera persistance localStorage + sync inter-iframe.
 *
 * Utilisation :
 *
 *     // Sauver l'état avant de l'effacer :
 *     const id = QNMemory.save({
 *         category: 'graph',
 *         label: 'f(x)=sin(x), g(x)=x²',
 *         data: { fonctions: [...], view: {...} },
 *         restore: (data) => { ... reconstruire l'état ... }
 *     });
 *
 *     // Lister tous les snapshots ou ceux d'une catégorie :
 *     QNMemory.list();              // tous
 *     QNMemory.list('graph');       // une catégorie
 *
 *     // Restaurer un snapshot :
 *     QNMemory.restore(id);
 *
 *     // Supprimer :
 *     QNMemory.remove(id);
 */

(function () {
    'use strict';

    const MAX_SNAPSHOTS = 20;
    const snapshots = [];      // {id, category, label, data, restoreFn, ts}
    let nextId = 1;

    /**
     * Enregistre un snapshot restaurable.
     * @param {object} opts
     * @param {string} opts.category    'graph' | 'calc' | 'matrix' | 'stats' | …
     * @param {string} opts.label       libellé court affiché à l'utilisateur
     * @param {*}      opts.data        données arbitraires nécessaires à la restauration
     * @param {Function} opts.restore   callback(data) qui reconstruit l'état
     * @returns {number} l'id du snapshot
     */
    function save(opts) {
        const o = opts || {};
        if (typeof o.restore !== 'function') {
            console.warn('QNMemory.save : opts.restore doit être une fonction');
            return -1;
        }
        const snap = {
            id: nextId++,
            category: o.category || 'misc',
            label: String(o.label || '(sans nom)'),
            data: o.data,
            restoreFn: o.restore,
            ts: Date.now()
        };
        snapshots.push(snap);
        // Rotation par catégorie pour ne pas qu'une catégorie écrase les autres
        const sameCat = snapshots.filter(s => s.category === snap.category);
        if (sameCat.length > MAX_SNAPSHOTS) {
            const oldest = sameCat[0];
            const idx = snapshots.indexOf(oldest);
            if (idx >= 0) snapshots.splice(idx, 1);
        }
        notify('save', snap);
        return snap.id;
    }

    function list(category) {
        const all = snapshots.slice().reverse();   // plus récents en tête
        return category ? all.filter(s => s.category === category) : all;
    }

    function restore(id) {
        const snap = snapshots.find(s => s.id === id);
        if (!snap) return false;
        try {
            snap.restoreFn(snap.data);
            notify('restore', snap);
            return true;
        } catch (e) {
            console.error('QNMemory.restore a échoué :', e);
            return false;
        }
    }

    function remove(id) {
        const idx = snapshots.findIndex(s => s.id === id);
        if (idx < 0) return false;
        const [snap] = snapshots.splice(idx, 1);
        notify('remove', snap);
        return true;
    }

    function clearAll() {
        snapshots.length = 0;
        notify('clear', null);
    }

    /* ---- Notifications (simple pub/sub pour le panneau MÉMOIRE) ---- */
    const subscribers = [];

    function subscribe(fn) {
        if (typeof fn === 'function') subscribers.push(fn);
        return () => {
            const i = subscribers.indexOf(fn);
            if (i >= 0) subscribers.splice(i, 1);
        };
    }

    function notify(event, snap) {
        subscribers.forEach(fn => {
            try { fn(event, snap); } catch (e) { /* ignore */ }
        });
    }

    window.QNMemory = { save, list, restore, remove, clearAll, subscribe };
})();

/**
 * core/history.js
 * Service d'historique partagé : zone CALCULATRICE du menu de modes.
 *
 * Utilisé par tous les modes qui produisent un résultat (calc, scientifique,
 * matrices à terme, stats à terme). Centralise :
 *   - le rendu DOM (#calcHistory) — DOM-safe, jamais d'innerHTML sur input
 *     utilisateur
 *   - la mémoire programmatique (lastResult pour ANS)
 *   - la limite d'entrées affichées (MAX_HISTORY)
 *
 * Les modes appellent uniquement les méthodes publiques :
 *   QNHistory.add(expression, result, { isError, source })
 *   QNHistory.getLast()
 *   QNHistory.clear()
 *   QNHistory.getEntries()    // pour la mémoire / restauration
 */

(function () {
    'use strict';

    const MAX_HISTORY = 12;
    const entries = [];               // store programmatique (en plus du DOM)
    let lastResult = null;

    function getHost() {
        return document.getElementById('calcHistory');
    }

    function removeEmptyPlaceholder(host) {
        const empty = host.querySelector('.calc-display-empty');
        if (empty) empty.remove();
    }

    function showEmptyPlaceholder(host) {
        if (host.querySelector('.calc-display-empty')) return;
        const empty = document.createElement('div');
        empty.className = 'calc-display-empty';
        empty.textContent = 'Tape ton calcul puis appuie sur =';
        host.appendChild(empty);
    }

    function renderEntry(entry) {
        const host = getHost();
        if (!host) return;

        removeEmptyPlaceholder(host);

        const item = document.createElement('div');
        item.className = 'calc-history-item';
        item.dataset.source = entry.source || 'calc';

        const expr = document.createElement('div');
        expr.className = 'calc-history-expr';
        expr.textContent = entry.expression;
        expr.title = "Cliquer pour réinjecter l'expression";
        expr.style.cursor = "pointer";
        expr.onclick = () => {
            const input = document.getElementById('screen');
            if (input) {
                input.value = entry.expression;
                input.focus();
            }
        };
        item.appendChild(expr);

        const res = document.createElement('div');
        res.className = 'calc-history-result' + (entry.isError ? ' is-error' : '');
        res.textContent = entry.isError
            ? `⚠ ${entry.result}`
            : `= ${entry.result}`;
        
        if (!entry.isError) {
            res.title = "Cliquer pour réinjecter le résultat";
            res.style.cursor = "pointer";
            res.onclick = () => {
                const input = document.getElementById('screen');
                if (input) {
                    // On injecte le résultat à la position du curseur ou à la fin
                    input.value += entry.result;
                    input.focus();
                }
            };
        }
        item.appendChild(res);

        // column-reverse → premier enfant DOM = dernier visuellement
        host.insertBefore(item, host.firstChild);

        while (host.children.length > MAX_HISTORY) {
            host.removeChild(host.lastChild);
        }
    }

    /**
     * Ajoute une entrée à l'historique.
     * @param {string} expression  texte saisi
     * @param {string} result      résultat formaté ou message d'erreur
     * @param {object} [opts]
     * @param {boolean} [opts.isError=false]
     * @param {string}  [opts.source='calc']  identifiant du mode source
     */
    function add(expression, result, opts) {
        const o = opts || {};
        const entry = {
            expression: String(expression),
            result: String(result),
            isError: !!o.isError,
            source: o.source || 'calc',
            ts: Date.now()
        };
        entries.push(entry);
        if (entries.length > MAX_HISTORY) entries.shift();

        if (!entry.isError) lastResult = entry.result;

        renderEntry(entry);
    }

    function getLast() {
        return lastResult;
    }

    function getEntries() {
        return entries.slice();   // copie défensive
    }

    function clear() {
        entries.length = 0;
        lastResult = null;
        const host = getHost();
        if (host) {
            host.replaceChildren();
            showEmptyPlaceholder(host);
        }
    }

    // API publique exposée sur window pour usage cross-modes.
    window.QNHistory = { add, getLast, getEntries, clear };
})();

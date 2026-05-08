/**
 * core/autocomplete/02_engine.js
 * Moteur logique de l'auto-complétion : pas de DOM lourd, juste la matière.
 *   - getCurrentToken(input) : extrait le mot identifiant à la position du curseur
 *   - getSuggestions(prefix) : combine catalogue + variables V5 + historique
 *   - applySuggestion(input, sug) : injecte une suggestion dans la saisie
 *   - autoCloseParens(input) : ferme les parenthèses oubliées avant éval
 *   - unbalancedOpenParens(s) : compte les '(' non refermées
 */

window.QNAutocompleteEngine = (function () {
    'use strict';

    function emitInput(input) {
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    /** Mot identifiant à la position du curseur. Doit commencer par une lettre. */
    function getCurrentToken(input) {
        const pos = input.selectionStart || 0;
        const v = input.value || '';
        let start = pos;
        while (start > 0 && /[a-zA-Z0-9_]/.test(v[start - 1])) start--;
        // Si le token commence par un chiffre, on saute jusqu'à la première lettre.
        while (start < pos && !/[a-zA-Z_]/.test(v[start])) start++;
        return { start, end: pos, text: v.slice(start, pos) };
    }

    /** Combine fonctions + variables V5 + historique récent en suggestions. */
    function getSuggestions(prefix) {
        if (!prefix) return [];
        const q = String(prefix).toLowerCase();
        const out = [];
        const seen = new Set();

        const FUNCTIONS = (window.QNAutocompleteCatalog || {}).FUNCTIONS || [];
        FUNCTIONS.forEach(f => {
            if (!f || !f.name) return;
            if (String(f.name).toLowerCase().startsWith(q)) {
                out.push(Object.assign({}, f));
                seen.add(f.name);
            }
        });

        // Variables V5 (scope global défini par engine.js).
        // On passe par window.scope pour éviter les ReferenceError en environnement strict.
        const liveScope = window.scope;
        if (liveScope && typeof liveScope === 'object') {
            Object.keys(liveScope).forEach(k => {
                if (k === 'cX' || k === 'cY') return;
                if (seen.has(k)) return;
                if (k.toLowerCase().startsWith(q)) {
                    out.push({ name: k, insert: k, desc: 'Variable', kind: 'var' });
                    seen.add(k);
                }
            });
        }

        // Historique récent (expressions QNHistory). L'historique ne doit jamais
        // casser l'autocomplétion si son format change ou si une entrée est vide.
        const history = window.QNHistory;
        if (history && typeof history.getEntries === 'function') {
            try {
                const entries = history.getEntries() || [];
                for (let i = entries.length - 1; i >= 0 && out.length < 12; i--) {
                    const expr = entries[i] && entries[i].expression;
                    if (!expr) continue;
                    const text = String(expr);
                    if (text.toLowerCase().startsWith(q) && !seen.has(text)) {
                        out.push({ name: text, insert: text, desc: 'Historique', kind: 'hist' });
                        seen.add(text);
                    }
                }
            } catch (e) {
                // Silencieux : l'autocomplétion reste utilisable sans historique.
            }
        }

        return out.slice(0, 8);
    }

    /** Insère une suggestion à la place du token courant. */
    function applySuggestion(input, sug) {
        if (!input || !sug) return;
        const tok = getCurrentToken(input);
        const v = input.value || '';
        const before = v.slice(0, tok.start);
        const after = v.slice(tok.end);
        let inserted = String(sug.insert || sug.name || '');
        const cursor = tok.start + inserted.length;

        // Une fonction sélectionnée devient un appel complet : sin() avec le curseur dedans.
        if (inserted.endsWith('(') && !after.startsWith(')')) {
            inserted += ')';
        }

        input.value = before + inserted + after;
        input.setSelectionRange(cursor, cursor);
        input.focus();
        emitInput(input);
    }

    /** Compte le nombre de '(' non refermées dans la chaîne. */
    function unbalancedOpenParens(s) {
        let open = 0;
        for (const c of String(s || '')) {
            if (c === '(') open++;
            else if (c === ')' && open > 0) open--;
        }
        return open;
    }

    /** Ferme automatiquement les parenthèses ouvertes restantes. */
    function autoCloseParens(input) {
        if (!input) return;
        const v = input.value || '';
        const missing = unbalancedOpenParens(v);
        if (missing > 0) {
            input.value = v + ')'.repeat(missing);
            emitInput(input);
        }
    }

    return {
        getCurrentToken,
        getSuggestions,
        applySuggestion,
        unbalancedOpenParens,
        autoCloseParens,
        emitInput
    };
})();

// API publique compat (modes/calc/01_mode_calc.js appelle QNAutocomplete.autoCloseParens)
window.QNAutocomplete = window.QNAutocomplete || {};
window.QNAutocomplete.autoCloseParens = window.QNAutocompleteEngine.autoCloseParens;
window.QNAutocomplete.getSuggestions   = window.QNAutocompleteEngine.getSuggestions;

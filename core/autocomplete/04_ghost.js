/**
 * core/autocomplete/04_ghost.js
 * Ghost text : prévisualise en GRIS la fin probable de la saisie de
 * l'utilisateur (suite d'une suggestion ou parenthèse fermante manquante).
 *
 * Le point important : ce texte grisé n'est PAS encore dans l'input.
 * Il devient réel uniquement si l'utilisateur l'accepte avec Tab / →,
 * ou indirectement au moment de l'évaluation via autoCloseParens().
 */

window.QNAutocompleteGhost = (function () {
    'use strict';

    let ghost = null;
    let lastSuffix = '';

    function ensureGhost(input) {
        if (ghost) return ghost;

        let wrap = input.parentElement;
        if (!wrap || !wrap.classList.contains('screen-wrap')) {
            wrap = document.createElement('div');
            wrap.className = 'screen-wrap';
            input.parentNode.insertBefore(wrap, input);
            wrap.appendChild(input);
        }

        ghost = document.createElement('div');
        ghost.className = 'autocomplete-ghost';
        ghost.setAttribute('aria-hidden', 'true');
        wrap.insertBefore(ghost, input);

        syncGhostStyle(input);

        input.addEventListener('scroll', () => {
            ghost.scrollLeft = input.scrollLeft;
        });

        return ghost;
    }

    function syncGhostStyle(input) {
        if (!ghost || !input) return;
        const cs = window.getComputedStyle(input);
        ghost.style.font = cs.font;
        ghost.style.padding = cs.padding;
        ghost.style.lineHeight = cs.lineHeight;
        ghost.style.textAlign = cs.textAlign;
        ghost.style.letterSpacing = cs.letterSpacing;
        ghost.style.border = cs.border;
        ghost.style.borderColor = 'transparent';
        ghost.style.borderRadius = cs.borderRadius;
    }

    function hideGhost() {
        lastSuffix = '';
        if (ghost) ghost.replaceChildren();
    }

    function computeSuffix(input, suggestion) {
        const pos = input.selectionStart || 0;
        const value = input.value || '';
        const tok = window.QNAutocompleteEngine.getCurrentToken(input);

        if (suggestion && tok.text) {
            const typed = tok.text.toLowerCase();
            const insertRaw = String(suggestion.insert || suggestion.name || '');
            const insert = insertRaw.toLowerCase();

            if (insert.startsWith(typed)) {
                return insertRaw.slice(tok.text.length);
            }
            if (suggestion.kind === 'fn' && typed === String(suggestion.name || '').toLowerCase()) {
                return '(';
            }
        }

        // Parenthèse fermante fantôme : si l'utilisateur a tapé une vraie '(',
        // on montre ')' en gris sans l'insérer immédiatement.
        const left = value.slice(0, pos);
        const right = value.slice(pos);
        const missing = window.QNAutocompleteEngine.unbalancedOpenParens(left);
        if (missing > 0 && !right.startsWith(')')) return ')';

        return '';
    }

    /**
     * Affiche le ghost. Par prudence UX, on ne le montre que quand le curseur
     * est à la fin : au milieu d'une expression, le suffixe grisé peut se
     * superposer au texte existant et devenir trompeur.
     */
    function renderGhost(input, opts) {
        ensureGhost(input);
        opts = opts || {};

        const pos = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const value = input.value || '';

        if (pos !== end || pos !== value.length) {
            hideGhost();
            return '';
        }

        const suffix = computeSuffix(input, opts.suggestion || null);
        if (!suffix) {
            hideGhost();
            return '';
        }

        lastSuffix = suffix;
        ghost.replaceChildren();

        const typedSpan = document.createElement('span');
        typedSpan.className = 'typed';
        typedSpan.textContent = value;

        const hintSpan = document.createElement('span');
        hintSpan.className = 'hint';
        hintSpan.textContent = suffix;

        ghost.appendChild(typedSpan);
        ghost.appendChild(hintSpan);
        ghost.scrollLeft = input.scrollLeft;
        return suffix;
    }

    /** Accepte le suffixe grisé courant : utile pour Tab / flèche droite. */
    function acceptGhost(input) {
        if (!input || !lastSuffix) return false;
        const pos = input.selectionStart || 0;
        const end = input.selectionEnd || pos;
        const value = input.value || '';
        input.value = value.slice(0, pos) + lastSuffix + value.slice(end);
        const next = pos + lastSuffix.length;
        input.setSelectionRange(next, next);
        input.focus();
        hideGhost();
        if (window.QNAutocompleteEngine && window.QNAutocompleteEngine.emitInput) {
            window.QNAutocompleteEngine.emitInput(input);
        }
        return true;
    }

    return {
        ensureGhost,
        syncGhostStyle,
        hideGhost,
        renderGhost,
        acceptGhost,
        getCurrentSuffix: () => lastSuffix
    };
})();

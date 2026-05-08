/**
 * core/autocomplete/05_wire.js
 * Orchestration : branche le moteur, le dropdown et le ghost à l'input
 * #screen. Ce fichier est le seul qui touche aux événements DOM ; les
 * autres modules sont passifs et exposent juste leur API.
 *
 *   tape une lettre  → engine.getSuggestions  → dropdown.show + ghost.render
 *   flèche haut/bas  → dropdown.setActive     + ghost.render
 *   Tab              → accepte suggestion OU suffixe grisé
 *   →                → accepte le suffixe grisé
 *   '('              → insère '(' seulement, ')' reste grisé
 *   Entrée           → autoCloseParens avant que onEvaluate ne lise
 *   Échap / blur     → dropdown.hide + ghost.hide
 */

(function () {
    'use strict';

    const Engine   = window.QNAutocompleteEngine;
    const Dropdown = window.QNAutocompleteDropdown;
    const Ghost    = window.QNAutocompleteGhost;

    let inputRef = null;
    let composing = false;

    function refreshGhost() {
        if (!inputRef) return;
        const sug = Dropdown.isOpen() ? Dropdown.getActiveSuggestion() : null;
        Ghost.renderGhost(inputRef, { suggestion: sug });
    }

    function onSelect(sug) {
        if (!inputRef || !sug) return;
        Engine.applySuggestion(inputRef, sug);
        Dropdown.hide();
        refreshGhost();
    }

    function insertSoftOpenParen(input) {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || start;
        const value = input.value || '';

        // Si du texte est sélectionné, comportement pratique : on l'enveloppe.
        if (start !== end) {
            const selected = value.slice(start, end);
            input.value = value.slice(0, start) + '(' + selected + ')' + value.slice(end);
            input.setSelectionRange(start + 1, start + 1 + selected.length);
            Engine.emitInput(input);
            return;
        }

        // Sinon, on insère seulement '(' ; ')' reste une suggestion grisée.
        input.value = value.slice(0, start) + '(' + value.slice(end);
        input.setSelectionRange(start + 1, start + 1);
        Engine.emitInput(input);
        refreshGhost();
    }

    function updateSuggestions() {
        if (!inputRef || composing) return;
        const tok = Engine.getCurrentToken(inputRef);
        if (tok.text.length === 0) {
            Dropdown.hide();
            refreshGhost();
            return;
        }
        const suggs = Engine.getSuggestions(tok.text);
        if (!suggs.length) {
            Dropdown.hide();
            refreshGhost();
            return;
        }
        Dropdown.show(inputRef, suggs);
        refreshGhost();
    }

    function setup() {
        const input = document.getElementById('screen');
        if (!input || !Engine || !Dropdown || !Ghost) return;
        if (input.dataset.qnAutocompleteReady === '1') return;
        input.dataset.qnAutocompleteReady = '1';
        inputRef = input;

        Dropdown.onSelect(onSelect);
        Ghost.ensureGhost(input);

        input.addEventListener('keydown', (e) => {
            // Navigation dans le dropdown si visible.
            if (Dropdown.isOpen()) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    Dropdown.setActive(Dropdown.getActiveIndex() + 1);
                    refreshGhost();
                    return;
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    Dropdown.setActive(Dropdown.getActiveIndex() - 1);
                    refreshGhost();
                    return;
                }
                if (e.key === 'Tab') {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(Dropdown.getActiveSuggestion());
                    return;
                }
                if (e.key === 'ArrowRight' && Ghost.getCurrentSuffix()) {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(Dropdown.getActiveSuggestion());
                    return;
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    Dropdown.hide();
                    Ghost.hideGhost();
                    return;
                }
            } else if ((e.key === 'Tab' || e.key === 'ArrowRight') && Ghost.getCurrentSuffix()) {
                // Sans dropdown ouvert : accepte seulement le texte grisé, par exemple ')'.
                e.preventDefault();
                e.stopPropagation();
                Ghost.acceptGhost(input);
                refreshGhost();
                return;
            }

            // Auto-pairing visuel : tape '(' → vraie '(' ; ')' reste grisée.
            if (e.key === '(') {
                e.preventDefault();
                insertSoftOpenParen(input);
                return;
            }

            // Auto-fermeture des parenthèses oubliées AVANT évaluation.
            if (e.key === 'Enter') {
                Engine.autoCloseParens(input);
                Ghost.hideGhost();
            }
        }, true);    // capture phase

        input.addEventListener('input', updateSuggestions);
        input.addEventListener('compositionstart', () => { composing = true; });
        input.addEventListener('compositionend', () => { composing = false; updateSuggestions(); });

        input.addEventListener('blur', () => {
            // Délai pour laisser le mousedown du dropdown passer.
            setTimeout(() => { Dropdown.hide(); Ghost.hideGhost(); }, 120);
        });

        input.addEventListener('click', refreshGhost);
        input.addEventListener('keyup', refreshGhost);
        input.addEventListener('focus', refreshGhost);
        input.addEventListener('scroll', refreshGhost);

        window.addEventListener('resize', () => {
            Ghost.syncGhostStyle(input);
            if (Dropdown.isOpen()) Dropdown.positionFor(input);
            refreshGhost();
        });

        window.addEventListener('scroll', () => {
            if (Dropdown.isOpen()) Dropdown.positionFor(input);
            refreshGhost();
        }, true);

        document.addEventListener('click', (e) => {
            if (e.target === input || e.target.closest('#autocompleteDropdown')) return;
            Dropdown.hide();
            Ghost.hideGhost();
        });
    }

    document.addEventListener('DOMContentLoaded', setup);
})();

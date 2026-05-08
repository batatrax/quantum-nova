/**
 * core/autocomplete/03_dropdown.js
 * UI flottante de la liste de suggestions sous la saisie.
 *
 * Expose un module avec :
 *   - show(input, suggestions)   : affiche le dropdown sous l'input
 *   - hide()                     : ferme le dropdown
 *   - setActive(index)           : surligne la nᵉ suggestion (gère wrap)
 *   - getActiveIndex()           : index courant
 *   - getSuggestions()           : suggestions courantes affichées
 *   - isOpen()                   : booléen visibilité
 *   - onSelect(callback)         : enregistre un handler appelé quand
 *                                  l'utilisateur clique une option
 */

window.QNAutocompleteDropdown = (function () {
    'use strict';

    let dropdown = null;
    let activeIndex = 0;
    let currentSuggestions = [];
    let selectCallback = null;

    function ensure() {
        if (dropdown) return dropdown;
        dropdown = document.createElement('ul');
        dropdown.className = 'autocomplete-dropdown';
        dropdown.id = 'autocompleteDropdown';
        dropdown.setAttribute('role', 'listbox');
        document.body.appendChild(dropdown);

        dropdown.addEventListener('mousedown', (e) => {
            const item = e.target.closest('.autocomplete-item');
            if (!item) return;
            e.preventDefault();   // ne pas perdre le focus de l'input
            const idx = parseInt(item.dataset.idx, 10);
            if (currentSuggestions[idx] && typeof selectCallback === 'function') {
                selectCallback(currentSuggestions[idx]);
            }
        });
        return dropdown;
    }

    function position(input) {
        if (!dropdown) return;
        const r = input.getBoundingClientRect();
        dropdown.style.left = r.left + 'px';
        dropdown.style.top = (r.bottom + 4) + 'px';
        dropdown.style.minWidth = Math.max(220, r.width / 2) + 'px';
    }

    function show(input, suggestions) {
        ensure();
        currentSuggestions = suggestions;
        activeIndex = 0;
        dropdown.replaceChildren();
        if (!suggestions.length) {
            dropdown.style.display = 'none';
            return;
        }
        suggestions.forEach((s, i) => {
            const li = document.createElement('li');
            li.className = 'autocomplete-item' + (i === 0 ? ' active' : '');
            li.dataset.idx = String(i);
            li.setAttribute('role', 'option');

            const name = document.createElement('span');
            name.className = 'autocomplete-name';
            name.textContent = s.name;
            li.appendChild(name);

            const desc = document.createElement('span');
            desc.className = 'autocomplete-desc';
            desc.textContent = s.desc || '';
            li.appendChild(desc);

            dropdown.appendChild(li);
        });
        position(input);
        dropdown.style.display = 'block';
    }

    function hide() {
        if (dropdown) dropdown.style.display = 'none';
        currentSuggestions = [];
        activeIndex = 0;
    }

    function setActive(newIdx) {
        if (!dropdown || !currentSuggestions.length) return;
        const items = dropdown.querySelectorAll('.autocomplete-item');
        items.forEach(it => it.classList.remove('active'));
        activeIndex = (newIdx + currentSuggestions.length) % currentSuggestions.length;
        const it = items[activeIndex];
        if (it) {
            it.classList.add('active');
            it.scrollIntoView({ block: 'nearest' });
        }
    }

    function isOpen() {
        return !!(dropdown && dropdown.style.display === 'block' && currentSuggestions.length);
    }

    return {
        show,
        hide,
        setActive,
        isOpen,
        getActiveIndex: () => activeIndex,
        getSuggestions: () => currentSuggestions,
        getActiveSuggestion: () => currentSuggestions[activeIndex],
        onSelect(cb) { selectCallback = cb; },
        positionFor: position
    };
})();

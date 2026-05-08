/**
 * keyboards/loader.js
 * Reconstruit la grille `.main-grid` à partir d'une définition de clavier.
 * Les fonctions V5 (inserer, executer, effacerEntree…) restent les actions
 * réelles — on régénère juste les boutons selon le mode actif.
 */

(function () {
    'use strict';

    // Mapping mode → définition de clavier (chaque clavier expose son objet
    // sur window via son fichier dédié)
    function getKeyboardForMode(modeId) {
        switch (modeId) {
            // Le mode Graphique réutilise le clavier scientifique : mêmes
            // touches sin/cos/log/MATH▾/chiffres, plus la barre d'outils
            // tracé qui apparaît au-dessus de la barre de saisie.
            case 'graph':      return window.KEYBOARD_GRAPH;
            case 'matrix':  return window.KEYBOARD_MATRIX;
            case 'stats':   return window.KEYBOARD_STATS;
            case 'scientific': return window.KEYBOARD_SCIENTIFIC;
            case 'calc':
            default:        return window.KEYBOARD_CALC;
        }
    }

    /**
     * Suppression du dernier caractère du champ #screen.
     * V5 ne fournit pas de fonction native pour ça — on l'implémente ici.
     */
    function backspace() {
        const input = document.getElementById('screen');
        if (!input) return;
        const v = input.value || '';
        input.value = v.slice(0, -1);
        input.focus();
    }

    /**
     * Réutilise le dernier résultat. Source prioritaire : le handler du
     * mode CALCUL (qui mémorise son propre dernier résultat). Fallback :
     * variable globale V5 dernierResultat ou littéral 'ans'.
     */
    function rappelerAns() {
        const input = document.getElementById('screen');
        if (!input) return;
        let v = null;
        if (window.MODE_HANDLERS && window.MODE_HANDLERS.calc
                && typeof window.MODE_HANDLERS.calc.getLastResult === 'function') {
            v = window.MODE_HANDLERS.calc.getLastResult();
        }
        if (v === null && typeof dernierResultat !== 'undefined' && dernierResultat !== null) {
            v = dernierResultat;
        }
        input.value += (v !== null && v !== undefined) ? String(v) : 'ans';
        input.focus();
    }

    /**
     * Renvoie l'identifiant du mode courant. La classe `mode-<id>` est posée
     * sur <body> par mode-menu.js — on s'en sert comme source de vérité.
     */
    function getCurrentMode() {
        const cls = (document.body && document.body.className) || '';
        const m = cls.match(/\bmode-([a-z]+)\b/);
        return m ? m[1] : 'calc';
    }

    function dispatchAction(action) {
        switch (action) {
            case 'clear':
                if (typeof effacerEntree === 'function') effacerEntree();
                else { const i = document.getElementById('screen'); if (i) i.value = ''; }
                break;
            case 'backspace':
                backspace();
                break;
            case 'evaluate': {
                // Mode TRACÉ : on délègue à executer() V5 (canvas, log).
                // Tous les autres modes (calc, scientifique, matrices, stats)
                // évaluent via le handler calc → résultat dans #calcHistory
                // qui reste visible dans le menu.
                const m = getCurrentMode();
                if (m !== 'graph'
                        && window.MODE_HANDLERS && window.MODE_HANDLERS.calc
                        && typeof window.MODE_HANDLERS.calc.onEvaluate === 'function') {
                    window.MODE_HANDLERS.calc.onEvaluate();
                } else if (typeof executer === 'function') {
                    executer();
                }
                break;
            }
            case 'ans':
                rappelerAns();
                break;
            case 'percent':
                if (typeof inserer === 'function') inserer('/100');
                break;
            case 'open-math':
                // Toggle : un nouveau clic sur MATH ▾ referme le panneau.
                if (typeof window.toggleMath === 'function') window.toggleMath();
                else if (typeof window.ouvrirMath === 'function') window.ouvrirMath();
                break;
            case 'negate': {
                // Inverse le signe de la saisie : si elle commence par "-(...)",
                // on retire l'enrobage ; sinon on l'enrobe avec "-(saisie)".
                const inp = document.getElementById('screen');
                if (!inp) break;
                const v = (inp.value || '').trim();
                if (!v) { inp.value = '-'; inp.focus(); break; }
                if (v.startsWith('-(') && v.endsWith(')')) {
                    inp.value = v.slice(2, -1);
                } else if (v.startsWith('-') && !v.includes('(')) {
                    inp.value = v.slice(1);
                } else {
                    inp.value = `-(${v})`;
                }
                inp.focus();
                break;
            }
            case 'derive':
                wrapAndEval('derivative(', ', x)');
                break;
            case 'simplify':
                wrapAndEval('simplify(', ')');
                break;
            case 'rationalize':
                wrapAndEval('rationalize(', ')');
                break;
            // Actions Matrices : routées vers MODE_HANDLERS.matrix
            case 'matrix-rref':
            case 'matrix-pivot':    callMatrix('onPivot');    break;
            case 'matrix-trans':    callMatrix('onTranspose'); break;
            case 'matrix-trace':    callMatrix('onTrace');    break;
            case 'matrix-det':      callMatrix('onDet');      break;
            case 'matrix-inv':      callMatrix('onInv');      break;
            case 'matrix-add':      callMatrix('onAdd');      break;
            case 'matrix-sub':      callMatrix('onSub');      break;
            case 'matrix-mul':      callMatrix('onMul');      break;
            case 'matrix-solve':    callMatrix('onSolve');    break;
            case 'matrix-define-a': callMatrix('onDefineA');  break;
            case 'matrix-define-b': callMatrix('onDefineB');  break;

            // Actions Stats : à brancher quand le mode sera prêt
            default:
                if (action.startsWith('stats-')) {
                    if (typeof ajouterLog === 'function') {
                        ajouterLog(
                            'Action',
                            `${action} — sera branché à l'étape suivante.`,
                            'var(--text-warn, orange)'
                        );
                    }
                }
        }
    }

    /** Helper : appelle MODE_HANDLERS.matrix.<name>() si présent. */
    function callMatrix(name) {
        const h = window.MODE_HANDLERS && window.MODE_HANDLERS.matrix;
        if (h && typeof h[name] === 'function') h[name]();
    }

    function wrapAndEval(prefix, suffix) {
        const input = document.getElementById('screen');
        if (!input) return;
        const v = (input.value || '').trim();
        if (!v) {
            if (typeof ajouterLog === 'function') {
                ajouterLog('Scientifique', 'Saisis d\'abord une expression dans la barre.', 'var(--text-warn, orange)');
            }
            return;
        }
        input.value = prefix + v + suffix;
        // Évaluation via le handler calc → résultat dans la zone CALCULATRICE
        // visible dans le menu (et pas dans le log V5 masqué).
        if (window.MODE_HANDLERS && window.MODE_HANDLERS.calc
                && typeof window.MODE_HANDLERS.calc.onEvaluate === 'function') {
            window.MODE_HANDLERS.calc.onEvaluate();
        } else if (typeof executer === 'function') {
            executer();
        }
    }

    function buildButton(spec) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `key ${spec.cls || 'key-num'}`;
        btn.textContent = spec.label;
        if (spec.title) { btn.title = spec.title; btn.dataset.titleOriginal = spec.title; }
        if (spec.span && spec.span > 1) btn.style.gridColumn = `span ${spec.span}`;
        if (spec.action) btn.dataset.action = spec.action;

        btn.addEventListener('click', () => {
            if (btn.disabled) return;
            if (spec.insert !== undefined) {
                if (typeof inserer === 'function') inserer(spec.insert);
            } else if (spec.action) {
                dispatchAction(spec.action);
            }
        });

        return btn;
    }

    function loadKeyboard(modeId) {
        const mainGrid = document.querySelector('.main-grid');
        const scrollGrid = document.querySelector('.scrollable-grid');
        if (!mainGrid || !scrollGrid) return;

        const kbd = getKeyboardForMode(modeId);
        if (!kbd) return;

        mainGrid.replaceChildren();
        scrollGrid.replaceChildren();

        // Le mode Matrices ne doit PAS utiliser le swipe row car ses opérations 
        // sont trop liées à la saisie.
        const useSwipe = modeId !== 'matrix' && modeId !== 'stats';
        
        if (!useSwipe) {
            scrollGrid.style.display = 'none';
            mainGrid.style.gridTemplateColumns = `repeat(${kbd.columns || 4}, 1fr)`;
        } else {
            scrollGrid.style.display = 'flex';
            mainGrid.style.gridTemplateColumns = `repeat(5, 1fr)`;
        }

        kbd.keys.forEach(spec => {
            const btn = buildButton(spec);
            
            if (!useSwipe) {
                mainGrid.appendChild(btn);
                return;
            }

            // Logique de dispatch pour les modes Calc/Sci
            const isMain = spec.cls === 'key-num' || 
                           spec.cls === 'key-op' || 
                           spec.cls === 'key-act' || 
                           spec.cls === 'key-clear';

            if (isMain) {
                mainGrid.appendChild(btn);
            } else {
                scrollGrid.appendChild(btn);
            }
        });
    }

    // Exposition globale pour que mode-menu.js puisse appeler loadKeyboard()
    window.loadKeyboard = loadKeyboard;

    // ================================================================
    // Swipe row : drag-to-scroll souris + indicateur "fin atteinte"
    // ================================================================
    function wireSwipeRow() {
        const grid = document.querySelector('.scrollable-grid');
        const wrap = document.getElementById('scrollableWrap');
        if (!grid || !wrap) return;

        // Drag-to-scroll au clic souris (Pointer Events couvre souris/tactile/stylet).
        let dragging = false;
        let startX = 0, startScroll = 0, moved = false;

        grid.addEventListener('pointerdown', e => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            dragging = true;
            moved = false;
            startX = e.clientX;
            startScroll = grid.scrollLeft;
            grid.classList.add('dragging');
            grid.setPointerCapture(e.pointerId);
        });

        grid.addEventListener('pointermove', e => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            if (Math.abs(dx) > 4) moved = true;
            grid.scrollLeft = startScroll - dx;
        });

        function endDrag(e) {
            if (!dragging) return;
            dragging = false;
            grid.classList.remove('dragging');
            try { grid.releasePointerCapture(e.pointerId); } catch (_) {}
        }
        grid.addEventListener('pointerup', endDrag);
        grid.addEventListener('pointercancel', endDrag);
        grid.addEventListener('pointerleave', endDrag);

        // Empêche le clic sur un bouton si l'utilisateur a effectivement glissé
        // (sinon un drag pour scroller déclencherait l'action de la touche).
        grid.addEventListener('click', e => {
            if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; }
        }, true);

        // Indicateur : data-end="true" quand on a fait défiler jusqu'au bout.
        function updateEnd() {
            const end = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 2;
            wrap.dataset.end = end ? 'true' : 'false';
            // On masque aussi quand il n'y a tout simplement pas de débordement.
            if (grid.scrollWidth <= grid.clientWidth + 1) wrap.dataset.end = 'true';
        }
        grid.addEventListener('scroll', updateEnd);
        window.addEventListener('resize', updateEnd);
        new MutationObserver(updateEnd).observe(grid, { childList: true });
        updateEnd();
    }

    // Au DOMContentLoaded : on charge le clavier par défaut (calcul standard)
    document.addEventListener('DOMContentLoaded', () => {
        loadKeyboard('calc');
        wireSwipeRow();
    });
})();

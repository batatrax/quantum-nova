/**
 * core/panel.js
 * Tout-en-un : panneau d'aide intégré à droite (auparavant servi par
 * panel.html embarqué en iframe séparée). Ce module reprend le routage
 * de panel.html et le branche en interne.
 *
 * Trois sources de messages :
 *   - BroadcastChannel('quantum-nova')   (compat avec panel.html externe
 *     et avec les modules existants qui émettent déjà via BC)
 *   - CustomEvent 'qn-bus' sur window    (intra-fenêtre fiable, indispensable
 *     dans certains contextes sandboxés style Google Sites où BC est limité)
 *
 * Un même message peut être reçu par les deux canaux ; on dédoublonne
 * naturellement parce que showSection / showExportView sont idempotentes.
 */

(function () {
    'use strict';

    function root() { return document.getElementById('panelContent'); }
    function panel() { return document.getElementById('qnPanel'); }
    function title() { return document.getElementById('qnPanelTitle'); }

    // ===========================================================
    // Aide (sections)
    // ===========================================================
    function parseFragment(html) {
        const range = document.createRange();
        return range.createContextualFragment(html);
    }

    function showSection(id) {
        const reg = window.QNHelp || {};
        const sec = reg[id];
        const r = root();
        if (!r) return;
        if (!sec) {
            r.replaceChildren(parseFragment('<p>Section introuvable.</p>'));
            return;
        }
        r.replaceChildren();
        r.appendChild(parseFragment(sec.html));
        r.scrollTop = 0;
        if (title()) title().textContent = sec.title || 'Aide';
        openPanel();
    }

    // ===========================================================
    // Ouvrir / fermer le panneau
    // ===========================================================
    function openPanel() { document.body.classList.remove('qn-panel-collapsed'); }
    function closePanel() { document.body.classList.add('qn-panel-collapsed'); }
    function togglePanel() { document.body.classList.toggle('qn-panel-collapsed'); }

    // ===========================================================
    // Vue EXPORT (portée depuis panel.html)
    // ===========================================================
    function showExportView(data) {
        const content = root();
        if (!content) return;
        content.replaceChildren();
        if (title()) title().textContent = 'Export';

        const h2 = document.createElement('h2');
        h2.textContent = 'Export';
        content.appendChild(h2);

        const sectContent = section('Que veux-tu exporter ?');
        const cbHistory = checkbox('opt-history', 'Historique des calculs', !!(data.history && data.history.length));
        const cbExpr    = checkbox('opt-expr',    'Saisie courante',         !!data.expression);
        const cbCanvas  = checkbox('opt-canvas',  'Graphique',               !!data.canvasPng);
        sectContent.appendChild(cbHistory);
        sectContent.appendChild(cbExpr);
        sectContent.appendChild(cbCanvas);
        content.appendChild(sectContent);

        const sectFormat = section('Format');
        sectFormat.appendChild(radio('export-fmt', 'fmt-txt',   'Texte (.txt)',                 'txt',   true));
        sectFormat.appendChild(radio('export-fmt', 'fmt-png',   'Image PNG',                    'png',   false));
        sectFormat.appendChild(radio('export-fmt', 'fmt-print', 'PDF (impression navigateur)',  'print', false));
        content.appendChild(sectFormat);

        const actions = document.createElement('div');
        actions.className = 'export-actions';
        const dl = document.createElement('button');
        dl.type = 'button';
        dl.className = 'export-download';
        dl.textContent = '⤓  Télécharger';
        dl.addEventListener('click', () => doDownload(data, gatherChoices(content)));
        actions.appendChild(dl);
        content.appendChild(actions);

        const sectPreview = section('Aperçu avant export');
        const previewBox = document.createElement('div');
        previewBox.className = 'export-preview';
        previewBox.id = 'exportPreview';
        sectPreview.appendChild(previewBox);
        content.appendChild(sectPreview);

        content.addEventListener('change', () => renderPreview(data, gatherChoices(content)));
        renderPreview(data, gatherChoices(content));
        openPanel();
    }

    function section(legend) {
        const s = document.createElement('section');
        s.className = 'export-section';
        const l = document.createElement('div');
        l.className = 'export-legend';
        l.textContent = legend;
        s.appendChild(l);
        return s;
    }
    function checkbox(id, label, checked) {
        const lbl = document.createElement('label');
        lbl.className = 'export-option';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = id; cb.checked = !!checked; cb.disabled = !checked;
        lbl.appendChild(cb);
        lbl.appendChild(document.createTextNode(' ' + label));
        return lbl;
    }
    function radio(name, id, label, value, checked) {
        const lbl = document.createElement('label');
        lbl.className = 'export-option';
        const r = document.createElement('input');
        r.type = 'radio'; r.name = name; r.id = id; r.value = value; r.checked = !!checked;
        lbl.appendChild(r);
        lbl.appendChild(document.createTextNode(' ' + label));
        return lbl;
    }
    function gatherChoices(rootEl) {
        return {
            history: !!(rootEl.querySelector('#opt-history') && rootEl.querySelector('#opt-history').checked),
            expr:    !!(rootEl.querySelector('#opt-expr')    && rootEl.querySelector('#opt-expr').checked),
            canvas:  !!(rootEl.querySelector('#opt-canvas')  && rootEl.querySelector('#opt-canvas').checked),
            format:  (rootEl.querySelector('input[name="export-fmt"]:checked') || {}).value || 'txt'
        };
    }
    function buildTextContent(data, choices) {
        const lines = [];
        lines.push('QUANTUM-NOVA — export');
        lines.push('Date : ' + new Date(data.ts).toLocaleString());
        lines.push('Mode : ' + (data.mode || 'calc'));
        lines.push('');
        if (choices.expr && data.expression) {
            lines.push('— Saisie courante —');
            lines.push(data.expression);
            lines.push('');
        }
        if (choices.history && data.history && data.history.length) {
            lines.push('— Historique des calculs —');
            data.history.forEach(h => {
                const sep = h.isError ? ' ⚠ ' : ' = ';
                lines.push(h.expression + sep + h.result);
            });
            lines.push('');
        }
        if (choices.canvas && data.canvasPng) {
            lines.push('— Graphique —');
            lines.push('(image PNG attachée séparément)');
            lines.push('');
        }
        return lines.join('\n');
    }
    function renderPreview(data, choices) {
        const box = document.getElementById('exportPreview');
        if (!box) return;
        box.replaceChildren();
        if (choices.format === 'png' && choices.canvas && data.canvasPng) {
            const img = document.createElement('img');
            img.src = data.canvasPng; img.alt = 'Aperçu graphique';
            box.appendChild(img);
            return;
        }
        const pre = document.createElement('pre');
        pre.className = 'export-preview-text';
        pre.textContent = buildTextContent(data, choices);
        box.appendChild(pre);
        if (choices.canvas && data.canvasPng) {
            const img = document.createElement('img');
            img.src = data.canvasPng; img.alt = 'Aperçu graphique';
            box.appendChild(img);
        }
    }
    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a);
        a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    function buildPrintIframe(data, choices) {
        const safeText = buildTextContent(data, choices);
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
        iframe.srcdoc = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QUANTUM-NOVA Export</title>' +
            '<style>body{font-family:Georgia,serif;padding:30px;color:#000;}pre{font-family:monospace;white-space:pre-wrap;}img{max-width:100%;margin-top:16px;}</style>' +
            '</head><body></body></html>';
        iframe.onload = () => {
            const doc = iframe.contentDocument; if (!doc) return;
            const body = doc.body;
            const h1 = doc.createElement('h1'); h1.textContent = 'QUANTUM-NOVA — export';
            body.appendChild(h1);
            const pre = doc.createElement('pre'); pre.textContent = safeText;
            body.appendChild(pre);
            if (choices.canvas && data.canvasPng) {
                const img = doc.createElement('img'); img.src = data.canvasPng;
                body.appendChild(img);
            }
            setTimeout(() => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
                setTimeout(() => iframe.remove(), 1500);
            }, 200);
        };
        document.body.appendChild(iframe);
    }
    function doDownload(data, choices) {
        const stamp = new Date(data.ts).toISOString().replace(/[:.]/g, '-').slice(0, 19);
        if (choices.format === 'png') {
            if (!data.canvasPng) { alert('Aucun graphique disponible.'); return; }
            fetch(data.canvasPng).then(r => r.blob())
                .then(b => downloadBlob(b, 'quantum-nova-' + stamp + '.png'));
            return;
        }
        if (choices.format === 'print') { buildPrintIframe(data, choices); return; }
        const blob = new Blob([buildTextContent(data, choices)], { type: 'text/plain;charset=utf-8' });
        downloadBlob(blob, 'quantum-nova-' + stamp + '.txt');
    }

    // ===========================================================
    // Routeur de messages
    // ===========================================================
    function handle(msg) {
        if (!msg) return;
        switch (msg.type) {
            case 'show-help':
                if (msg.section) showSection(msg.section);
                break;
            case 'show-export':
                if (msg.data) showExportView(msg.data);
                break;
            case 'theme-change':
                if (msg.theme) document.documentElement.setAttribute('data-theme', msg.theme);
                break;
            case 'matrix-show':
                // Le mode matrice prend la main sur le panneau : titre + ouverture.
                if (title()) title().textContent = 'Matrices';
                openPanel();
                // Le rendu réel est fait par 05_panel_matrix.js qui écoute aussi.
                break;
        }
    }

    // BroadcastChannel (compat panel.html externe)
    try {
        const chan = new BroadcastChannel('quantum-nova');
        chan.addEventListener('message', ev => handle(ev.data || {}));
    } catch (e) { /* navigateur sans BC */ }

    // CustomEvent intra-fenêtre (toujours fiable, même quand BC est sandboxé)
    window.addEventListener('qn-bus', ev => handle(ev.detail || {}));

    // ===========================================================
    // Boutons / init
    // ===========================================================
    function init() {
        const btn = document.getElementById('qnPanelClose');
        if (btn) btn.addEventListener('click', closePanel);
        // Section par défaut
        showSection('start');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // API publique — utilisable directement par les autres modules pour
    // éviter les aller-retours BC quand ils savent qu'ils sont en local.
    window.QNPanel = {
        showSection, showExportView, openPanel, closePanel, togglePanel
    };

    // Helper global : émet sur les deux canaux. Les autres modules peuvent
    // l'utiliser à la place de leur propre BroadcastChannel pour s'assurer
    // que le message est aussi reçu par le panneau intégré.
    window.QNBus = {
        emit(msg) {
            try { window.dispatchEvent(new CustomEvent('qn-bus', { detail: msg })); } catch (e) {}
            try {
                if (!window._qnEmitChan) window._qnEmitChan = new BroadcastChannel('quantum-nova');
                window._qnEmitChan.postMessage(msg);
            } catch (e) {}
        }
    };
})();

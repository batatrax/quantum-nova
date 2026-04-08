// =============================================================================
// QUANTUM-NOVA v5 — ui.js
// Gestion de l'Interface Utilisateur
// =============================================================================
//
//  ╔═══════════════════════════════════════════════════════════════════════╗
//  ║                  COUCHE PRÉSENTATION (DOM APPLICATIF)                 ║
//  ║                                                                       ║
//  ║   Ce fichier ne contient AUCUNE logique mathématique ni AUCUN calcul  ║
//  ║   sur le canevas. Sa seule responsabilité est de manipuler le DOM     ║
//  ║   applicatif (modales, log, légende, boutons, sélecteurs) en réponse  ║
//  ║   à des appels venant soit de l'utilisateur (via onclick inline dans  ║
//  ║   index.html), soit de engine.js (via les fonctions exposées          ║
//  ║   globalement comme refreshKeyboardProfileUI()).                      ║
//  ║                                                                       ║
//  ║   Frontière stricte avec engine.js :                                  ║
//  ║     - ui.js LIT     : fonctionsAffichees, themes, currentThemeIndex,  ║
//  ║                       KEYBOARD_PROFILES, currentKeyboardProfile       ║
//  ║     - ui.js APPELLE : dessiner(), supprimerFonction()                 ║
//  ║     - ui.js NE TOUCHE JAMAIS À : scope, view, ast, canvas, ctx        ║
//  ╚═══════════════════════════════════════════════════════════════════════╝
//
// Ce fichier gère tout ce qui est visible mais non mathématique :
//
//  [1] LOG & STATUT
//      ajouterLog()  → Ajoute une ligne dans l'historique visuel sur l'écran
//      setStatus()   → Met à jour la LED et le texte de statut (barre supérieure)
//
//  [2] SAISIE ASSISTÉE
//      inserer()                → Insère du texte au curseur dans le champ
//      insererDepuisCatalogue() → Insertion + fermeture de modale
//      effacerEntree()          → Vide le champ de saisie
//
//  [3] LÉGENDE DES FONCTIONS
//      updateLegende() → Reconstruit le panneau de légende sous le canvas
//                        Affiche nom, couleur, expression, bouton supprimer
//
//  [4] GESTION DES THÈMES
//      changerTheme() → Cycle à travers les 4 thèmes disponibles
//
//  [5] MODALES (Documentation & Catalogue)
//      ouvrirModal()   → Ouvre la modal ciblée avec animation
//      fermerModal()   → Ferme avec animation + retour focus
//      changerOnglet() → Gestion des onglets du modal documentation
//
//  [6] SYSTÈME DE PROFILS CLAVIER (couche présentation uniquement)
//      refreshKeyboardProfileUI() → Synchronise le label du bouton ⌨ KBD
//                                    de la barre système et les options du
//                                    <select> de l'onglet "Clavier physique"
//                                    avec l'état actuel de currentKeyboardProfile.
//                                    Appelée par engine.js après tout changement
//                                    de profil (loadKeyboardProfile, setKeyboardProfile).
//
//      La logique métier des profils (mapping des touches, persistance, auto-
//      détection) vit entièrement dans engine.js. ui.js ne fait QUE de
//      l'affichage passif et la délégation onchange/onclick.
//
// =============================================================================

// =============================================================================
// [1] LOG & STATUT
// =============================================================================
//
// L'historique est désormais hébergé dans .log-module (bloc séparé sous le
// graphe), et non plus en overlay sur le canvas. La fonction ci-dessous met
// donc à jour deux choses : le contenu du log ET le badge compteur affiché
// dans le header du module (pour que l'utilisateur sache s'il a des entrées
// non lues quand le panneau est replié).
// -----------------------------------------------------------------------------
function ajouterLog(requete, reponse, couleur = 'var(--text-success)') {
    const log = document.getElementById('historyLog');
    if (!log) return;

    // Échappement HTML pour éviter les failles XSS
    const esc  = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    const ligne = document.createElement('div');
    ligne.className = 'log-entry';
    ligne.innerHTML =
        `<span class="log-prompt">❯ ${esc(requete)}</span>` +
        `<span class="log-result" style="color:${couleur}">${esc(reponse)}</span>`;

    log.appendChild(ligne);
    log.scrollTop = log.scrollHeight; // Auto-scroll

    // Met à jour le badge compteur du header repliable
    updateLogCount();
}

/**
 * Synchronise le badge #logCount avec le nombre d'entrées dans le log.
 * Appelée automatiquement par ajouterLog() après chaque insertion.
 * Si le bloc log-module ou le compteur n'existent pas, la fonction ne
 * fait rien (garde-fou pour rester compatible avec d'éventuels stripped
 * builds qui n'auraient pas le panneau historique).
 */
function updateLogCount() {
    const log    = document.getElementById('historyLog');
    const badge  = document.getElementById('logCount');
    if (!log || !badge) return;
    badge.textContent = log.querySelectorAll('.log-entry').length;
}

function setStatus(msg, color) {
    const led  = document.getElementById('led');
    const text = document.getElementById('statusText');
    if (!led || !text) return;
    text.textContent           = msg;
    led.style.backgroundColor  = color;
    led.style.boxShadow        = `0 0 8px ${color}`;
}

// =============================================================================
// [2] SAISIE ASSISTÉE
// =============================================================================
function inserer(texte) {
    const input = document.getElementById('screen');
    if (!input) return;
    const pos   = input.selectionStart;
    const val   = input.value;
    input.value = val.slice(0, pos) + texte + val.slice(pos);
    input.setSelectionRange(pos + texte.length, pos + texte.length);
    input.focus();
}

function insererDepuisCatalogue(texte, modalId) {
    fermerModal(modalId);
    inserer(texte);
}

function effacerEntree() {
    const input = document.getElementById('screen');
    if (input) { input.value = ''; input.focus(); }
}

// =============================================================================
// [3] LÉGENDE DES FONCTIONS
// =============================================================================
function updateLegende() {
    const legend = document.getElementById('functionLegend');
    const empty  = document.getElementById('legendEmpty');
    if (!legend) return;

    legend.querySelectorAll('.legend-item').forEach(el => el.remove());

    if (!fonctionsAffichees || fonctionsAffichees.length === 0) {
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';

    fonctionsAffichees.forEach((fn, index) => {
        const match      = fn.cssColor.match(/var\(([^)]+)\)/);
        const cssVarName = match ? match[1] : '--curve-1';
        const couleur    = getComputedStyle(document.documentElement).getPropertyValue(cssVarName).trim();

        const signature = fn.implicit ? '(x,y)' : '(x)';
        const prefix    = fn.implicit ? '' : '= ';
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML =
            `<span class="legend-dot" style="background:${couleur};box-shadow:0 0 6px ${couleur}"></span>` +
            `<span class="legend-name" style="color:${couleur}">${fn.nom}${signature}</span>` +
            `<span class="legend-expr">${prefix}${fn.brute}</span>` +
            `<button class="legend-remove" onclick="supprimerFonction(${index})" title="Retirer cette courbe">×</button>`;

        legend.appendChild(item);
    });
}

// =============================================================================
// [4] GESTION DES THÈMES
// =============================================================================
//
// Architecture parallèle à celle du système de profils clavier :
//
//   setTheme(id)      → Applique un thème précis, persiste dans localStorage,
//                       notifie l'UI et redessine le canvas.
//   cycleTheme()      → Passe au thème suivant (utilisé par le bouton rapide
//                       ou pour la rétrocompatibilité avec l'ancien appel).
//   changerTheme()    → Alias de cycleTheme() conservé pour la compatibilité
//                       avec tout ancien appel inline HTML.
//   loadTheme()       → Chargé au démarrage depuis ui.js via DOMContentLoaded
//                       si une valeur existe dans localStorage.
//   refreshThemeUI()  → Synchronise le <select id="themeSelect"> avec
//                       currentThemeIndex. Appelée après tout changement.
//
// La constante themes (['cyber', 'light', 'phosphor', 'plasma']) et la
// variable currentThemeIndex vivent dans engine.js (état global partagé).
// ui.js ne fait QUE la couche présentation.
// -----------------------------------------------------------------------------

// Libellés affichés dans le <select> et dans le log pour chaque thème.
// L'emoji tête sert de repère visuel rapide dans le menu déroulant.
const themeLabels = {
    cyber:    '🌑 Cyber Dark — Tokyo Night',
    light:    '☀️ E-Ink Light — Haute lisibilité',
    phosphor: '📟 Phosphor Matrix — Terminal rétro',
    plasma:   '🌈 Neon Plasma — Cyberpunk fusion'
};

/**
 * Applique un thème par son identifiant, persiste le choix et redessine.
 *
 * @param {string} id  Identifiant du thème : 'cyber', 'light', 'phosphor', 'plasma'
 * @param {boolean} silent  Si vrai, ne logge rien dans l'historique
 */
function setTheme(id, silent = false) {
    const idx = themes.indexOf(id);
    if (idx === -1) {
        ajouterLog('⚠ Thème', `"${id}" inconnu — ignoré`, 'var(--text-error)');
        return;
    }

    currentThemeIndex = idx;
    document.documentElement.setAttribute('data-theme', id);

    // Persistance dans localStorage (try/catch pour survivre aux modes privés).
    try {
        localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch (e) {
        // Ignoré volontairement : mode privé strict ou quota dépassé.
    }

    // Le canvas utilise getCSSVar() qui lit les CSS variables du thème actif,
    // donc il faut redessiner pour que les couleurs de fond/grille/axes/courbes
    // soient mises à jour immédiatement.
    if (typeof dessiner === 'function') dessiner();
    updateLegende();
    refreshThemeUI();

    if (!silent) {
        ajouterLog('Thème', `→ ${themeLabels[id] || id}`, 'var(--text-neon)');
    }

    const input = document.getElementById('screen');
    if (input) input.focus();
}

/**
 * Passe au thème suivant dans l'ordre du tableau `themes`.
 * Utilisé pour les appels legacy et comme raccourci rapide.
 */
function cycleTheme() {
    const nextIdx = (currentThemeIndex + 1) % themes.length;
    setTheme(themes[nextIdx]);
}

/**
 * Alias rétrocompatible : ancien nom de la fonction de cycle.
 * Conservé pour éviter de casser tout appel inline dans d'autres
 * versions de index.html ou docs.html.
 */
function changerTheme() {
    cycleTheme();
}

/**
 * Charge le thème persisté depuis localStorage, ou conserve le défaut
 * (défini dans engine.js via currentThemeIndex = 1, soit 'light').
 * Appelée une fois au démarrage depuis le DOMContentLoaded d'ui.js.
 */
function loadTheme() {
    let stored = null;
    try {
        stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch (e) {
        // Idem : silencieux si localStorage indisponible
    }

    if (stored && themes.indexOf(stored) !== -1) {
        // Applique le thème persisté en mode silencieux pour éviter de polluer
        // le log de démarrage avec un message "Thème → …" redondant.
        setTheme(stored, true);
    } else {
        // Pas de valeur persistée : on se contente de synchroniser l'UI
        // avec l'état par défaut (light, déjà appliqué via data-theme="light"
        // dans le HTML statique de index.html).
        refreshThemeUI();
    }
}

/**
 * Synchronise le <select id="themeSelect"> avec currentThemeIndex.
 * Régénère les options à chaque appel (DRY, liste courte donc perf OK).
 */
function refreshThemeUI() {
    const select = document.getElementById('themeSelect');
    if (!select) return;

    const activeId = themes[currentThemeIndex];

    // Régénération des options du <select>
    select.innerHTML = '';
    themes.forEach(id => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = themeLabels[id] || id;
        if (id === activeId) opt.selected = true;
        select.appendChild(opt);
    });
}

// =============================================================================
// [5] MODALES (Documentation & Catalogue)
// =============================================================================
function ouvrirModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => { modal.style.opacity = '1'; });
    });
}

function fermerModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.display = 'none';
        const input = document.getElementById('screen');
        if (input) input.focus();
    }, 300);
}

function changerOnglet(index, btnEl) {
    document.querySelectorAll('.tab-panel').forEach(p  => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b    => b.classList.remove('active'));
    const panel = document.getElementById(`tab${index}`);
    if (panel)  panel.classList.add('active');
    if (btnEl) btnEl.classList.add('active');
}

// =============================================================================
// [6] SYSTÈME DE PROFILS CLAVIER — Couche présentation
// =============================================================================
//
// Cette fonction est appelée par engine.js après tout changement de profil
// (au démarrage par loadKeyboardProfile(), ou à chaud par setKeyboardProfile()
// et cycleKeyboardProfile()). Son rôle est purement passif : refléter
// visuellement l'état de currentKeyboardProfile dans deux endroits :
//
//   1. Le libellé et le tooltip du bouton ⌨ KBD de la barre système
//      (clavier visible sur l'écran principal)
//
//   2. Les options du <select id="kbdProfileSelect"> situé dans l'onglet
//      "⌨ Clavier physique" du modal documentation, ainsi que la zone de
//      description #kbdProfileDescription qui explique le profil actif.
//
// Si le modal n'a jamais été ouvert, le <select> existe quand même dans le
// DOM (il est dans le HTML statique d'index.html), donc on peut le manipuler
// sans condition. On régénère les <option> à chaque appel pour rester DRY.
// -----------------------------------------------------------------------------
function refreshKeyboardProfileUI() {
    // Garde-fou : engine.js définit KEYBOARD_PROFILES, mais si pour une
    // raison quelconque cette fonction est appelée trop tôt (avant le
    // chargement d'engine.js), on sort silencieusement.
    if (typeof KEYBOARD_PROFILES === 'undefined') return;
    if (typeof currentKeyboardProfile === 'undefined') return;

    const profile = KEYBOARD_PROFILES[currentKeyboardProfile];
    if (!profile) return;

    // ── 1. Mise à jour du bouton ⌨ KBD de la barre système ─────────────────
    const btn = document.getElementById('kbdProfileBtn');
    if (btn) {
        btn.textContent = `${profile.flag} ${profile.id.toUpperCase()}`;
        btn.title = `Profil clavier actif : ${profile.name}\n\n${profile.description}\n\nClic = profil suivant. Pour un choix précis, ouvrir 📖 DOC > onglet Clavier physique.`;
    }

    // ── 2. Mise à jour du <select> de l'onglet Clavier du modal ────────────
    const select = document.getElementById('kbdProfileSelect');
    if (select) {
        // Régénération des options. On ne reconstruit que si le contenu a
        // changé, pour éviter de provoquer un repaint inutile à chaque
        // appel — mais ici la liste est très courte (3 entrées) donc on
        // peut se permettre une régénération systématique sans souci de perf.
        select.innerHTML = '';
        Object.values(KEYBOARD_PROFILES).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.flag}  ${p.name}`;
            if (p.id === currentKeyboardProfile) opt.selected = true;
            select.appendChild(opt);
        });
    }

    // ── 3. Mise à jour de la zone de description du profil actif ───────────
    const desc = document.getElementById('kbdProfileDescription');
    if (desc) {
        desc.innerHTML =
            `<strong>${profile.flag} ${profile.name}</strong><br>` +
            `${profile.description}`;
    }
}

// =============================================================================
// [7] PANNEAU LOG REPLIABLE & MODE WIDGET POPUP (v4.1+)
// =============================================================================
//
// Ce bloc gère deux fonctionnalités introduites dans la refonte ergonomique :
//
//   1. Panneau historique repliable
//      Le log a été extrait du canvas et placé dans .log-module sous le
//      graphe. Il est REPLIÉ par défaut (classe CSS .collapsed) pour
//      maximiser la visibilité du graphe au démarrage. L'utilisateur peut
//      le déplier en cliquant sur le header. L'état (replié ou déplié) est
//      persisté dans localStorage["qn:logCollapsed"].
//
//   2. Mode widget popup
//      openAsPopup() ouvre l'application dans une fenêtre détachée façon
//      widget de bureau (~420×780 px, sans scrollbars). Le paramètre URL
//      ?widget=1 est ajouté pour que l'instance popup détecte qu'elle est
//      en mode widget et masque les éléments superflus (brand-header).
//
//      Limitation honnête : depuis Chrome 90+, les features menubar/toolbar/
//      location ne sont plus respectées par la majorité des navigateurs pour
//      des raisons de sécurité. On obtient toujours une mini barre d'URL.
//      Pour un vrai mode "sans chrome" complet, il faudrait empaqueter
//      l'application en PWA installable (manifest.webmanifest + service worker).
// -----------------------------------------------------------------------------

const LOG_COLLAPSED_STORAGE_KEY = 'qn:logCollapsed';

/**
 * Bascule l'état replié/déplié du panneau historique et persiste le choix.
 * Appelée par le clic sur .log-header (handler inline dans index.html).
 */
function toggleLog() {
    const mod = document.getElementById('logModule');
    const hdr = document.getElementById('logHeader');
    if (!mod) return;

    const isCollapsed = mod.classList.toggle('collapsed');
    if (hdr) hdr.setAttribute('aria-expanded', String(!isCollapsed));

    try {
        localStorage.setItem(LOG_COLLAPSED_STORAGE_KEY, isCollapsed ? '1' : '0');
    } catch (e) { /* localStorage indisponible : silencieux */ }

    // Si le panneau vient d'être déplié, scrolle automatiquement vers le bas
    // pour afficher la dernière entrée (la plus récente).
    if (!isCollapsed) {
        const log = document.getElementById('historyLog');
        if (log) log.scrollTop = log.scrollHeight;
    }
}

/**
 * Charge l'état du panneau historique au démarrage.
 *   - Si "qn:logCollapsed" === "0" → déplié
 *   - Sinon (défaut ou "1") → replié
 * Le défaut REPLIÉ est volontaire : on veut maximiser la visibilité du
 * graphe au premier chargement, l'utilisateur dépliera s'il en a besoin.
 */
function loadLogState() {
    const mod = document.getElementById('logModule');
    const hdr = document.getElementById('logHeader');
    if (!mod) return;

    let stored = null;
    try {
        stored = localStorage.getItem(LOG_COLLAPSED_STORAGE_KEY);
    } catch (e) { /* idem : silencieux */ }

    // collapsed est l'état par défaut (déjà appliqué dans le HTML statique)
    // donc on n'agit que si l'utilisateur a explicitement choisi déplié.
    if (stored === '0') {
        mod.classList.remove('collapsed');
        if (hdr) hdr.setAttribute('aria-expanded', 'true');
    } else {
        mod.classList.add('collapsed');
        if (hdr) hdr.setAttribute('aria-expanded', 'false');
    }
}

/**
 * Ouvre l'application dans une fenêtre popup détachée façon widget de bureau.
 * Doit être appelée DEPUIS un événement utilisateur direct (click) sinon les
 * navigateurs bloquent l'ouverture.
 *
 * Si window.open() retourne null, c'est que le popup-blocker a bloqué la
 * fenêtre. On informe l'utilisateur via le log plutôt que d'échouer en silence.
 */
function openAsPopup() {
    const w = 420;
    const h = 780;
    // Centrage approximatif sur l'écran principal
    const left = Math.max(0, Math.round((screen.width  - w) / 2));
    const top  = Math.max(0, Math.round((screen.height - h) / 2));

    // Note : "menubar=no, toolbar=no, location=no" sont volontairement listés
    // bien qu'ils soient ignorés par Chrome moderne. Firefox et Safari les
    // respectent encore partiellement, donc autant les indiquer.
    const features = [
        'popup=yes',
        `width=${w}`,
        `height=${h}`,
        `left=${left}`,
        `top=${top}`,
        'resizable=yes',
        'scrollbars=no',
        'menubar=no',
        'toolbar=no',
        'location=no',
        'status=no'
    ].join(',');

    // On ajoute ?widget=1 à l'URL pour que l'instance popup détecte qu'elle
    // est en mode widget et adapte son layout via la classe body.widget-mode.
    const url = location.pathname + '?widget=1';
    const popup = window.open(url, 'quantum-nova-widget', features);

    if (!popup) {
        ajouterLog(
            '⚠ Popup',
            'Bloqué par le navigateur — autorisez les popups pour ce site dans les paramètres',
            'var(--text-error)'
        );
    } else {
        ajouterLog('📌 Widget', 'Fenêtre détachée ouverte', 'var(--text-neon)');
        try { popup.focus(); } catch (e) { /* certains navigateurs interdisent focus cross-window */ }
    }
}

/**
 * Détecte si l'instance courante est ouverte en mode widget (URL ?widget=1)
 * et, si oui, ajoute la classe body.widget-mode pour adapter le layout via
 * les règles CSS dédiées.
 *
 * Appelée une seule fois au DOMContentLoaded.
 */
function detectWidgetMode() {
    try {
        const params = new URLSearchParams(location.search);
        if (params.get('widget') === '1') {
            document.body.classList.add('widget-mode');
        }
    } catch (e) {
        // URLSearchParams indisponible (navigateur très ancien) : on ignore.
    }
}

// =============================================================================
// [8] RETOUR HAPTIQUE — Délégation vers engine.js (v4.2+)
// =============================================================================
//
// La logique haptique principale (navigator.vibrate, persistance qn:vibrate,
// toggle via commande `vibrate on|off`) vit désormais dans engine.js sous
// le nom hapticTap(). Cette section d'ui.js se contente d'installer la
// délégation globale d'événement sur .key dans le DOMContentLoaded plus bas
// — voir addEventListener('pointerdown', ...) qui appelle hapticTap().
//
// Un ancien nom hapticTick() existait ici précédemment et a été supprimé
// pour éviter la confusion entre deux systèmes concurrents.
// -----------------------------------------------------------------------------

// =============================================================================
// [9] OMBRAGE D'INTÉGRALE — Interface interactive prompt() (v4.2+)
// =============================================================================
//
// Interface guidée pour activer l'ombrage d'intégrale sur une fonction sans
// avoir à connaître la syntaxe de la commande texte. Basée sur window.prompt()
// pour rester universellement compatible sans complexifier le DOM avec une
// modale custom.
//
// Cas limites gérés :
//   - Aucune fonction définie → message d'erreur explicite
//   - Une seule fonction      → sélection automatique, saute le prompt de nom
//   - Plusieurs fonctions     → prompt de sélection par nom
//   - Bornes invalides        → message d'erreur, pas d'application
//   - Annulation (Escape)     → abandon silencieux, aucun log
// -----------------------------------------------------------------------------
function promptShade() {
    if (typeof fonctionsAffichees === 'undefined' || fonctionsAffichees.length === 0) {
        ajouterLog('∫ Ombrage', 'Aucune fonction à ombrer — définissez d\'abord f(x)=...', 'var(--text-error)');
        return;
    }

    // ── Sélection de la fonction cible ──────────────────────────────────────
    let nomCible;
    if (fonctionsAffichees.length === 1) {
        nomCible = fonctionsAffichees[0].nom;
    } else {
        const liste = fonctionsAffichees.map(f => f.nom).join(', ');
        const saisie = prompt(
            `Quelle fonction ombrer ?\n\nFonctions disponibles : ${liste}`,
            fonctionsAffichees[0].nom
        );
        if (saisie === null) return; // annulation utilisateur
        nomCible = saisie.trim();
        if (!fonctionsAffichees.find(f => f.nom === nomCible)) {
            ajouterLog('∫ Ombrage', `Fonction "${nomCible}" introuvable`, 'var(--text-error)');
            return;
        }
    }

    // ── Saisie de la borne inférieure ───────────────────────────────────────
    const rawA = prompt(`Borne inférieure (a) pour ${nomCible}(x) :`, '0');
    if (rawA === null) return;
    const a = parseFloat(rawA);
    if (!isFinite(a)) {
        ajouterLog('∫ Ombrage', `Borne inférieure invalide : "${rawA}"`, 'var(--text-error)');
        return;
    }

    // ── Saisie de la borne supérieure ───────────────────────────────────────
    const rawB = prompt(`Borne supérieure (b) pour ${nomCible}(x) :`, String(a + 5));
    if (rawB === null) return;
    const b = parseFloat(rawB);
    if (!isFinite(b)) {
        ajouterLog('∫ Ombrage', `Borne supérieure invalide : "${rawB}"`, 'var(--text-error)');
        return;
    }

    // ── Application de l'ombrage ────────────────────────────────────────────
    const fn = fonctionsAffichees.find(f => f.nom === nomCible);
    fn.shade = { from: a, to: b };
    if (typeof dessiner === 'function') dessiner();
    ajouterLog('∫ Ombrage', `${nomCible}(x) ombrée sur [${a}, ${b}]`, 'var(--text-neon)');
}

// =============================================================================
// ÉVÉNEMENTS AUTOMATIQUES
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Détection du mode widget (?widget=1) — DOIT être fait en tout premier
    // pour que la classe body.widget-mode soit appliquée avant le premier
    // paint, évitant un flash visuel "mode normal → mode widget".
    detectWidgetMode();

    // Fermeture des modales en cliquant sur l'overlay sombre
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', e => {
            if (e.target === modal) fermerModal(modal.id);
        });
    });

    // Chargement du thème persisté (ou défaut 'light' si aucun).
    // Doit être appelé APRÈS que le DOM soit prêt pour que refreshThemeUI()
    // puisse trouver le <select id="themeSelect">.
    if (typeof loadTheme === 'function') loadTheme();

    // Charge l'état du panneau historique (replié ou déplié) depuis localStorage.
    // Le défaut est REPLIÉ pour maximiser la visibilité du graphe.
    if (typeof loadLogState === 'function') loadLogState();

    // Délégation globale pour le retour haptique : on écoute en capture
    // au niveau du document et on filtre sur les éléments .key (tous les
    // boutons du clavier visuel). Une seule référence d'événement suffit
    // pour 60+ boutons — plus propre qu'attacher un handler à chacun.
    // On utilise pointerdown plutôt que click pour avoir un retour immédiat
    // à l'enfoncement plutôt qu'au relâchement.
    document.addEventListener('pointerdown', e => {
        const target = e.target;
        if (target && target.classList && target.classList.contains('key')) {
            if (typeof hapticTap === 'function') hapticTap();
        }
    }, true);

    const canvas = document.getElementById('mathCanvas');
    if (canvas) {
        canvas.addEventListener('click', () => {
            const input = document.getElementById('screen');
            if (input) input.focus();
        });
    }
});

// =============================================================================
// QUANTUM-NOVA v5 — engine.js
// Moteur Mathématique & Moteur de Rendu Canvas Retina
// =============================================================================
//
//  ╔═══════════════════════════════════════════════════════════════════════╗
//  ║                  CŒUR CALCULATOIRE ET GRAPHIQUE                       ║
//  ║                                                                       ║
//  ║   Ce fichier est strictement "sans DOM applicatif" : il ne touche     ║
//  ║   au DOM que pour le canvas et quelques éléments d'affichage d'état   ║
//  ║   (statut, coords, label angulaire). Toute la logique de modales,     ║
//  ║   de légende et de thèmes est déportée dans ui.js.                    ║
//  ║                                                                       ║
//  ║   Dépendance externe unique : math.js v11.8.0 (chargée via CDN dans   ║
//  ║   index.html), utilisée pour l'AST, l'évaluation, les dérivées        ║
//  ║   symboliques et l'algèbre (matrices, stats, etc.).                   ║
//  ╚═══════════════════════════════════════════════════════════════════════╝
//
// Ce fichier est le cœur de la calculatrice. Il contient :
//
//  [1] ÉTAT GLOBAL
//      Variables partagées entre tous les modules (scope, fonctions, vue, etc.)
//      Toutes ces variables sont exposées globalement par convention : ui.js
//      lit par exemple `fonctionsAffichees` et `themes` directement.
//
//  [2] INITIALISATION & HiDPI
//      Récupération du DOM, calibrage Retina du canvas (devicePixelRatio),
//      message de bienvenue. Déclenché sur l'événement DOMContentLoaded.
//
//  [3] MOTEUR D'ÉVALUATION (executer)
//      Interprète les expressions saisies selon 5 cas, dans cet ordre :
//        1. Définition de fonction  → f(x) = sin(x)        [tracée + mémorisée]
//        2. Assignation de variable → a = 3.14             [mémorisée dans scope]
//        3. Dérivée symbolique      → derivative(f(x), x)  [affichée textuelle]
//        4. Tracé rapide            → x^2 + 2              [contient la variable x]
//        5. Calcul numérique        → 2^10, sin(pi/6)      [résultat immédiat]
//
//      La détection est effectuée par regex et tests de sous-chaîne. Les
//      erreurs de math.js sont interceptées et traduites en français.
//
//  [4] MODE ANGULAIRE (buildScope / toggleAngleMode)
//      Surcharge des fonctions trigonométriques selon le mode RAD ou DEG.
//      Le mode DEG crée un scope dérivé où sin/cos/tan/asin/acos/atan/sinh/
//      cosh/tanh sont remplacés par des wrappers qui convertissent en/depuis
//      les radians avant d'appeler les fonctions Math.* natives.
//
//  [5] GESTION DES FONCTIONS (supprimerFonction, purgerMemoire, effacerGraphe)
//      - supprimerFonction(i) : retire une seule courbe par index
//      - effacerGraphe()      : vide toutes les courbes mais garde le scope
//      - purgerMemoire()      : reset complet (scope, historique, log, vue)
//
//  [6] MOTEUR CANVAS (dessiner)
//      Rendu pixel-par-pixel avec réticule de capture (cX, cY).
//      Pipeline de rendu : fond → grille → axes → labels → courbes → réticule.
//      Gestion automatique des discontinuités et asymptotes via détection de
//      sauts verticaux > 1.5 × hauteur écran.
//
//  [7] INTERACTIONS SOURIS (setupMouseEvents)
//      Pan (cliquer-glisser), zoom molette centré sur le curseur,
//      et Click-to-Fetch (clic sans mouvement = capture spatiale).
//      La distinction clic/glissement est faite via le flag `dragMoved`.
//
//  [8] INTERACTIONS TACTILES (setupTouchEvents)
//      Pan 1 doigt, Pinch-to-zoom 2 doigts, et Tap-to-Fetch.
//      Tous les événements utilisent preventDefault() pour bloquer le
//      scroll natif du navigateur.
//
//  [9] RACCOURCIS CLAVIER (setupKeyboardEvents)
//      Entrée       = évaluer / tracer
//      Échap        = effacer la saisie ou fermer une modale
//      Flèche ↑     = remonter dans l'historique (50 entrées max)
//      Flèche ↓     = descendre dans l'historique
//
//  [10] PROFILS CLAVIER MULTI-DISPOSITIONS
//      detectKeyboardProfile / loadKeyboardProfile / setKeyboardProfile /
//      cycleKeyboardProfile — gestion des 3 profils (universal, be, fr),
//      auto-détection navigator.language, persistance localStorage.
//
//  [11] POIGNÉE DE REDIMENSIONNEMENT ÉCRAN (v4.1+)
//      setupResizeHandle / applyScreenHeight / loadScreenHeight — permet
//      à l'utilisateur d'ajuster la hauteur du screen-module à la souris
//      ou au toucher, avec persistance dans localStorage et recalibrage
//      HiDPI automatique du canvas à chaque changement.
//
//      ── SYSTÈME DE PROFILS CLAVIER MULTI-DISPOSITIONS ──────────────────
//      QUANTUM-NOVA expose plusieurs "profils clavier" qui interceptent les
//      caractères mathématiques Unicode au keydown et les transforment en
//      syntaxe ASCII compréhensible par math.js. Trois profils fournis :
//
//        🌐 universal  → Map de base couvrant TOUS les symboles Unicode
//                        math courants (² ³ × ÷ π √ ∛ ∞ ≤ ≥ ≠ ± · µ ⁰⁴⁵⁶⁷⁸⁹).
//                        Fonctionne sur n'importe quel clavier physique :
//                        peu importe COMMENT le caractère arrive dans le
//                        champ (touche directe, AltGr, charmap, copier-
//                        coller depuis une page web), il sera converti.
//
//        🇧🇪 be        → Hérite de universal + spécificités AZERTY belge :
//                        interception de la touche morte ^ (Dead key) pour
//                        l'insérer directement sans attendre la lettre suivante.
//
//        🇫🇷 fr        → Hérite de universal + spécificités AZERTY français :
//                        identique à BE pour la touche morte ^, plus quelques
//                        nuances de libellé dans la documentation.
//
//      Exemples concrets de touches directes ou faciles d'accès :
//
//        Sur AZERTY-BE/FR :
//          ²  (touche à gauche du &)            →  ^2
//          ³  (AltGr + ²)                       →  ^3
//          ×  (AltGr + , sur certaines dispo)   →  *
//          ÷  (AltGr + : sur certaines dispo)   →  /
//
//        Sur QWERTY-US ou n'importe quel autre layout :
//          (Symboles tapés via charmap ou copier-coller)
//          π, √, ∛, ∞, ≤, ≥, ≠   → pi, sqrt(, cbrt(, Infinity, <=, >=, !=
//
//      Les maps sont stockées dans la constante KEYBOARD_PROFILES. La
//      sélection du profil est :
//        1. Auto-détectée au démarrage via navigator.language (fr-BE → be,
//           fr-FR/fr-CA/etc. → fr, autre → universal).
//        2. Surchargée par la valeur persistée dans localStorage si elle
//           existe (clé : "qn:kbdProfile").
//        3. Modifiable à chaud par l'utilisateur via :
//             - le bouton ⌨ KBD du clavier système (cycle rapide)
//             - le menu déroulant de l'onglet "Clavier" du modal Documentation
//
//      Le profil actif est mémorisé dans la variable globale `currentKeyboardProfile`.
// =============================================================================

// =============================================================================
// [1] ÉTAT GLOBAL
// =============================================================================
//
// Toutes les variables ci-dessous sont déclarées au niveau du fichier et donc
// partagées globalement avec ui.js. Ce choix volontaire (plutôt qu'un module
// ES) simplifie le chargement (deux simples <script> dans index.html, sans
// bundler) tout en maintenant une frontière logique stricte :
//
//   • ui.js   LIT  et  AFFICHE  → fonctionsAffichees, themes, currentThemeIndex,
//                                  KEYBOARD_PROFILES, currentKeyboardProfile
//   • engine.js CALCULE et ÉCRIT → scope, view, cibleX/Y, inputHistory, etc.
// -----------------------------------------------------------------------------

// `scope` est le dictionnaire passé à math.js pour chaque évaluation. Il
// contient les variables de l'utilisateur (a = 3, b = sin(pi), etc.) ainsi
// que les deux coordonnées capturées par Click-to-Fetch (cX, cY), initialisées
// à 0 pour éviter toute "Undefined symbol" si l'utilisateur tape f(cX) avant
// même d'avoir cliqué sur le canevas.
let scope = { cX: 0, cY: 0 }; // Inclut les variables de la cible spatiale

// Liste des courbes actuellement affichées. Chaque élément est un objet :
//   { nom: "f", ast: <CompiledNode math.js>, brute: "sin(x)", cssColor: "var(--curve-1)" }
// La couleur est stockée comme CSS var (pas comme #RRGGBB) pour que la bascule
// de thème change instantanément la couleur sans avoir à recompiler la liste.
let fonctionsAffichees = [];

// Mode angulaire courant : "rad" (défaut) ou "deg".
// Affecte sin / cos / tan / asin / acos / atan / sinh / cosh / tanh via buildScope().
let angleMode = 'rad';

// Fenêtre mathématique actuellement visible dans le canevas (coordonnées
// MATHÉMATIQUES, non pixels). Modifiée par pan, zoom et resetVue().
let view = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

// Historique des entrées utilisateur, navigable avec les flèches ↑ / ↓.
// Limité à 50 entrées pour éviter une croissance mémoire infinie.
let inputHistory = [];
let historyIndex = -1; // -1 = pas de navigation active dans l'historique

// Thème actuellement sélectionné, indexé dans le tableau `themes` ci-dessous.
// Par défaut : 'light' (E-Ink Light, index 1) — choix privilégié pour maximiser
// la lisibilité en intégration sidebar sur des pages web classiques.
// Ce choix est écrasé au démarrage par loadTheme() si une valeur est persistée
// dans localStorage (clé THEME_STORAGE_KEY).
let currentThemeIndex = 1;
const themes = ['cyber', 'light', 'phosphor', 'plasma'];

// Clé localStorage pour la persistance du choix de thème. Cohérent avec la
// convention `qn:*` déjà utilisée pour le profil clavier.
const THEME_STORAGE_KEY = 'qn:theme';

// Références DOM résolues une seule fois lors du DOMContentLoaded.
// Toute modification du DOM applicatif (ouverture de modal, injection de log,
// gestion de la légende, etc.) doit passer par ui.js — ces références ici
// restent purement "lecture d'état" ou "écriture de feedback visuel système".
let inputScreen, canvas, ctx, coordsText, statusLed, statusText,
    historyLog, angleModeBtn, angleModeLabel;

// ── Capture Spatiale (Click-to-Fetch) ───────────────────────────────────────
// Lorsque l'utilisateur effectue un clic simple sur le canevas (sans glisser),
// on enregistre ses coordonnées MATHÉMATIQUES dans cibleX/cibleY ET dans
// scope.cX/scope.cY. Le flag `cibleExistante` indique s'il faut dessiner le
// réticule (croix rouge) à chaque appel de dessiner().
let cibleExistante = false;
let cibleX = 0, cibleY = 0;

// ── Snap-to-Curve (Trace magnétique) — v4.2 ─────────────────────────────────
// Quand la souris passe près d'une courbe affichée, le curseur "se clipse"
// visuellement sur la courbe et l'affichage des coordonnées bascule de
// (X, Y) curseur brut à (x, f(x)) exact évalué sur la courbe la plus proche.
// Si le clic est ensuite effectué pendant cet état snap, les valeurs
// capturées dans cX/cY sont celles de la courbe, pas du curseur.
//
// Le seuil de distance verticale en pixels au-delà duquel on ne snap plus
// est volontairement assez permissif (30 px) pour aider la saisie tactile.
const SNAP_THRESHOLD_PX = 30;

// Flag d'activation du snap-to-curve. Toggleable par la commande texte
// "snap on" / "snap off" et persisté dans localStorage["qn:snap"].
// Valeur par défaut : true (snap actif, car c'est le comportement "calculatrice
// graphique" attendu par les utilisateurs d'origine TI/Casio).
let snapEnabled = true;
const SNAP_STORAGE_KEY = 'qn:snap';

// Flag d'activation du retour haptique (API navigator.vibrate) sur les touches
// du clavier visuel. Par défaut : true si l'API est disponible et si on est
// sur un device vraisemblablement tactile (Android). Persisté dans
// localStorage["qn:vibrate"].
let vibrationEnabled = true;
const VIBRATE_STORAGE_KEY = 'qn:vibrate';

let snapState = {
    active:      false,  // true si le curseur est actuellement "clipsé" sur une courbe
    fonctionIdx: -1,     // index dans fonctionsAffichees de la courbe cible
    mathX:       0,      // x mathématique exact (= x du curseur)
    mathY:       0,      // y mathématique exact (= f(mathX) évalué sur la courbe)
    cssColor:    ''      // couleur CSS de la courbe (pour le marqueur lumineux)
};

// =============================================================================
// [1bis] PROFILS CLAVIER MULTI-DISPOSITIONS
// =============================================================================
//
// Système de mapping qui convertit les caractères Unicode mathématiques tapés
// au clavier physique en syntaxe ASCII compréhensible par math.js. Voir les
// commentaires en tête de fichier pour la philosophie générale.
//
// La constante KEYBOARD_PROFILES est l'unique source de vérité. Pour ajouter
// un nouveau profil (ex : Allemand QWERTZ, Suisse, US-International), il
// suffit d'ajouter une entrée à cet objet — aucun autre code n'est à modifier.
// -----------------------------------------------------------------------------

// Map "universelle" : ces caractères Unicode arrivent dans le champ de saisie
// quel que soit le clavier physique de l'utilisateur, soit par touche directe,
// soit par AltGr/Option, soit par charmap, soit par copier-coller depuis le
// web. Cette map sert de socle commun à tous les profils.
const _UNIVERSAL_KBD_MAP = {
    // ── Exposants Unicode → opérateur ^ math.js ─────────────────────────────
    '⁰': '^0', '¹': '^1', '²': '^2', '³': '^3', '⁴': '^4',
    '⁵': '^5', '⁶': '^6', '⁷': '^7', '⁸': '^8', '⁹': '^9',

    // ── Indices Unicode (utiles pour log₁₀, log₂…) ──────────────────────────
    // Ils sont injectés en notation math.js : log(x, base)
    // On ne convertit PAS automatiquement les indices isolés car le contexte
    // est ambigu — ils sont donc laissés tels quels (math.js les rejettera
    // comme symbole inconnu, ce qui est le comportement attendu).

    // ── Opérateurs typographiques ───────────────────────────────────────────
    '×': '*',    // multiplication signe ×
    '·': '*',    // point médian (multiplication implicite)
    '÷': '/',    // division
    '−': '-',    // moins typographique U+2212 (différent du - ASCII U+002D)
    '–': '-',    // tiret demi-cadratin
    '—': '-',    // tiret cadratin

    // ── Constantes mathématiques ────────────────────────────────────────────
    'π': 'pi',
    'τ': 'tau',
    '∞': 'Infinity',
    'φ': 'phi',
    'ϕ': 'phi',

    // ── Fonctions à un argument (insertion avec parenthèse ouvrante) ────────
    '√': 'sqrt(',
    '∛': 'cbrt(',

    // ── Comparateurs ────────────────────────────────────────────────────────
    '≤': '<=',
    '≥': '>=',
    '≠': '!=',
    '≈': '==',   // approximation → égalité (math.js n'a pas de "approx")

    // ── Opérateurs de réduction (rare mais utile) ───────────────────────────
    '∑': 'sum(',
    '∏': 'prod(',

    // ── Symboles divers ─────────────────────────────────────────────────────
    '±': '+-',   // approximation textuelle (math.js ne gère pas ± nativement)
    '°': 'deg',  // degré → utilisé comme suffixe ou comme variable
};

// Construction effective des profils. Chaque profil hérite de _UNIVERSAL_KBD_MAP
// via spread, puis peut ajouter ses propres entrées (ou en surcharger).
const KEYBOARD_PROFILES = {

    universal: {
        id:          'universal',
        name:        'Universel',
        flag:        '🌐',
        description: 'Symboles Unicode mathématiques universels. Compatible avec tous les claviers physiques (BE, FR, DE, US, UK, …) dès lors que le caractère arrive d\'une manière ou d\'une autre dans le champ de saisie.',
        deadCaret:   false, // ne touche pas à la touche morte ^
        map: { ..._UNIVERSAL_KBD_MAP }
    },

    be: {
        id:          'be',
        name:        'Belge AZERTY (FR-BE)',
        flag:        '🇧🇪',
        description: 'Disposition AZERTY belge francophone. Les exposants ² (touche directe à gauche du &) et ³ (AltGr + ²) sont mappés en ^2/^3. La touche morte ^ est interceptée et insérée immédiatement (sans attendre la lettre suivante), pour fluidifier la saisie de puissances comme x^2.',
        deadCaret:   true,  // intercepte la touche morte ^ pour l'insérer directement
        map: { ..._UNIVERSAL_KBD_MAP }
    },

    fr: {
        id:          'fr',
        name:        'Français AZERTY (FR-FR)',
        flag:        '🇫🇷',
        description: 'Disposition AZERTY française métropolitaine. Comportement identique au profil Belge pour les exposants et la touche morte ^. Sélectionné automatiquement si navigator.language commence par "fr" sans être "fr-BE".',
        deadCaret:   true,
        map: { ..._UNIVERSAL_KBD_MAP }
    }
};

// Profil actuellement actif. Initialisé par loadKeyboardProfile() au démarrage,
// modifiable à chaud par setKeyboardProfile() ou cycleKeyboardProfile().
let currentKeyboardProfile = 'universal';

// Clé localStorage utilisée pour la persistance du choix utilisateur.
const KBD_STORAGE_KEY = 'qn:kbdProfile';

// =============================================================================
// [2] INITIALISATION & HiDPI (Retina)
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    inputScreen    = document.getElementById('screen');
    canvas         = document.getElementById('mathCanvas');
    ctx            = canvas.getContext('2d', { alpha: false });
    coordsText     = document.getElementById('coordsText');
    statusLed      = document.getElementById('led');
    statusText     = document.getElementById('statusText');
    historyLog     = document.getElementById('historyLog');
    angleModeBtn   = document.getElementById('angleModeBtn');
    angleModeLabel = document.getElementById('angleModeLabel');

    inputScreen.focus();
    resizeCanvas();
    setupMouseEvents();
    setupTouchEvents();
    setupKeyboardEvents();
    setupResizeHandle();  // Poignée de redimensionnement écran/clavier (v4.1+)

    // Charge le profil clavier (localStorage > auto-détection > universel).
    // Doit être appelé APRÈS setupKeyboardEvents pour que le handler soit
    // déjà branché, et APRÈS la résolution des références DOM pour que
    // refreshKeyboardProfileUI() puisse mettre à jour le label du bouton.
    loadKeyboardProfile();

    // Charge la hauteur d'écran persistée (si elle existe).
    // Appelé APRÈS resizeCanvas() initial pour que le canvas soit calibré
    // sur la nouvelle hauteur immédiatement.
    loadScreenHeight();

    // Charge les préférences d'interaction (snap-to-curve, vibration haptique).
    // Par défaut les deux sont activées si localStorage ne contient rien.
    if (typeof loadInteractionPreferences === 'function') loadInteractionPreferences();

    // Charge l'état de travail depuis les paramètres URL (?f1=…&v1=…&theme=…)
    // si l'utilisateur a ouvert un lien partagé. Doit être appelé EN DERNIER
    // car il peut écraser le thème chargé par loadTheme() et la vue de base.
    if (typeof loadStateFromURL === 'function') loadStateFromURL();

    ajouterLog('QUANTUM-NOVA v5', 'Moteur STELLAR HiDPI initialisé. Bienvenue.', 'var(--text-neon)');
    ajouterLog('Aide', 'Tapez f(x)=sin(x) puis ⏎, ou ouvrez le 📖 MANUEL.', 'var(--text-dim)');

    // Annonce le profil clavier actif (utile pour que l'utilisateur sache
    // immédiatement si l'auto-détection a deviné juste, sans avoir à ouvrir
    // le modal documentation).
    const kbdActif = KEYBOARD_PROFILES[currentKeyboardProfile];
    if (kbdActif) {
        ajouterLog(
            'Profil clavier',
            `${kbdActif.flag} ${kbdActif.name} — modifiable via ⌨ KBD`,
            'var(--text-dim)'
        );
    }
});

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 120);
});

/**
 * Redimensionnement pour les écrans haute définition (Retina/4K).
 * Élimine le flou des écrans à forte densité de pixels.
 */
function resizeCanvas() {
    const container = document.getElementById('canvasContainer');
    if (!container || !canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();

    // Taille physique
    canvas.width  = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Normalise le contexte
    ctx.scale(dpr, dpr);
    dessiner();
}

// =============================================================================
// [3] MOTEUR D'ÉVALUATION
// =============================================================================
//
// ── Sous-section : COMMANDES META TEXTUELLES ────────────────────────────────
// L'utilisateur peut taper des commandes en langage naturel dans le champ de
// saisie pour piloter l'application sans toucher à la souris. Ces commandes
// sont interceptées en tête d'executer() AVANT toute tentative d'évaluation
// par math.js.
//
// Format : nom de commande optionnellement suivi d'un argument, insensible à
// la casse. La table META_COMMANDS associe un pattern (RegExp) à un handler
// qui reçoit le résultat du match (groupes capturés inclus) et retourne soit
// une chaîne (loggée comme résultat), soit `null` (pas de log supplémentaire).
//
// Exemples utilisateur :
//   aide          → ouvre le modal de documentation
//   help          → idem
//   ?             → idem
//   doc           → ouvre docs.html dans un nouvel onglet
//   theme dark    → change le thème (alias dark/cyber, light, phosphor, plasma)
//   kbd be        → bascule sur le profil clavier belge
//   clear         → vide le panneau historique
//   reset         → recentre le graphe sur l'origine
//   popup         → ouvre la calculatrice en fenêtre widget détachée
//
// Pour ajouter une commande, il suffit d'ajouter une entrée à la table.
// Aucun autre code à modifier — la doc d'aide en ligne lit dynamiquement
// les commandes via getMetaCommandsList().
// -----------------------------------------------------------------------------

const META_COMMANDS = [
    {
        // Aide / help / ? — ouvre le modal documentation interne
        pattern: /^(aide|help|\?)$/i,
        handler: () => {
            if (typeof ouvrirModal === 'function') ouvrirModal('manualModal');
            return 'Documentation ouverte';
        },
        usage: 'aide | help | ?',
        desc:  'Ouvre le manuel intégré'
    },
    {
        // doc / docs — ouvre docs.html dans un nouvel onglet du navigateur
        pattern: /^docs?$/i,
        handler: () => {
            window.open('docs.html', '_blank', 'noopener');
            return 'docs.html ouvert dans un nouvel onglet';
        },
        usage: 'doc | docs',
        desc:  'Ouvre la documentation complète dans un onglet séparé'
    },
    {
        // theme <nom> — change le thème (alias acceptés : dark, sombre)
        pattern: /^th[eè]me?\s+(\w+)$/i,
        handler: (m) => {
            // Normalisation : "dark" et "sombre" sont des alias de "cyber"
            const aliases = {
                dark: 'cyber', sombre: 'cyber', noir: 'cyber',
                clair: 'light', blanc: 'light',
                vert: 'phosphor', matrix: 'phosphor', terminal: 'phosphor',
                neon: 'plasma', cyberpunk: 'plasma'
            };
            const arg = m[1].toLowerCase();
            const id  = aliases[arg] || arg;
            if (typeof setTheme === 'function') {
                setTheme(id);
                return null; // setTheme logge déjà sa propre confirmation
            }
            return `⚠ setTheme indisponible`;
        },
        usage: 'theme <nom>',
        desc:  'Change le thème : cyber|dark, light|clair, phosphor|matrix, plasma|neon'
    },
    {
        // kbd <profil> — change le profil clavier
        pattern: /^(kbd|clavier)\s+(\w+)$/i,
        handler: (m) => {
            if (typeof setKeyboardProfile === 'function') {
                setKeyboardProfile(m[2].toLowerCase());
                return null;
            }
            return '⚠ setKeyboardProfile indisponible';
        },
        usage: 'kbd <profil>',
        desc:  'Change le profil clavier : universal | be | fr'
    },
    {
        // clear / cls — vide le panneau historique
        pattern: /^(clear|cls|effacer)$/i,
        handler: () => {
            const log = document.getElementById('historyLog');
            if (log) log.innerHTML = '';
            if (typeof updateLogCount === 'function') updateLogCount();
            return null; // on évite de logger un "Log effacé" qui repollue le log fraîchement vidé
        },
        usage: 'clear | cls',
        desc:  'Vide le panneau historique'
    },
    {
        // reset — recentre la vue du graphe sur l'origine
        pattern: /^reset$/i,
        handler: () => {
            if (typeof resetVue === 'function') resetVue();
            return 'Vue recentrée sur l\'origine';
        },
        usage: 'reset',
        desc:  'Recentre le graphe sur l\'origine (équivalent du bouton ⌂ VUE)'
    },
    {
        // export — télécharge le canvas courant en PNG haute résolution
        pattern: /^(export|png|save)$/i,
        handler: () => {
            if (typeof exportPNG === 'function') {
                exportPNG();
                return null; // exportPNG logge sa propre confirmation
            }
            return '⚠ exportPNG indisponible';
        },
        usage: 'export | png | save',
        desc:  'Télécharge le graphe courant en PNG haute résolution'
    },
    {
        // share — copie l'URL d'état partageable dans le presse-papier
        pattern: /^(share|partager|lien)$/i,
        handler: () => {
            if (typeof shareStateURL === 'function') {
                shareStateURL();
                return null;
            }
            return '⚠ shareStateURL indisponible';
        },
        usage: 'share | partager | lien',
        desc:  'Copie dans le presse-papier une URL contenant l\'état actuel (fonctions, variables, vue, thème)'
    },
    {
        // snap on|off — active/désactive le Snap-to-Curve
        pattern: /^snap\s+(on|off|1|0|true|false)$/i,
        handler: (m) => {
            const arg = m[1].toLowerCase();
            const on = (arg === 'on' || arg === '1' || arg === 'true');
            if (typeof setSnap === 'function') setSnap(on);
            return null;
        },
        usage: 'snap on | snap off',
        desc:  'Active/désactive le Snap-to-Curve (aimantation automatique du curseur sur la courbe la plus proche)'
    },
    {
        // vibrate on|off — active/désactive le retour haptique
        pattern: /^(vibrate|vibration|haptic)\s+(on|off|1|0|true|false)$/i,
        handler: (m) => {
            const arg = m[2].toLowerCase();
            const on = (arg === 'on' || arg === '1' || arg === 'true');
            if (typeof setVibrate === 'function') setVibrate(on);
            return null;
        },
        usage: 'vibrate on | vibrate off',
        desc:  'Active/désactive le retour haptique (vibration au clic des touches, Android uniquement)'
    },
    {
        // shade <fn> <a> <b> — active l'ombrage d'intégrale sur une fonction
        // Formes acceptées : "shade f 0 5"  |  "shade(f, 0, 5)"  |  "shade f, 0, 5"
        pattern: /^shade\s*\(?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*[,\s]\s*(-?[0-9.eE+-]+)\s*[,\s]\s*(-?[0-9.eE+-]+)\s*\)?$/i,
        handler: (m) => {
            const nom = m[1];
            const a   = parseFloat(m[2]);
            const b   = parseFloat(m[3]);
            if (!isFinite(a) || !isFinite(b)) {
                return '⚠ Bornes invalides';
            }
            const fn = fonctionsAffichees.find(f => f.nom === nom);
            if (!fn) {
                return `⚠ Fonction "${nom}" introuvable — définissez-la d'abord`;
            }
            fn.shade = { from: a, to: b };
            dessiner();
            return `∫ ${nom}(x) ombrée sur [${a}, ${b}]`;
        },
        usage: 'shade <fn> <a> <b>',
        desc:  'Ombrage d\'intégrale : remplit l\'aire sous la courbe entre deux bornes'
    },
    {
        // shade off <fn> — retire l'ombrage
        pattern: /^shade\s+(off|clear|remove)\s+([a-zA-Z_][a-zA-Z0-9_]*)$/i,
        handler: (m) => {
            const nom = m[2];
            const fn = fonctionsAffichees.find(f => f.nom === nom);
            if (!fn) return `⚠ Fonction "${nom}" introuvable`;
            delete fn.shade;
            dessiner();
            return `∫ Ombrage de ${nom}(x) retiré`;
        },
        usage: 'shade off <fn>',
        desc:  'Retire l\'ombrage d\'intégrale d\'une fonction'
    },
    {
        // limit <fn> <a> [side] — calcule lim fn(x) quand x → a
        // Formes acceptées :
        //   limit f 0            → bilatérale en 0
        //   limit(f, 0)          → idem
        //   limit f, 2, left     → unilatérale gauche
        //   limit f inf          → limite à +∞
        //   limit f -inf         → limite à -∞
        // a peut être un nombre décimal OU "inf"/"+inf"/"-inf"/"infinity"
        pattern: /^limit\s*\(?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*[,\s]\s*(-?(?:inf(?:inity)?|[0-9.eE+-]+))\s*(?:[,\s]\s*(left|right|both|g|d))?\s*\)?$/i,
        handler: (m) => {
            const nom     = m[1];
            const aRaw    = m[2].toLowerCase();
            const sideRaw = (m[3] || 'both').toLowerCase();

            // Parsing de a
            let a;
            if (aRaw === 'inf' || aRaw === '+inf' || aRaw === 'infinity' || aRaw === '+infinity') {
                a = +Infinity;
            } else if (aRaw === '-inf' || aRaw === '-infinity') {
                a = -Infinity;
            } else {
                a = parseFloat(aRaw);
                if (!isFinite(a)) return `⚠ Point cible invalide : "${aRaw}"`;
            }

            // Parsing du côté (avec alias g/d pour gauche/droite)
            let side = 'both';
            if (sideRaw === 'left' || sideRaw === 'g') side = 'left';
            else if (sideRaw === 'right' || sideRaw === 'd') side = 'right';

            // On ne peut pas demander un "both" à ±∞ (un seul côté a du sens)
            if (!isFinite(a) && side === 'both') side = a > 0 ? 'left' : 'right';

            const fn = fonctionsAffichees.find(f => f.nom === nom);
            if (!fn) return `⚠ Fonction "${nom}" introuvable — définissez-la d'abord`;
            if (fn.implicit) return `⚠ "${nom}" est implicite — limit ne s'applique qu'aux fonctions y=f(x)`;

            const fEval  = (xx) => fn.ast.evaluate(buildScope(xx));
            const result = computeLimit(fEval, a, side);

            // Log avec flèche vers le bon côté
            const arrow = !isFinite(a)
                ? (a > 0 ? 'x→+∞' : 'x→-∞')
                : (side === 'left'  ? `x→${a}⁻`
                :  side === 'right' ? `x→${a}⁺`
                :                     `x→${a}`);
            ajouterLog(
                `lim ${nom}(x) ${arrow}`,
                `= ${formatLimitResult(result)}`,
                fn.cssColor
            );

            // Pose aussi un marqueur visuel (seulement pour a fini — une
            // asymptote horizontale sur le graphe pour une limite à ±∞
            // demanderait une autre structure de rendu).
            if (isFinite(a)) {
                limMarkers.push({
                    x: a,
                    fnName: fn.nom,
                    cssColor: fn.cssColor,
                    result: result
                });
                dessiner();
            }
            return null; // on a déjà loggué manuellement
        },
        usage: 'limit <fn> <a> [left|right]',
        desc:  'Calcule lim fn(x) quand x tend vers a (nombre ou ±inf)'
    },
    {
        // limit clear / limit off — efface tous les marqueurs de limites
        pattern: /^limit\s+(clear|off|reset)$/i,
        handler: () => {
            if (typeof effacerLimites === 'function') {
                effacerLimites();
                return null;
            }
            return '⚠ Module limites indisponible';
        },
        usage: 'limit clear',
        desc:  'Efface tous les marqueurs de limites du graphe'
    },
    {
        // analyse / racines — active l'analyseur et lance un recalcul
        pattern: /^(analyse|analyze|racines|roots)$/i,
        handler: () => {
            if (typeof setAnalyse === 'function') {
                setAnalyse(true);
                return null; // setAnalyse logge déjà le résultat via analyseCurves
            }
            return '⚠ Analyseur indisponible';
        },
        usage: 'analyse | racines',
        desc:  'Active le détecteur de racines et intersections, et lance un calcul'
    },
    {
        // analyse off — désactive l'analyseur
        pattern: /^(analyse|analyze|racines|roots)\s+(off|stop|clear)$/i,
        handler: () => {
            if (typeof setAnalyse === 'function') {
                setAnalyse(false);
                return null;
            }
            return '⚠ Analyseur indisponible';
        },
        usage: 'analyse off',
        desc:  'Désactive le détecteur de racines et intersections'
    },
    {
        // fit / view fit — auto-ajuste Y pour que toutes les courbes soient visibles
        pattern: /^(fit|view\s+fit|auto)$/i,
        handler: () => {
            if (typeof autoFitView !== 'function' || fonctionsAffichees.length === 0) {
                return '⚠ Aucune fonction à ajuster';
            }
            autoFitView(true);
            dessiner();
            return `Vue ajustée : Y ∈ [${view.yMin.toFixed(3)}, ${view.yMax.toFixed(3)}]`;
        },
        usage: 'fit | view fit | auto',
        desc:  'Auto-ajuste l\'échelle verticale pour que toutes les courbes soient visibles'
    },
    {
        // view xmin xmax ymin ymax — fenêtre de vue explicite
        // Formes acceptées : "view -5 5 -100 100" ou "view(-5, 5, -100, 100)"
        pattern: /^view\s*\(?\s*(-?[0-9.eE+-]+)\s*[,\s]\s*(-?[0-9.eE+-]+)\s*[,\s]\s*(-?[0-9.eE+-]+)\s*[,\s]\s*(-?[0-9.eE+-]+)\s*\)?$/i,
        handler: (m) => {
            const xMin = parseFloat(m[1]);
            const xMax = parseFloat(m[2]);
            const yMin = parseFloat(m[3]);
            const yMax = parseFloat(m[4]);
            if (![xMin, xMax, yMin, yMax].every(isFinite)) return '⚠ Bornes invalides';
            if (xMin >= xMax || yMin >= yMax) return '⚠ Bornes dans le mauvais ordre (min doit être < max)';
            view.xMin = xMin; view.xMax = xMax;
            view.yMin = yMin; view.yMax = yMax;
            dessiner();
            return `Vue : X ∈ [${xMin}, ${xMax}], Y ∈ [${yMin}, ${yMax}]`;
        },
        usage: 'view <xmin> <xmax> <ymin> <ymax>',
        desc:  'Définit manuellement la fenêtre de vue (exemple : view -5 5 -100 100)'
    },
    {
        // view reset — retour aux bornes par défaut
        pattern: /^view\s+(reset|default)$/i,
        handler: () => {
            view.xMin = -10; view.xMax = 10;
            view.yMin = -10; view.yMax = 10;
            dessiner();
            return 'Vue : bornes par défaut [-10, 10] × [-10, 10]';
        },
        usage: 'view reset',
        desc:  'Restaure les bornes par défaut (-10 à 10 sur les deux axes)'
    }
];

/**
 * Tente d'interpréter `expr` comme une commande meta. Retourne true si la
 * commande a été reconnue et exécutée (auquel cas l'appelant DOIT s'arrêter
 * et ne pas tenter une évaluation math.js), false sinon.
 */
function processMetaCommand(expr) {
    const norm = expr.trim();
    for (const cmd of META_COMMANDS) {
        const m = norm.match(cmd.pattern);
        if (m) {
            const result = cmd.handler(m);
            if (result !== null) {
                ajouterLog(norm, result, 'var(--text-neon)');
            }
            inputScreen.value = '';
            setStatus('IDLE', 'var(--text-success)');
            return true;
        }
    }
    return false;
}

/**
 * Retourne la liste des commandes meta sous forme de tableau exploitable
 * par la documentation (modal d'aide ou docs.html). Permet à la doc d'être
 * toujours synchronisée avec la table META_COMMANDS sans duplication.
 */
function getMetaCommandsList() {
    return META_COMMANDS.map(c => ({ usage: c.usage, desc: c.desc }));
}

function executer() {
    const brut = inputScreen.value.trim();
    if (!brut) return;

    const expr = brut.replace(/÷/g, '/').replace(/×/g, '*').replace(/−/g, '-');

    if (inputHistory[0] !== brut) {
        inputHistory.unshift(brut);
        if (inputHistory.length > 50) inputHistory.pop();
    }
    historyIndex = -1;

    // ── Cas 0 : COMMANDE META TEXTUELLE (aide, theme, popup, etc.) ────────
    // On teste les commandes meta AVANT toute tentative d'évaluation math.js,
    // car certaines comme "clear" ou "reset" pourraient être interprétées
    // comme des symboles inconnus et générer une erreur trompeuse.
    if (processMetaCommand(expr)) return;

    setStatus('COMPILATION...', 'var(--text-neon)');

    try {
        // ── Cas 0b : ÉQUATION IMPLICITE F(x,y) = 0 ───────────────────────────
        // Détecté quand l'expression contient `y` comme variable libre. On
        // accepte plusieurs formes :
        //     (x^2+y^2-1)^3 - x^2*y^3 = 0
        //     x^2 + y^2 = 1
        //     f(x) = (x^2+y^2-1)^3 - x^2*y^3 = 0     (préfixe f(x)= ignoré)
        //     implicit: x^2 + y^2 - 1
        // Le tracé utilise l'algorithme marching squares sur la fenêtre
        // visible (voir dessinerImplicite() dans dessiner()).
        const aY = /(^|[^a-zA-Z_0-9])y([^a-zA-Z_0-9(]|$)/.test(expr);
        if (aY) {
            // 1. Strip préfixe optionnel "implicit:" ou "nom(x)=" / "nom(x,y)="
            let raw = expr.replace(/^\s*implicit\s*:\s*/i, '');
            raw = raw.replace(/^[a-zA-Z_][a-zA-Z0-9_]*\(\s*x\s*(?:,\s*y\s*)?\)\s*=\s*/, '');

            // 2. Split sur le dernier `=` restant pour obtenir F = LHS - RHS
            //    (on évite de splitter sur `==`, `<=`, `>=`, `!=`)
            let fExprSource;
            const eqMatches = [];
            for (let i = 0; i < raw.length; i++) {
                if (raw[i] === '=' &&
                    raw[i-1] !== '<' && raw[i-1] !== '>' && raw[i-1] !== '!' && raw[i-1] !== '=' &&
                    raw[i+1] !== '=') {
                    eqMatches.push(i);
                }
            }
            if (eqMatches.length === 0) {
                fExprSource = raw.trim();
            } else if (eqMatches.length === 1) {
                const lhs = raw.slice(0, eqMatches[0]).trim();
                const rhs = raw.slice(eqMatches[0] + 1).trim();
                fExprSource = `(${lhs})-(${rhs})`;
            } else {
                throw new Error(`Équation implicite : trop de signes "=" (${eqMatches.length}). Forme attendue : LHS = RHS`);
            }

            const noeudImpl = math.compile(fExprSource);

            // Test rapide : l'expression accepte-t-elle bien (x, y) ?
            try { noeudImpl.evaluate({ x: 0.37, y: 0.42 }); }
            catch (e) { throw new Error(`Équation implicite invalide : ${e.message}`); }

            const numCouleur = (fonctionsAffichees.length % 4) + 1;
            const varCouleur = `var(--curve-${numCouleur})`;
            const autoNom    = `F${fonctionsAffichees.length + 1}`;

            const objetImpl = {
                nom: autoNom,
                ast: noeudImpl,
                brute: `${fExprSource} = 0`,
                cssColor: varCouleur,
                implicit: true
            };
            fonctionsAffichees.push(objetImpl);
            ajouterLog(expr, `✓ ${autoNom}(x,y) = 0 enregistrée [implicite]`, varCouleur);

            // Si c'est la seule fonction, on cadre autour de l'origine car
            // la vue par défaut [-10,10]×[autofit] est inadaptée : la plupart
            // des courbes implicites "classiques" (cœur, cercle unité,
            // lemniscate…) tiennent dans [-2, 2] × [-2, 2].
            if (fonctionsAffichees.length === 1) {
                view.xMin = -2; view.xMax = 2;
                view.yMin = -2; view.yMax = 2;
            }

            inputScreen.value = ''; updateLegende(); dessiner();
            setStatus('IDLE', 'var(--text-success)');
            return;
        }

        // ── Cas 1 : DÉFINITION DE FONCTION ────────────────────────────────────
        // Syntaxe : f(x) = expression [| shade(a, b)]
        // Le modificateur optionnel `| shade(a, b)` active l'ombrage d'intégrale
        // directement lors de la définition, sans avoir à taper une commande
        // séparée. Le pipe `|` joue ici le rôle de séparateur visuel, inspiré
        // des langages fonctionnels type F#/Elixir.
        const matchFonction = expr.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\(x\)\s*=(.+)$/);
        if (matchFonction) {
            const nomFonction    = matchFonction[1];
            let   expressionMath = matchFonction[2].trim();

            // ── Extraction éventuelle du modificateur | shade(a, b) ─────────
            let shadeAttribute = null;
            const shadeInline = expressionMath.match(/^(.+?)\s*\|\s*shade\s*\(\s*(-?[0-9.eE+-]+)\s*,\s*(-?[0-9.eE+-]+)\s*\)\s*$/i);
            if (shadeInline) {
                expressionMath = shadeInline[1].trim();
                const a = parseFloat(shadeInline[2]);
                const b = parseFloat(shadeInline[3]);
                if (isFinite(a) && isFinite(b)) {
                    shadeAttribute = { from: a, to: b };
                }
            }

            const noeudCompile   = math.compile(expressionMath);

            const numCouleur = (fonctionsAffichees.length % 4) + 1;
            const varCouleur = `var(--curve-${numCouleur})`;

            const objetFonction = { nom: nomFonction, ast: noeudCompile, brute: expressionMath, cssColor: varCouleur };
            if (shadeAttribute) objetFonction.shade = shadeAttribute;

            const index = fonctionsAffichees.findIndex(f => f.nom === nomFonction);
            if (index !== -1) {
                // Préserve l'ombrage existant si aucun nouveau n'est spécifié
                if (!shadeAttribute && fonctionsAffichees[index].shade) {
                    objetFonction.shade = fonctionsAffichees[index].shade;
                }
                fonctionsAffichees[index] = objetFonction;
                ajouterLog(expr, `✓ ${nomFonction}(x) mise à jour${shadeAttribute ? ' + ∫ ombrage' : ''}`, varCouleur);
            } else {
                fonctionsAffichees.push(objetFonction);
                ajouterLog(expr, `✓ ${nomFonction}(x) enregistrée${shadeAttribute ? ' + ∫ ombrage' : ''}`, varCouleur);
            }

            try { math.evaluate(`${nomFonction}(x) = ${expressionMath}`, scope); } catch(e) { }

            // Auto-fit de la fenêtre pour que la nouvelle fonction soit
            // entièrement visible. On ajuste uniquement Y (on conserve X)
            // pour respecter un éventuel pan/zoom horizontal en cours.
            autoFitView(true);

            inputScreen.value = ''; updateLegende(); dessiner();
            setStatus('IDLE', 'var(--text-success)');
            return;
        }

        // ── Cas 2 : ASSIGNATION DE VARIABLE ────────────────────────────────────
        const estAssignation = expr.includes('=') && !expr.startsWith('derivative(') && !/^[a-zA-Z_][a-zA-Z0-9_]*\(x\)\s*=/.test(expr);
        if (estAssignation) {
            const res       = math.evaluate(expr, buildScope());
            const resFormat = formatResult(res);
            ajouterLog(expr, `= ${resFormat}  [mémorisé]`);
            inputScreen.value = ''; dessiner(); // Dessiner car ça peut altérer une courbe
            setStatus('IDLE', 'var(--text-success)');
            return;
        }

        // ── Cas 3 : DÉRIVÉE SYMBOLIQUE ─────────────────────────────────────────
        if (expr.startsWith('derivative(')) {
            const res    = math.evaluate(expr, buildScope());
            ajouterLog(expr, `= ${res.toString()}  [dérivée symbolique]`);
            inputScreen.value = '';
            setStatus('IDLE', 'var(--text-success)');
            return;
        }

        // ── Cas 4 : TRACÉ RAPIDE ────────────────────────────────────────────────
        if (/\bx\b/.test(expr)) {
            const noeudCompile = math.compile(expr);
            const numCouleur   = (fonctionsAffichees.length % 4) + 1;
            const autoNom      = `y${fonctionsAffichees.length + 1}`;

            fonctionsAffichees.push({ nom: autoNom, ast: noeudCompile, brute: expr, cssColor: `var(--curve-${numCouleur})` });
            ajouterLog(expr, `→ Tracé rapide ${autoNom}(x)`, `var(--curve-${numCouleur})`);

            // Auto-fit Y pour garantir la visibilité du tracé rapide
            autoFitView(true);

            inputScreen.value = ''; updateLegende(); dessiner();
            setStatus('IDLE', 'var(--text-success)');
            return;
        }

        // ── Cas 5 : CALCUL NUMÉRIQUE ────────────────────────────────────────────
        const res       = math.evaluate(expr, buildScope());
        ajouterLog(expr, `= ${formatResult(res)}`);
        inputScreen.value = '';

    } catch (err) {
        let msgErr = err.message || 'Erreur inconnue';
        if (msgErr.includes('Unexpected end of expression')) msgErr = 'Expression incomplète — vérifiez les parenthèses';
        if (msgErr.includes('Unexpected operator')) msgErr = 'Opérateur inattendu — syntaxe incorrecte';
        const symMatch = msgErr.match(/Undefined symbol\s+(.+)/i);
        if (symMatch) msgErr = `Variable inconnue : "${symMatch[1].trim()}"`;

        ajouterLog(expr, `⚠ ${msgErr}`, 'var(--text-error)');
    }
    setStatus('IDLE', 'var(--text-success)');
}

function formatResult(res) {
    if (res === null || res === undefined) return '∅';
    if (typeof res === 'boolean') return res ? 'vrai' : 'faux';
    if (typeof res === 'object') return math.format(res, { precision: 10 });
    return math.format(res, { precision: 14 });
}

// =============================================================================
// [4] MODE ANGULAIRE
// =============================================================================
function buildScope(xValue) {
    const s = Object.assign({}, scope);
    if (xValue !== undefined) s.x = xValue;

    if (angleMode === 'deg') {
        const D = Math.PI / 180;
        const R = 180 / Math.PI;
        Object.assign(s, {
            sin:  x => Math.sin(x * D), cos:  x => Math.cos(x * D), tan:  x => Math.tan(x * D),
            asin: x => Math.asin(x) * R, acos: x => Math.acos(x) * R, atan: x => Math.atan(x) * R,
            sinh: x => Math.sinh(x * D), cosh: x => Math.cosh(x * D), tanh: x => Math.tanh(x * D),
        });
    }
    return s;
}

function toggleAngleMode() {
    angleMode = (angleMode === 'rad') ? 'deg' : 'rad';
    const isRad   = angleMode === 'rad';
    const label   = isRad ? 'RAD' : 'DEG';
    const couleur = isRad ? '' : 'var(--text-warn)';

    angleModeBtn.textContent = label; angleModeBtn.style.color = couleur;
    angleModeLabel.textContent = label; angleModeLabel.style.color = couleur || 'var(--text-dim)';
    ajouterLog(`Mode → ${label}`, `Trigonométrie en ${isRad ? 'radians' : 'degrés'}.`, 'var(--text-neon)');
}

// =============================================================================
// [5] GESTION DES FONCTIONS
// =============================================================================
function supprimerFonction(index) {
    if (index < 0 || index >= fonctionsAffichees.length) return;
    const nom = fonctionsAffichees[index].nom;
    fonctionsAffichees.splice(index, 1);
    ajouterLog('Supprimé', `${nom}(x) retirée du graphe`, 'var(--text-warn)');
    updateLegende(); dessiner();
}

function purgerMemoire() {
    scope = { cX: 0, cY: 0 };
    fonctionsAffichees = [];
    historyLog.innerHTML = '';
    historyIndex = -1;
    cibleExistante = false;
    limMarkers = [];
    ajouterLog('⚡ RAM PURGÉE', 'Espace de travail réinitialisé.', 'var(--text-error)');
    updateLegende(); resetVue();
}

function effacerGraphe() {
    fonctionsAffichees = [];
    cibleExistante = false;
    limMarkers = [];
    ajouterLog('🗑️ Graphe effacé', 'Variables conservées en mémoire.', 'var(--text-warn)');
    updateLegende(); dessiner();
}

// =============================================================================
// [6] MOTEUR CANVAS
// =============================================================================
function getCSSVar(name) { return getComputedStyle(canvas).getPropertyValue(name).trim(); }

function resetVue() {
    view = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
    // Si des fonctions sont affichées, on auto-fit Y immédiatement après le
    // reset X pour éviter de laisser l'utilisateur avec un cadrage dénué
    // de sens (par exemple 5(x-4)(x-1)(x+3) a des Y qui atteignent ±5000).
    if (fonctionsAffichees.length > 0) {
        autoFitView(true); // Y-only : on garde le reset X à [-10, 10]
    }
    dessiner();
    if (inputScreen) inputScreen.focus();
}

/**
 * Ajuste automatiquement la fenêtre de vue pour que toutes les courbes
 * affichées soient visibles avec une marge confortable.
 *
 * Principe :
 *   1. Échantillonne 200 points sur la plage X COURANTE pour chaque courbe
 *   2. Collecte toutes les valeurs Y finies
 *   3. Calcule min/max avec un padding de 10% au-dessus et en dessous
 *   4. Filtre les valeurs aberrantes (asymptotes, explosions numériques)
 *      en écartant les 2% extrêmes via un tri + quantiles
 *
 * @param {boolean} yOnly  Si true, on ne modifie que view.yMin/yMax et on
 *                         conserve la plage X actuelle. Si false, on reset
 *                         aussi X à [-10, 10]. Par défaut : yOnly = true.
 */
let fitAnimId = null;

/**
 * Ajuste la fenêtre de vue de manière fluide (Interpolation Cinématique).
 * Maintient la mémoire spatiale de l'utilisateur lors de l'ajout de courbes.
 */
function autoFitView(yOnly = true) {
    if (fonctionsAffichees.length === 0) return;

    let targetXMin = view.xMin;
    let targetXMax = view.xMax;

    if (!yOnly) {
        targetXMin = -10;
        targetXMax = 10;
    }

    const samples = 400;
    const step = (targetXMax - targetXMin) / samples;
    const allY = [];

    for (const fn of fonctionsAffichees) {
        if (fn.implicit) continue;
        for (let i = 0; i <= samples; i++) {
            const x = targetXMin + i * step;
            try {
                const y = fn.ast.evaluate(buildScope(x));
                if (typeof y === 'number' && isFinite(y)) {
                    allY.push(y);
                }
            } catch (e) { /* Point ignoré */ }
        }
    }

    if (allY.length < 5) {
        if (!yOnly) { view.xMin = targetXMin; view.xMax = targetXMax; dessiner(); }
        return;
    }

    allY.sort((a, b) => a - b);
    const trim = Math.floor(allY.length * 0.02);
    const lo = allY[trim];
    const hi = allY[allY.length - 1 - trim];

    let targetYMin, targetYMax;
    if (hi - lo < 1e-9) {
        targetYMin = lo - 1; targetYMax = hi + 1;
    } else {
        const padding = (hi - lo) * 0.10;
        targetYMin = lo - padding; targetYMax = hi + padding;
    }

    if (targetYMin > 0 && targetYMin < (targetYMax - targetYMin) * 0.15) targetYMin = -((targetYMax - targetYMin) * 0.05);
    if (targetYMax < 0 && Math.abs(targetYMax) < (targetYMax - targetYMin) * 0.15) targetYMax = ((targetYMax - targetYMin) * 0.05);

    if (fitAnimId) cancelAnimationFrame(fitAnimId);

    const startYMin = view.yMin;
    const startYMax = view.yMax;
    const startXMin = view.xMin;
    const startXMax = view.xMax;
    const startTime = performance.now();
    const duration = 450;

    function animate(time) {
        let elapsed = time - startTime;
        let progress = elapsed / duration;
        if (progress > 1) progress = 1;

        const ease = 1 - Math.pow(1 - progress, 4);

        view.yMin = startYMin + (targetYMin - startYMin) * ease;
        view.yMax = startYMax + (targetYMax - startYMax) * ease;

        if (!yOnly) {
            view.xMin = startXMin + (targetXMin - startXMin) * ease;
            view.xMax = startXMax + (targetXMax - startXMax) * ease;
        }

        dessiner();

        if (progress < 1) {
            fitAnimId = requestAnimationFrame(animate);
        } else {
            fitAnimId = null;
        }
    }

    fitAnimId = requestAnimationFrame(animate);
}

function dessiner() {
    if (!ctx || !canvas || canvas.width === 0) return;

    // Utilisation de clientWidth/Height garantit les calculs logiques corrects
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    const xRange = view.xMax - view.xMin;
    const yRange = view.yMax - view.yMin;

    // 1. Fond
    ctx.fillStyle = getCSSVar('--screen-bg');
    ctx.fillRect(0, 0, W, H);

    // 2. Grille
    // FIX v5.1 : on calcule DEUX pas indépendants (stepX et stepY). Avant,
    // `step` était dérivé uniquement de xRange puis réutilisé pour l'axe Y,
    // ce qui produisait des centaines de lignes/labels empilés dès que
    // l'amplitude en Y était très supérieure à celle en X (ex: f(x)=x²,
    // exp, x^3…). Résultat visuel : une "colonne de hachures" près de l'axe.
    const niceStep = (range) => {
        const raw = range / 8;
        if (!isFinite(raw) || raw <= 0) return 1;
        const mag = Math.pow(10, Math.floor(Math.log10(raw)));
        const ratio = raw / mag;
        if (ratio >= 5) return mag * 5;
        if (ratio >= 2) return mag * 2;
        return mag;
    };
    const stepX = niceStep(xRange);
    const stepY = niceStep(yRange);
    // On garde `step` pour compatibilité avec le code en aval qui l'utilise
    // encore pour la tolérance "Math.abs(x) < step * 0.01".
    const step = stepX;

    ctx.strokeStyle = getCSSVar('--grid-color');
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.ceil(view.xMin / stepX) * stepX; x <= view.xMax + stepX * 0.01; x += stepX) {
        const px = Math.round(((x - view.xMin) / xRange) * W);
        ctx.moveTo(px, 0); ctx.lineTo(px, H);
    }
    for (let y = Math.ceil(view.yMin / stepY) * stepY; y <= view.yMax + stepY * 0.01; y += stepY) {
        const py = Math.round(H - ((y - view.yMin) / yRange) * H);
        ctx.moveTo(0, py); ctx.lineTo(W, py);
    }
    ctx.stroke();

    // 3. Axes
    ctx.strokeStyle = getCSSVar('--axis-color');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (view.xMin <= 0 && view.xMax >= 0) {
        const px0 = ((0 - view.xMin) / xRange) * W;
        ctx.moveTo(px0, 0); ctx.lineTo(px0, H);
    }
    if (view.yMin <= 0 && view.yMax >= 0) {
        const py0 = H - ((0 - view.yMin) / yRange) * H;
        ctx.moveTo(0, py0); ctx.lineTo(W, py0);
    }
    ctx.stroke();

    // 4. Labels
    ctx.fillStyle = getCSSVar('--text-dim');
    const fontSize = Math.max(10, Math.min(12, W / 55));
    ctx.font = `${fontSize}px 'Courier New', monospace`;

    const axeYpx = (view.yMin <= 0 && view.yMax >= 0) ? Math.min(H - 16, H - ((0 - view.yMin) / yRange) * H + 14) : H - 6;
    const axeXpx = (view.xMin <= 0 && view.xMax >= 0) ? Math.max(30, ((0 - view.xMin) / xRange) * W - 4) : 30;

    ctx.textAlign = 'center';
    for (let x = Math.ceil(view.xMin / stepX) * stepX; x <= view.xMax; x += stepX) {
        if (Math.abs(x) < stepX * 0.01) continue;
        const px = ((x - view.xMin) / xRange) * W;
        ctx.fillText(parseFloat(x.toPrecision(4)).toString(), px, axeYpx);
    }

    ctx.textAlign = 'right';
    for (let y = Math.ceil(view.yMin / stepY) * stepY; y <= view.yMax; y += stepY) {
        if (Math.abs(y) < stepY * 0.01) continue;
        const py = H - ((y - view.yMin) / yRange) * H;
        ctx.fillText(parseFloat(y.toPrecision(4)).toString(), axeXpx, py + 4);
    }

    // 5. Courbes
    fonctionsAffichees.forEach(fonction => {
        const cssVarName = fonction.cssColor.match(/var\(([^)]+)\)/)?.[1];
        if (!cssVarName) return;

        const curveColor = getCSSVar(cssVarName);

        // ── 5z. Équation implicite F(x,y)=0 (marching squares) ───────────────
        // Tracé d'une ligne de niveau par échantillonnage d'une grille sur la
        // fenêtre visible et extraction des segments via l'algorithme marching
        // squares. Résolution adaptative : on vise ~1 cellule tous les 5 pixels.
        if (fonction.implicit) {
            dessinerImplicite(fonction, curveColor, W, H, xRange, yRange);
            return; // passe à la fonction suivante
        }

        // ── 5a. Ombrage d'intégrale (Integral Shading) ───────────────────────
        // Si la fonction a un attribut `shade: {from, to}`, on remplit le
        // polygone délimité par la courbe et l'axe X entre ces deux bornes,
        // en semi-transparence (globalAlpha 0.25) avec la couleur de la courbe.
        // Le remplissage est fait AVANT le tracé de la ligne pour que celle-ci
        // reste visible par-dessus l'aire colorée.
        if (fonction.shade && typeof fonction.shade.from === 'number' && typeof fonction.shade.to === 'number') {
            const a = Math.min(fonction.shade.from, fonction.shade.to);
            const b = Math.max(fonction.shade.from, fonction.shade.to);

            // Conversion des bornes mathématiques en pixels (clampées à la fenêtre visible)
            const pxA = Math.max(0, Math.min(W, ((a - view.xMin) / xRange) * W));
            const pxB = Math.max(0, Math.min(W, ((b - view.xMin) / xRange) * W));

            // Y pixel de l'axe X (y=0 mathématique), clampé si l'axe n'est pas visible
            let pyAxis;
            if (view.yMin <= 0 && view.yMax >= 0) {
                pyAxis = H - ((0 - view.yMin) / yRange) * H;
            } else if (view.yMin > 0) {
                pyAxis = H; // axe X sous la fenêtre → on remplit vers le bas
            } else {
                pyAxis = 0; // axe X au-dessus → on remplit vers le haut
            }

            ctx.save();
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = curveColor;
            ctx.beginPath();
            ctx.moveTo(pxA, pyAxis);

            // Trace le contour supérieur : suit la courbe de a à b pixel par pixel
            let shadeFirst = true;
            for (let px = pxA; px <= pxB; px += 1) {
                const mathX = view.xMin + (px / W) * xRange;
                if (mathX < a || mathX > b) continue;
                try {
                    const y = fonction.ast.evaluate(buildScope(mathX));
                    if (typeof y !== 'number' || !isFinite(y) || isNaN(y)) continue;
                    const py = H - ((y - view.yMin) / yRange) * H;
                    if (shadeFirst) {
                        ctx.lineTo(px, py);
                        shadeFirst = false;
                    } else {
                        ctx.lineTo(px, py);
                    }
                } catch (e) { /* on saute les points invalides */ }
            }

            // Ferme le polygone en redescendant vers l'axe puis en revenant au point de départ
            ctx.lineTo(pxB, pyAxis);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // ── 5b. Tracé de la ligne de la courbe ───────────────────────────────
        ctx.strokeStyle = curveColor;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.beginPath();

        let wasOut = true;
        let prevPy = null;

        for (let px = 0; px <= W; px++) {
            const mathX = view.xMin + (px / W) * xRange;
            try {
                const scopeLocal = buildScope(mathX);
                const mathY = fonction.ast.evaluate(scopeLocal);

                if (typeof mathY !== 'number' || !isFinite(mathY) || isNaN(mathY)) {
                    wasOut = true; prevPy = null; continue;
                }
                const py = H - ((mathY - view.yMin) / yRange) * H;

                if (prevPy !== null && Math.abs(py - prevPy) > H * 1.5) wasOut = true;
                if (py < -H || py > H * 2) { wasOut = true; prevPy = null; continue; }

                if (wasOut) { ctx.moveTo(px, py); wasOut = false; }
                else        { ctx.lineTo(px, py); }
                prevPy = py;
            } catch (e) {
                wasOut = true; prevPy = null;
            }
        }
        ctx.stroke();
    });

    // 6. Réticule (Capture Spatiale)
    if (cibleExistante) {
        const pxC = ((cibleX - view.xMin) / xRange) * W;
        const pyC = H - ((cibleY - view.yMin) / yRange) * H;

        ctx.strokeStyle = getCSSVar('--text-error');
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(pxC, 0); ctx.lineTo(pxC, H);
        ctx.moveTo(0, pyC); ctx.lineTo(W, pyC);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = getCSSVar('--text-error');
        ctx.beginPath(); ctx.arc(pxC, pyC, 4, 0, 2*Math.PI); ctx.fill();
    }

    // 7. Marqueur Snap-to-Curve (Trace magnétique) ─────────────────────────
    // Quand le curseur est accroché à une courbe, on dessine un cercle
    // lumineux concentrique à la couleur de la courbe. Rendu APRÈS les
    // courbes et le réticule pour être toujours au premier plan.
    if (snapState.active) {
        const pxS = ((snapState.mathX - view.xMin) / xRange) * W;
        const pyS = H - ((snapState.mathY - view.yMin) / yRange) * H;

        const cssVarName = snapState.cssColor.match(/var\(([^)]+)\)/)?.[1];
        const couleur = cssVarName ? getCSSVar(cssVarName) : getCSSVar('--text-neon');

        // Halo lumineux externe (cercle large semi-transparent)
        ctx.fillStyle = couleur;
        ctx.globalAlpha = 0.25;
        ctx.beginPath(); ctx.arc(pxS, pyS, 10, 0, 2*Math.PI); ctx.fill();
        ctx.globalAlpha = 1;

        // Anneau externe net
        ctx.strokeStyle = couleur;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(pxS, pyS, 7, 0, 2*Math.PI); ctx.stroke();

        // Point central plein
        ctx.fillStyle = couleur;
        ctx.beginPath(); ctx.arc(pxS, pyS, 3, 0, 2*Math.PI); ctx.fill();
    }

    // 8. Marqueurs d'analyse (racines et intersections) ────────────────────
    // Dessiné en dernier pour être au premier plan. La fonction interne
    // court-circuite si analyseEnabled=false ou analyseResults vide, donc
    // aucun coût perf si la feature n'est pas active.
    if (typeof drawAnalyseMarkers === 'function') {
        drawAnalyseMarkers(W, H, xRange, yRange);
    }
    // Marqueurs de limites (v5.3) — dessinés par-dessus tout
    if (typeof drawLimMarkers === 'function') {
        drawLimMarkers(W, H, xRange, yRange);
    }
}

// =============================================================================
// [6b] TRACÉ D'ÉQUATIONS IMPLICITES — MARCHING SQUARES
// =============================================================================
// Trace la ligne de niveau F(x,y) = 0 en échantillonnant F sur une grille
// alignée sur la fenêtre visible et en extrayant les segments via l'algorithme
// marching squares. Résolution ~1 cellule tous les 5 pixels (bon compromis
// lisibilité / perf sur la plupart des machines).
//
// Références :
//   https://en.wikipedia.org/wiki/Marching_squares
//
// Les cas de saddle (indices 5 et 10) sont résolus arbitrairement — pour un
// premier jet c'est acceptable ; un raffinement ultérieur pourrait utiliser
// la valeur moyenne des 4 coins pour désambiguïser.
function dessinerImplicite(fonction, curveColor, W, H, xRange, yRange) {
    const cellPx = 5;
    const cols = Math.max(20, Math.floor(W / cellPx));
    const rows = Math.max(20, Math.floor(H / cellPx));
    const dx = xRange / cols;
    const dy = yRange / rows;

    // 1. Échantillonnage de F sur la grille (cols+1)×(rows+1).
    //    On réutilise buildScope() pour hériter du mode angulaire et des
    //    variables utilisateur, puis on injecte y manuellement.
    const N = (cols + 1) * (rows + 1);
    const F = new Float64Array(N);
    const scopeBase = buildScope(0);
    for (let j = 0; j <= rows; j++) {
        const my = view.yMin + j * dy;
        for (let i = 0; i <= cols; i++) {
            const mx = view.xMin + i * dx;
            scopeBase.x = mx;
            scopeBase.y = my;
            try {
                const v = fonction.ast.evaluate(scopeBase);
                F[j * (cols + 1) + i] = (typeof v === 'number' && isFinite(v)) ? v : NaN;
            } catch (e) {
                F[j * (cols + 1) + i] = NaN;
            }
        }
    }

    // 2. Table de marching squares : pour chaque configuration de signes des
    //    4 coins (index 0..15), liste des paires d'arêtes traversées.
    //    Coins : bit0=bottom-left, bit1=bottom-right, bit2=top-right, bit3=top-left
    //    Arêtes : B=bottom, R=right, T=top, L=left
    const TABLE = [
        [],                  // 0
        ['L','B'],           // 1
        ['B','R'],           // 2
        ['L','R'],           // 3
        ['R','T'],           // 4
        ['L','B','R','T'],   // 5 (saddle)
        ['B','T'],           // 6
        ['L','T'],           // 7
        ['L','T'],           // 8
        ['B','T'],           // 9
        ['L','T','B','R'],   // 10 (saddle)
        ['R','T'],           // 11
        ['L','R'],           // 12
        ['B','R'],           // 13
        ['L','B'],           // 14
        []                   // 15
    ];

    // 3. Parcours des cellules et construction des segments.
    ctx.save();
    ctx.strokeStyle = curveColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();

    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            const v00 = F[j * (cols + 1) + i];           // bottom-left
            const v10 = F[j * (cols + 1) + i + 1];       // bottom-right
            const v01 = F[(j + 1) * (cols + 1) + i];     // top-left
            const v11 = F[(j + 1) * (cols + 1) + i + 1]; // top-right

            if (isNaN(v00) || isNaN(v10) || isNaN(v01) || isNaN(v11)) continue;

            const idx =
                (v00 > 0 ? 1 : 0) |
                (v10 > 0 ? 2 : 0) |
                (v11 > 0 ? 4 : 0) |
                (v01 > 0 ? 8 : 0);

            if (idx === 0 || idx === 15) continue;

            // Coordonnées mathématiques des 4 coins de la cellule
            const x0 = view.xMin + i * dx;
            const y0 = view.yMin + j * dy;
            const x1 = x0 + dx;
            const y1 = y0 + dy;

            // Interpolation linéaire du zéro sur un segment [a,b] où f(a)=va, f(b)=vb
            const lerp = (a, b, va, vb) => {
                const denom = vb - va;
                if (Math.abs(denom) < 1e-18) return (a + b) * 0.5;
                return a + (b - a) * (-va) / denom;
            };

            // Calcul à la demande des points de croisement sur chaque arête
            const edgePoint = (edge) => {
                switch (edge) {
                    case 'B': return [lerp(x0, x1, v00, v10), y0];
                    case 'R': return [x1, lerp(y0, y1, v10, v11)];
                    case 'T': return [lerp(x0, x1, v01, v11), y1];
                    case 'L': return [x0, lerp(y0, y1, v00, v01)];
                }
            };

            const segs = TABLE[idx];
            for (let k = 0; k < segs.length; k += 2) {
                const [mx1, my1] = edgePoint(segs[k]);
                const [mx2, my2] = edgePoint(segs[k + 1]);
                const px1 = ((mx1 - view.xMin) / xRange) * W;
                const py1 = H - ((my1 - view.yMin) / yRange) * H;
                const px2 = ((mx2 - view.xMin) / xRange) * W;
                const py2 = H - ((my2 - view.yMin) / yRange) * H;
                ctx.moveTo(px1, py1);
                ctx.lineTo(px2, py2);
            }
        }
    }

    ctx.stroke();
    ctx.restore();
}

// =============================================================================
// [7] INTERACTIONS SOURIS
// =============================================================================
let isDragging = false;
let dragMoved = false; // Différencie clic et glissement
let lastMouseX = 0;
let lastMouseY = 0;

/**
 * Snap-to-Curve : cherche la courbe la plus proche verticalement du curseur.
 *
 * Principe :
 *   1. Convertit la position pixel du curseur en coordonnée mathématique X.
 *   2. Pour chaque courbe affichée, évalue f(x) au X du curseur.
 *   3. Calcule la distance pixel verticale entre le curseur et le point (x,f(x)).
 *   4. Retourne la courbe la plus proche si la distance est sous SNAP_THRESHOLD_PX,
 *      sinon marque snapState.active = false.
 *
 * Appelée à chaque mousemove ET touchmove. Modifie snapState par effet de
 * bord. snapState est ensuite lu par dessiner() pour afficher le marqueur,
 * et par mouseup/touchend pour capturer les coordonnées exactes dans cX/cY.
 *
 * @param {number} cursorPxX  Position X du curseur en pixels (dans le canvas)
 * @param {number} cursorPxY  Position Y du curseur en pixels (dans le canvas)
 */
function findNearestCurvePoint(cursorPxX, cursorPxY) {
    // Court-circuit : si le snap est désactivé par l'utilisateur, on ne fait
    // strictement rien et on s'assure que l'état snap est inactif pour que
    // dessiner() n'affiche pas de marqueur fantôme.
    if (!snapEnabled) {
        snapState.active = false;
        return;
    }

    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    const xRange = view.xMax - view.xMin;
    const yRange = view.yMax - view.yMin;

    const cursorMathX = view.xMin + (cursorPxX / W) * xRange;

    let bestIdx  = -1;
    let bestDist = Infinity;
    let bestY    = 0;

    for (let i = 0; i < fonctionsAffichees.length; i++) {
        const fn = fonctionsAffichees[i];
        try {
            const scopeLocal = buildScope(cursorMathX);
            const y = fn.ast.evaluate(scopeLocal);

            if (typeof y !== 'number' || !isFinite(y) || isNaN(y)) continue;

            // Convertit la valeur mathématique en pixel Y pour calculer la distance
            const pyCurve = H - ((y - view.yMin) / yRange) * H;
            const dist    = Math.abs(pyCurve - cursorPxY);

            if (dist < bestDist) {
                bestDist = dist;
                bestIdx  = i;
                bestY    = y;
            }
        } catch (e) {
            // Erreur d'évaluation (ex : log(-1), division par 0) : on ignore
            // cette courbe pour ce point et on continue avec les autres.
        }
    }

    if (bestIdx !== -1 && bestDist <= SNAP_THRESHOLD_PX) {
        snapState.active      = true;
        snapState.fonctionIdx = bestIdx;
        snapState.mathX       = cursorMathX;
        snapState.mathY       = bestY;
        snapState.cssColor    = fonctionsAffichees[bestIdx].cssColor;
    } else {
        snapState.active = false;
    }
}

function setupMouseEvents() {
    canvas.addEventListener('mousedown', e => {
        isDragging = true; dragMoved = false;
        lastMouseX = e.clientX; lastMouseY = e.clientY;
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
        snapState.active = false; // désactive le snap quand la souris quitte le canvas
        if (coordsText) coordsText.textContent = 'X: ─── | Y: ───';
        requestAnimationFrame(dessiner); // efface le marqueur snap
    });

    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const W = canvas.clientWidth; const H = canvas.clientHeight;
        const mathX = view.xMin + (px / W) * (view.xMax - view.xMin);
        const mathY = view.yMax - (py / H) * (view.yMax - view.yMin);

        if (isDragging) {
            // Mode pan : on n'applique pas le snap pendant un drag, c'est
            // plus ergonomique (le drag doit rester libre et rapide).
            snapState.active = false;
            dragMoved = true;
            const dxPx = e.clientX - lastMouseX;
            const dyPx = e.clientY - lastMouseY;
            const dxMath = (dxPx / W) * (view.xMax - view.xMin);
            const dyMath = (dyPx / H) * (view.yMax - view.yMin);
            view.xMin -= dxMath; view.xMax -= dxMath;
            view.yMin += dyMath; view.yMax += dyMath;
            lastMouseX = e.clientX; lastMouseY = e.clientY;
            if (coordsText) coordsText.textContent = `X: ${mathX.toFixed(4)} | Y: ${mathY.toFixed(4)}`;
            requestAnimationFrame(dessiner);
            return;
        }

        // ── Mode exploration : on tente le snap-to-curve ───────────────────
        findNearestCurvePoint(px, py);

        if (snapState.active) {
            // Le curseur est accroché à une courbe — on affiche les coordonnées
            // exactes de la courbe (pas du curseur) + le nom de la fonction.
            const fn = fonctionsAffichees[snapState.fonctionIdx];
            if (coordsText) {
                coordsText.textContent =
                    `▶ ${fn.nom}(${snapState.mathX.toFixed(4)}) = ${snapState.mathY.toFixed(4)}`;
            }
        } else {
            if (coordsText) coordsText.textContent = `X: ${mathX.toFixed(4)} | Y: ${mathY.toFixed(4)}`;
        }

        // On redessine à chaque mousemove pour rafraîchir le marqueur snap.
        // requestAnimationFrame coalesce naturellement à ~60-144 Hz selon l'écran.
        requestAnimationFrame(dessiner);
    });

    // Capture Spatiale (Click-to-Fetch) — adaptée au snap et à l'analyse
    canvas.addEventListener('mouseup', e => {
        isDragging = false;
        if (!dragMoved) {
            const rect = canvas.getBoundingClientRect();
            const W = canvas.clientWidth; const H = canvas.clientHeight;
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;

            // Priorité 0 : mode LIM actif → poser une limite au x cliqué
            // et court-circuiter toute la chaîne de capture cX/cY habituelle.
            if (limModeEnabled) {
                const xClic = view.xMin + (px / W) * (view.xMax - view.xMin);
                poserLimiteAuClic(xClic);
                inputScreen.focus();
                return;
            }

            // Priorité 1 : point remarquable de l'analyseur (racine/intersection).
            // Si l'utilisateur clique près d'un des cercles lumineux, on capture
            // les coordonnées EXACTES du point remarquable, pas celles du curseur.
            // Cette vérification passe AVANT le snap-to-curve pour que les points
            // d'analyse aient priorité (ils sont plus "importants" qu'un point
            // quelconque sur une courbe).
            const analysePoint = findAnalysePointNear(px, py);
            if (analysePoint) {
                cibleX = analysePoint.x;
                cibleY = analysePoint.y;
                const typeLabel = analysePoint.type === 'root' ? 'RACINE' : 'INTERSECTION';
                const nomLabel  = analysePoint.fnB
                    ? `${analysePoint.fnA} ∩ ${analysePoint.fnB}`
                    : analysePoint.fnA;
                ajouterLog(
                    `🔍 ${typeLabel}`,
                    `${nomLabel} → cX=${cibleX.toFixed(6)}, cY=${cibleY.toFixed(6)}`,
                    analysePoint.cssColor
                );
                scope.cX = cibleX; scope.cY = cibleY; cibleExistante = true;
                dessiner();
                inputScreen.focus();
                return;
            }

            // Priorité 2 : snap-to-curve actif → coordonnées exactes de la courbe
            if (snapState.active) {
                cibleX = snapState.mathX;
                cibleY = snapState.mathY;
                const fn = fonctionsAffichees[snapState.fonctionIdx];
                ajouterLog(
                    "SNAP",
                    `${fn.nom}(${cibleX.toFixed(4)}) = ${cibleY.toFixed(4)} capturé dans cX/cY`,
                    fn.cssColor
                );
            } else {
                // Priorité 3 : capture libre aux coordonnées du curseur
                cibleX = view.xMin + (px / W) * (view.xMax - view.xMin);
                cibleY = view.yMax - (py / H) * (view.yMax - view.yMin);
                ajouterLog("SYS", `Cible libre : cX=${cibleX.toFixed(3)}, cY=${cibleY.toFixed(3)}`, "var(--text-error)");
            }

            scope.cX = cibleX; scope.cY = cibleY; cibleExistante = true;
            dessiner();
        }
        inputScreen.focus();
    });

    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 1.2 : 0.833;
        const rect = canvas.getBoundingClientRect();
        const W = canvas.clientWidth; const H = canvas.clientHeight;
        const px = e.clientX - rect.left; const py = e.clientY - rect.top;

        const mathX = view.xMin + (px / W) * (view.xMax - view.xMin);
        const mathY = view.yMax - (py / H) * (view.yMax - view.yMin);

        const newW = (view.xMax - view.xMin) * factor;
        const newH = (view.yMax - view.yMin) * factor;

        view.xMin = mathX - (px / W) * newW; view.xMax = view.xMin + newW;
        view.yMax = mathY + (py / H) * newH; view.yMin = view.yMax - newH;

        requestAnimationFrame(dessiner);
    }, { passive: false });
}

// =============================================================================
// [8] INTERACTIONS TACTILES
// =============================================================================
let lastTouchDist = null;

function setupTouchEvents() {
    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        if (e.touches.length === 1) {
            isDragging = true; dragMoved = false;
            lastMouseX = e.touches[0].clientX; lastMouseY = e.touches[0].clientY;
            lastTouchDist = null;
        } else if (e.touches.length === 2) {
            isDragging = false;
            lastTouchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        const W = canvas.clientWidth; const H = canvas.clientHeight;
        if (e.touches.length === 1 && isDragging) {
            dragMoved = true;
            const dxPx = e.touches[0].clientX - lastMouseX;
            const dyPx = e.touches[0].clientY - lastMouseY;
            const dxMath = (dxPx / W) * (view.xMax - view.xMin);
            const dyMath = (dyPx / H) * (view.yMax - view.yMin);
            view.xMin -= dxMath; view.xMax -= dxMath;
            view.yMin += dyMath; view.yMax += dyMath;
            lastMouseX = e.touches[0].clientX; lastMouseY = e.touches[0].clientY;
            requestAnimationFrame(dessiner);
        } else if (e.touches.length === 2 && lastTouchDist !== null) {
            const newDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            if (newDist === 0) return;
            const factor = lastTouchDist / newDist;

            const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const rect = canvas.getBoundingClientRect();
            const px = cx - rect.left; const py = cy - rect.top;

            const mathX = view.xMin + (px / W) * (view.xMax - view.xMin);
            const mathY = view.yMax - (py / H) * (view.yMax - view.yMin);
            const newW = (view.xMax - view.xMin) * factor;
            const newH = (view.yMax - view.yMin) * factor;
            view.xMin = mathX - (px / W) * newW; view.xMax = view.xMin + newW;
            view.yMax = mathY + (py / H) * newH; view.yMin = view.yMax - newH;

            lastTouchDist = newDist;
            requestAnimationFrame(dessiner);
        }
    }, { passive: false });

    canvas.addEventListener('touchend', e => {
        isDragging = false; lastTouchDist = null;
        if (e.touches.length === 0 && !dragMoved) {
            const rect = canvas.getBoundingClientRect();
            const W = canvas.clientWidth; const H = canvas.clientHeight;
            const px = e.changedTouches[0].clientX - rect.left;
            const py = e.changedTouches[0].clientY - rect.top;

            // Calcul du snap au moment du tap (touchmove 1-doigt n'est pas
            // appelé dans setupTouchEvents car il est réservé au pan).
            // On appelle explicitement findNearestCurvePoint ici pour que
            // le tap soit "snappable" vers la courbe la plus proche.
            findNearestCurvePoint(px, py);

            if (snapState.active) {
                // Tap-to-fetch snappé : coordonnées exactes de la courbe
                cibleX = snapState.mathX;
                cibleY = snapState.mathY;
                const fn = fonctionsAffichees[snapState.fonctionIdx];
                ajouterLog(
                    "SNAP",
                    `${fn.nom}(${cibleX.toFixed(4)}) = ${cibleY.toFixed(4)} capturé dans cX/cY`,
                    fn.cssColor
                );
            } else {
                // Tap-to-fetch libre : coordonnées brutes du doigt
                cibleX = view.xMin + (px / W) * (view.xMax - view.xMin);
                cibleY = view.yMax - (py / H) * (view.yMax - view.yMin);
                ajouterLog("SYS", `Cible capturée : cX=${cibleX.toFixed(3)}`, "var(--text-error)");
            }
            scope.cX = cibleX; scope.cY = cibleY; cibleExistante = true;
            dessiner();
        }
    }, { passive: false });

    canvas.addEventListener('touchcancel', () => { isDragging = false; lastTouchDist = null; }, { passive: false });
}

// =============================================================================
// [9] RACCOURCIS CLAVIER
// =============================================================================
//
// Le handler `keydown` global gère :
//   1. Escape global       → ferme toute modale ouverte (même hors input focus)
//   2. Si l'input est focus :
//        a. Enter            → executer()
//        b. Escape           → vide la saisie
//        c. ↑ / ↓            → navigation dans inputHistory
//        d. Profil clavier   → interception des caractères Unicode math
//                              (²³ × ÷ π √ ∛ ∞ ≤ ≥ ≠ etc.) et conversion en
//                              syntaxe ASCII via KEYBOARD_PROFILES.
//        e. Touche morte ^   → si le profil l'a activé (deadCaret: true),
//                              insère ^ immédiatement au lieu d'attendre la
//                              lettre suivante (utile sur AZERTY-BE/FR où
//                              ^ est une dead key par défaut).
//
// L'interception des caractères mappés se fait AVANT que le navigateur n'ait
// le temps d'insérer le caractère brut, grâce à e.preventDefault().
// -----------------------------------------------------------------------------
function setupKeyboardEvents() {
    document.addEventListener('keydown', e => {

        // ── Escape global : ferme toute modale ouverte ──────────────────────
        if (e.key === 'Escape') {
            // Quitter le mode LIM s'il est actif (v5.3)
            if (limModeEnabled) {
                setLimMode(false);
                return;
            }
            document.querySelectorAll('.modal-overlay').forEach(m => {
                if (m.style.display === 'flex') fermerModal(m.id);
            });
        }

        // À partir d'ici, on ne traite que les touches frappées DANS le champ
        // de saisie principal — pas dans les modales, pas dans les <select>, etc.
        if (document.activeElement !== inputScreen) return;

        // ── Touches de navigation et d'action standard ──────────────────────
        if (e.key === 'Enter') {
            e.preventDefault(); executer();
            return;
        }
        if (e.key === 'Escape') {
            inputScreen.value = '';
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (historyIndex < inputHistory.length - 1) {
                historyIndex++; inputScreen.value = inputHistory[historyIndex];
                setTimeout(() => inputScreen.setSelectionRange(inputScreen.value.length, inputScreen.value.length), 0);
            }
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex > 0) {
                historyIndex--; inputScreen.value = inputHistory[historyIndex];
            } else {
                historyIndex = -1; inputScreen.value = '';
            }
            return;
        }

        // ── Interception du profil clavier actif ────────────────────────────
        // On consulte la map du profil courant. Si la touche pressée produit
        // un caractère mappé, on bloque l'insertion native et on injecte la
        // chaîne ASCII équivalente via inserer() (qui vit dans ui.js).
        const profile = KEYBOARD_PROFILES[currentKeyboardProfile];
        if (!profile) return; // garde-fou : profil corrompu ou inconnu

        // Touche morte ^ : sur AZERTY-BE/FR, taper ^ ne produit rien tant que
        // l'utilisateur n'a pas tapé une lettre derrière (â, ê, î…). Pour les
        // maths c'est pénible : on veut x^2, pas x^â2. Si le profil active
        // deadCaret, on intercepte l'événement Dead et on injecte ^ direct.
        if (profile.deadCaret && e.key === 'Dead' && e.code === 'BracketLeft') {
            // BracketLeft est le code physique de la touche ^ sur AZERTY-BE/FR
            // (la touche située à droite de "p"). On exclut les autres touches
            // mortes (tréma, accent grave, etc.) qui pourraient avoir leur
            // utilité ailleurs.
            e.preventDefault();
            inserer('^');
            return;
        }

        // Mapping des caractères Unicode math → ASCII math.js
        // e.key contient le caractère final tel qu'il sera inséré (après
        // application des éventuelles touches mortes par l'OS), donc taper ²
        // sur AZERTY-BE produit bien e.key === '²'.
        if (Object.prototype.hasOwnProperty.call(profile.map, e.key)) {
            e.preventDefault();
            inserer(profile.map[e.key]);
            return;
        }
    });
}

// =============================================================================
// [10] GESTION DU PROFIL CLAVIER ACTIF
// =============================================================================
//
// Ces fonctions sont exposées globalement pour être appelables :
//   - depuis ui.js (handler du bouton ⌨ KBD et du <select> du modal)
//   - depuis index.html (onclick inline si jamais)
//   - depuis la console développeur pour debug
//
// Trois opérations principales :
//   • detectKeyboardProfile()  → devine le profil au démarrage via navigator.language
//   • loadKeyboardProfile()    → applique le profil persisté ou auto-détecté
//   • setKeyboardProfile(id)   → change le profil + persiste + notifie l'UI
//   • cycleKeyboardProfile()   → passe au profil suivant (pour le bouton rapide)
// -----------------------------------------------------------------------------

/**
 * Devine un profil clavier raisonnable à partir de navigator.language.
 * Stratégie volontairement simple : on regarde le code BCP-47.
 *
 *   "fr-BE"            → 'be'
 *   "fr", "fr-FR",
 *   "fr-CA", "fr-CH"   → 'fr'
 *   tout le reste      → 'universal'
 *
 * Note : navigator.language reflète la langue préférée de l'utilisateur, pas
 * son layout physique. C'est pourquoi le résultat ne fait que SUGGÉRER un
 * profil — l'utilisateur peut le surcharger via le bouton ou le menu.
 */
function detectKeyboardProfile() {
    const lang = (navigator.language || 'en').toLowerCase();
    if (lang === 'fr-be' || lang.startsWith('nl-be')) return 'be';
    if (lang.startsWith('fr')) return 'fr';
    return 'universal';
}

/**
 * Charge le profil clavier au démarrage.
 *
 * Ordre de priorité :
 *   1. Valeur persistée dans localStorage (choix explicite de l'utilisateur)
 *   2. Auto-détection via navigator.language
 *   3. Fallback 'universal'
 *
 * Cette fonction est appelée une seule fois, depuis le DOMContentLoaded.
 * Elle ne déclenche PAS de log dans l'historique pour éviter de polluer
 * le démarrage — le log de bienvenue s'occupe d'annoncer le profil actif.
 */
function loadKeyboardProfile() {
    let chosen = null;
    try {
        chosen = localStorage.getItem(KBD_STORAGE_KEY);
    } catch (e) {
        // localStorage peut être bloqué (mode privé strict, quotas, etc.).
        // Dans ce cas on retombe silencieusement sur l'auto-détection.
    }

    if (!chosen || !KEYBOARD_PROFILES[chosen]) {
        chosen = detectKeyboardProfile();
    }

    currentKeyboardProfile = chosen;
    // Met à jour l'UI passive (le <select> du modal et le label du bouton)
    // si la fonction d'UI est déjà disponible (elle l'est car ui.js est
    // chargé avant engine.js dans index.html).
    if (typeof refreshKeyboardProfileUI === 'function') {
        refreshKeyboardProfileUI();
    }
}

/**
 * Change le profil clavier actif et persiste le choix dans localStorage.
 *
 * @param {string} id  Identifiant d'un profil dans KEYBOARD_PROFILES
 *                     ('universal', 'be', 'fr', …)
 * @param {boolean} silent  Si vrai, ne logge rien (utilisé pour les changements
 *                          internes / programmatiques sans feedback utilisateur)
 */
function setKeyboardProfile(id, silent = false) {
    if (!KEYBOARD_PROFILES[id]) {
        ajouterLog('⚠ Profil clavier', `"${id}" inconnu — ignoré`, 'var(--text-error)');
        return;
    }

    currentKeyboardProfile = id;

    try {
        localStorage.setItem(KBD_STORAGE_KEY, id);
    } catch (e) {
        // Idem : si la persistance échoue, on continue en RAM.
    }

    // Synchronise les éléments d'UI passifs (label bouton + select modal).
    if (typeof refreshKeyboardProfileUI === 'function') {
        refreshKeyboardProfileUI();
    }

    if (!silent) {
        const profile = KEYBOARD_PROFILES[id];
        ajouterLog(
            'Profil clavier',
            `→ ${profile.flag} ${profile.name}`,
            'var(--text-neon)'
        );
    }

    if (inputScreen) inputScreen.focus();
}

/**
 * Cycle au profil suivant dans l'ordre de déclaration de KEYBOARD_PROFILES.
 * Appelée par le bouton ⌨ KBD du clavier système (cycle rapide).
 */
function cycleKeyboardProfile() {
    const ids = Object.keys(KEYBOARD_PROFILES);
    const idx = ids.indexOf(currentKeyboardProfile);
    const next = ids[(idx + 1) % ids.length];
    setKeyboardProfile(next);
}

// =============================================================================
// [11] POIGNÉE DE REDIMENSIONNEMENT DE L'ÉCRAN
// =============================================================================
//
// Permet à l'utilisateur d'ajuster dynamiquement la hauteur du screen-module
// (zone de graphe + console) via une barre de glissement horizontale située
// entre le screen-module et le keyboard-module. Le reste de l'espace est
// automatiquement attribué au clavier.
//
// Principe technique :
//   1. La hauteur du screen-module est pilotée par la CSS variable
//      --screen-height, définie sur l'élément racine <html> (ou sur le
//      screen-module lui-même via style inline). Valeur par défaut : 380px.
//   2. Au mousedown/touchstart sur .resize-handle, on capture la position Y
//      de départ et la hauteur courante, puis on attache des handlers
//      mousemove/touchmove globaux qui mettent à jour --screen-height en
//      temps réel selon le delta Y.
//   3. Au mouseup/touchend, on détache les handlers et on persiste la
//      hauteur finale dans localStorage (clé qn:screenHeight).
//   4. À chaque mise à jour de hauteur, on rappelle resizeCanvas() pour
//      recalibrer le Canvas HiDPI — SANS cette étape, le canvas serait
//      étiré de manière pixelisée après chaque drag.
//
// Bornes : min 200px, max 75% de la hauteur de fenêtre (calé sur le CSS
// pour rester cohérent avec max-height: 75vh du .screen-module).
// -----------------------------------------------------------------------------

const SCREEN_HEIGHT_STORAGE_KEY = 'qn:screenHeight';
const SCREEN_HEIGHT_MIN = 200;

let resizeStartY = 0;
let resizeStartHeight = 0;
let isResizing = false;

/**
 * Applique une hauteur au screen-module et recalibre le canvas.
 * Ne persiste PAS : la persistance est faite uniquement à la fin du drag
 * pour éviter de spammer localStorage à chaque mousemove.
 */
function applyScreenHeight(h) {
    const maxH = window.innerHeight * 0.75;
    h = Math.max(SCREEN_HEIGHT_MIN, Math.min(maxH, h));
    const screenEl = document.querySelector('.screen-module');
    if (screenEl) {
        screenEl.style.height = h + 'px';
    }
    // Le canvas doit être recalibré pour rester net en HiDPI.
    if (typeof resizeCanvas === 'function') resizeCanvas();
}

/**
 * Charge la hauteur persistée depuis localStorage au démarrage.
 * Si aucune valeur n'est stockée, on conserve la valeur CSS par défaut
 * (--screen-height: 380px définie dans la feuille de style).
 */
function loadScreenHeight() {
    let stored = null;
    try {
        stored = localStorage.getItem(SCREEN_HEIGHT_STORAGE_KEY);
    } catch (e) { /* localStorage indisponible */ }

    if (stored) {
        const h = parseInt(stored, 10);
        if (!isNaN(h) && h >= SCREEN_HEIGHT_MIN) {
            applyScreenHeight(h);
        }
    }
}

/**
 * Installe les gestionnaires d'événements de la poignée de resize.
 * Appelée une fois au démarrage depuis le DOMContentLoaded.
 */
function setupResizeHandle() {
    const handle = document.getElementById('resizeHandle');
    const screenEl = document.querySelector('.screen-module');
    if (!handle || !screenEl) return;

    // ── Démarrage du drag (souris) ──────────────────────────────────────────
    const onMouseDown = e => {
        e.preventDefault();
        isResizing = true;
        resizeStartY = e.clientY;
        resizeStartHeight = screenEl.getBoundingClientRect().height;
        handle.classList.add('active');
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = e => {
        if (!isResizing) return;
        const delta = e.clientY - resizeStartY;
        applyScreenHeight(resizeStartHeight + delta);
    };

    const onMouseUp = () => {
        if (!isResizing) return;
        isResizing = false;
        handle.classList.remove('active');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        // Persiste la hauteur finale
        try {
            const h = Math.round(screenEl.getBoundingClientRect().height);
            localStorage.setItem(SCREEN_HEIGHT_STORAGE_KEY, String(h));
        } catch (e) { /* silencieux */ }
    };

    // ── Démarrage du drag (tactile) ─────────────────────────────────────────
    const onTouchStart = e => {
        if (e.touches.length !== 1) return;
        e.preventDefault();
        isResizing = true;
        resizeStartY = e.touches[0].clientY;
        resizeStartHeight = screenEl.getBoundingClientRect().height;
        handle.classList.add('active');
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
        document.addEventListener('touchcancel', onTouchEnd);
    };

    const onTouchMove = e => {
        if (!isResizing || e.touches.length !== 1) return;
        e.preventDefault();
        const delta = e.touches[0].clientY - resizeStartY;
        applyScreenHeight(resizeStartHeight + delta);
    };

    const onTouchEnd = () => {
        if (!isResizing) return;
        isResizing = false;
        handle.classList.remove('active');
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
        document.removeEventListener('touchcancel', onTouchEnd);
        try {
            const h = Math.round(screenEl.getBoundingClientRect().height);
            localStorage.setItem(SCREEN_HEIGHT_STORAGE_KEY, String(h));
        } catch (e) { /* silencieux */ }
    };

    handle.addEventListener('mousedown', onMouseDown);
    handle.addEventListener('touchstart', onTouchStart, { passive: false });

    // Double-clic = reset à la hauteur par défaut (380px)
    handle.addEventListener('dblclick', () => {
        applyScreenHeight(380);
        try {
            localStorage.removeItem(SCREEN_HEIGHT_STORAGE_KEY);
        } catch (e) { /* silencieux */ }
        ajouterLog('Écran', 'Hauteur réinitialisée (380px)', 'var(--text-dim)');
    });
}

// =============================================================================
// [12] EXPORT PNG & URL D'ÉTAT PARTAGEABLE (v4.2+)
// =============================================================================
//
// Deux fonctionnalités d'export complémentaires pour les ingénieurs et
// étudiants qui ont besoin de sauvegarder ou partager leurs travaux :
//
//   1. exportPNG()
//      Génère un fichier .png haute résolution du canvas courant et déclenche
//      son téléchargement automatique. Le canvas étant déjà en HiDPI
//      (devicePixelRatio × taille logique), le PNG sortira nativement à la
//      résolution physique de l'écran de l'utilisateur. Fond opaque du thème.
//
//      Nom de fichier généré : quantum-nova_YYYYMMDD_HHMMSS.png
//
//      Le canvas contient déjà tout ce qu'il faut : grille, axes, labels,
//      courbes, ombrages d'intégrales, marqueur de capture spatiale, marqueur
//      de snap. Les overlays DOM (input, log, légende) sont hors canvas et
//      donc naturellement exclus de l'export — pas besoin de les masquer.
//
//   2. saveStateToURL() / loadStateFromURL()
//      Encode l'état complet de travail (fonctions définies, variables du
//      scope, thème actif, fenêtre de vue, mode angulaire) dans le query
//      string de l'URL. L'URL résultante peut être envoyée à un collègue
//      qui verra exactement le même graphique en l'ouvrant.
//
//      Paramètres URL utilisés (encodés en URIComponent) :
//        f1, f2, f3…   : fonctions sous forme "nom=expr" (ex : f1=f%3Dsin(x))
//        v1, v2, v3…   : variables scope sous forme "nom=valeur"
//        theme         : identifiant du thème (cyber|light|phosphor|plasma)
//        angle         : 'rad' ou 'deg'
//        view          : fenêtre xMin,xMax,yMin,yMax séparés par virgules
//        widget        : 1 si ouverture en mode widget popup (géré par ui.js)
//
//      La commande meta `share` copie l'URL courante dans le presse-papier.
//      La commande meta `export` déclenche le téléchargement PNG.
//      Le bouton 📸 EXP de la barre système appelle exportPNG().
// -----------------------------------------------------------------------------

/**
 * Construit un nom de fichier horodaté pour l'export PNG.
 * Format : quantum-nova_YYYYMMDD_HHMMSS.png
 */
function buildExportFilename() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const ymd = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const hms = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    return `quantum-nova_${ymd}_${hms}.png`;
}

/**
 * Exporte le canvas courant en PNG et déclenche le téléchargement.
 *
 * Utilise canvas.toBlob() qui est asynchrone (plus efficace en mémoire que
 * toDataURL pour les grandes images). Un <a download> éphémère est créé,
 * cliqué programmatiquement, puis révoqué.
 *
 * Le canvas est en HiDPI → le PNG aura la résolution physique (ex : 1520×760
 * sur un MacBook Retina au lieu de 760×380 logique).
 */
function exportPNG() {
    if (!canvas) {
        ajouterLog('⚠ Export', 'Canvas indisponible', 'var(--text-error)');
        return;
    }

    // Avant d'exporter, on force un redessin synchrone pour être sûr que le
    // canvas reflète bien l'état courant (au cas où un pan/zoom serait en
    // cours via requestAnimationFrame qui ne serait pas encore exécuté).
    dessiner();

    const filename = buildExportFilename();

    try {
        canvas.toBlob(blob => {
            if (!blob) {
                ajouterLog('⚠ Export', 'toBlob a renvoyé null', 'var(--text-error)');
                return;
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            // Révocation différée pour laisser le temps au navigateur d'amorcer
            // le téléchargement avant de libérer l'URL blob.
            setTimeout(() => URL.revokeObjectURL(url), 1000);

            ajouterLog('📸 Export PNG', `→ ${filename} (${(blob.size / 1024).toFixed(1)} Ko)`, 'var(--text-success)');
        }, 'image/png');
    } catch (e) {
        ajouterLog('⚠ Export', `Erreur : ${e.message}`, 'var(--text-error)');
    }
}

/**
 * Encode l'état de travail courant dans une URL partageable.
 *
 * Parcourt fonctionsAffichees, scope, themes, angleMode, view et construit
 * un URLSearchParams. Retourne l'URL complète (avec origine et pathname).
 *
 * Note : les variables du scope dont la valeur n'est pas un nombre simple
 * (matrices, nombres complexes, chaînes) sont volontairement IGNORÉES pour
 * éviter de bloater l'URL. Seules les scalaires primitifs sont exportés.
 */
function saveStateToURL() {
    const params = new URLSearchParams();

    // ── Fonctions définies ──────────────────────────────────────────────────
    // Format : f1=nom=expression (séparateur = URL-encodé)
    fonctionsAffichees.forEach((fn, i) => {
        params.set(`f${i + 1}`, `${fn.nom}=${fn.brute}`);
    });

    // ── Variables scalaires du scope ────────────────────────────────────────
    // On exclut cX/cY (capture spatiale volatile) et on garde uniquement les
    // valeurs scalaires sérialisables sans ambiguïté.
    let varIdx = 1;
    for (const [key, val] of Object.entries(scope)) {
        if (key === 'cX' || key === 'cY') continue;
        if (typeof val !== 'number' || !isFinite(val)) continue;
        params.set(`v${varIdx++}`, `${key}=${val}`);
    }

    // ── Préférences d'affichage ─────────────────────────────────────────────
    params.set('theme', themes[currentThemeIndex] || 'light');
    params.set('angle', angleMode);
    params.set('view',  `${view.xMin},${view.xMax},${view.yMin},${view.yMax}`);

    const base = location.origin + location.pathname;
    return `${base}?${params.toString()}`;
}

/**
 * Lit les paramètres URL au démarrage et restaure l'état correspondant.
 *
 * Appelée UNE SEULE fois depuis le DOMContentLoaded, APRÈS l'initialisation
 * du canvas et du scope mais AVANT le premier dessiner(). Si aucun paramètre
 * d'état n'est présent dans l'URL, la fonction ne fait rien.
 *
 * Erreurs tolérées : une expression mal formée ou une variable non parsable
 * est ignorée silencieusement — on ne veut pas bloquer le chargement pour
 * une URL un peu cassée.
 */
function loadStateFromURL() {
    let params;
    try {
        params = new URLSearchParams(location.search);
    } catch (e) {
        return; // URLSearchParams indisponible
    }

    // Si aucun paramètre d'état (hors widget) n'est présent, on sort.
    const hasState = ['theme', 'angle', 'view', 'f1', 'v1'].some(k => params.has(k));
    if (!hasState) return;

    let restoredCount = 0;

    // ── Restauration du thème ───────────────────────────────────────────────
    const theme = params.get('theme');
    if (theme && typeof setTheme === 'function' && themes.indexOf(theme) !== -1) {
        setTheme(theme, true); // silent
        restoredCount++;
    }

    // ── Restauration du mode angulaire ──────────────────────────────────────
    const angle = params.get('angle');
    if (angle === 'deg' && angleMode === 'rad') {
        toggleAngleMode();
        restoredCount++;
    } else if (angle === 'rad' && angleMode === 'deg') {
        toggleAngleMode();
        restoredCount++;
    }

    // ── Restauration de la fenêtre de vue ───────────────────────────────────
    const viewStr = params.get('view');
    if (viewStr) {
        const parts = viewStr.split(',').map(parseFloat);
        if (parts.length === 4 && parts.every(n => isFinite(n))) {
            view.xMin = parts[0]; view.xMax = parts[1];
            view.yMin = parts[2]; view.yMax = parts[3];
            restoredCount++;
        }
    }

    // ── Restauration des variables scope ────────────────────────────────────
    for (let i = 1; i <= 20; i++) {
        const raw = params.get(`v${i}`);
        if (!raw) break;
        const eq = raw.indexOf('=');
        if (eq === -1) continue;
        const name = raw.substring(0, eq);
        const val  = parseFloat(raw.substring(eq + 1));
        if (name && isFinite(val)) {
            scope[name] = val;
            restoredCount++;
        }
    }

    // ── Restauration des fonctions (APRÈS les variables, car les fonctions
    // peuvent y faire référence) ────────────────────────────────────────────
    for (let i = 1; i <= 20; i++) {
        const raw = params.get(`f${i}`);
        if (!raw) break;
        const eq = raw.indexOf('=');
        if (eq === -1) continue;
        const nom  = raw.substring(0, eq).trim();
        const brut = raw.substring(eq + 1).trim();
        if (!nom || !brut) continue;
        try {
            const noeudCompile = math.compile(brut);
            const numCouleur = (fonctionsAffichees.length % 4) + 1;
            fonctionsAffichees.push({
                nom: nom,
                ast: noeudCompile,
                brute: brut,
                cssColor: `var(--curve-${numCouleur})`
            });
            restoredCount++;
        } catch (e) {
            // Expression non parsable : on ignore silencieusement
        }
    }

    if (restoredCount > 0) {
        ajouterLog(
            '🔗 État restauré',
            `${restoredCount} éléments chargés depuis l'URL partagée`,
            'var(--text-neon)'
        );
        if (typeof updateLegende === 'function') updateLegende();
        dessiner();
    }
}

/**
 * Copie l'URL d'état courante dans le presse-papier du navigateur.
 * Utilisée par la commande meta `share`.
 *
 * Note : navigator.clipboard.writeText nécessite HTTPS (ou localhost) et
 * un contexte sécurisé. En cas d'échec, on affiche l'URL dans le log pour
 * que l'utilisateur puisse la copier manuellement.
 */
function shareStateURL() {
    const url = saveStateToURL();

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(
            () => ajouterLog('🔗 Partage', 'URL copiée dans le presse-papier', 'var(--text-success)'),
            () => ajouterLog('🔗 Partage', url, 'var(--text-neon)')
        );
    } else {
        // Fallback : on affiche l'URL, l'utilisateur la copie à la main
        ajouterLog('🔗 Partage', url, 'var(--text-neon)');
    }
}

// =============================================================================
// [13] VIBRATION HAPTIQUE & PRÉFÉRENCES INTERACTION (v4.2+)
// =============================================================================
//
// Cette section gère :
//
//   1. Le retour haptique (vibration) sur les clics de touches du clavier
//      visuel, via l'API navigator.vibrate(). Uniquement supporté sur les
//      appareils tactiles Android (Chrome, Firefox). iOS Safari ignore
//      l'appel silencieusement — pas d'erreur.
//
//   2. Le chargement des préférences d'interaction depuis localStorage :
//        - qn:snap     → Snap-to-Curve activé/désactivé
//        - qn:vibrate  → Vibration haptique activée/désactivée
//
//   3. Les fonctions setSnap() et setVibrate() exposées pour les commandes
//      meta (snap on|off / vibrate on|off) et l'UI.
// -----------------------------------------------------------------------------

/**
 * Déclenche une micro-vibration haptique sur les devices qui supportent l'API.
 * Appelée par ui.js à chaque clic sur une touche du clavier visuel via
 * l'événement pointerdown délégué sur .key.
 *
 * @param {number} duration  Durée en millisecondes (défaut 5 = vibration très brève)
 */
function hapticTap(duration = 5) {
    if (!vibrationEnabled) return;
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
        navigator.vibrate(duration);
    } catch (e) {
        // API présente mais bloquée (certaines policies de sécurité) — silencieux
    }
}

/**
 * Active ou désactive le Snap-to-Curve et persiste le choix.
 * @param {boolean} on
 * @param {boolean} silent  Si vrai, pas de log
 */
function setSnap(on, silent = false) {
    snapEnabled = !!on;
    if (!snapEnabled) snapState.active = false;
    try { localStorage.setItem(SNAP_STORAGE_KEY, snapEnabled ? '1' : '0'); }
    catch (e) { /* silencieux */ }
    if (!silent) {
        ajouterLog(
            '🎯 Snap-to-Curve',
            snapEnabled ? 'Activé (aimantation des courbes)' : 'Désactivé (coordonnées brutes)',
            'var(--text-neon)'
        );
    }
    if (typeof dessiner === 'function') dessiner();
}

/**
 * Active ou désactive le retour haptique et persiste le choix.
 * @param {boolean} on
 * @param {boolean} silent
 */
function setVibrate(on, silent = false) {
    vibrationEnabled = !!on;
    try { localStorage.setItem(VIBRATE_STORAGE_KEY, vibrationEnabled ? '1' : '0'); }
    catch (e) { /* silencieux */ }
    if (!silent) {
        ajouterLog(
            '📳 Vibration',
            vibrationEnabled ? 'Activée (retour haptique au clic)' : 'Désactivée',
            'var(--text-neon)'
        );
    }
    // Test immédiat si on vient d'activer
    if (vibrationEnabled) hapticTap(10);
}

/**
 * Charge les préférences snap/vibrate depuis localStorage au démarrage.
 * Appelée une fois depuis le DOMContentLoaded.
 */
function loadInteractionPreferences() {
    try {
        const s = localStorage.getItem(SNAP_STORAGE_KEY);
        if (s !== null) snapEnabled = (s === '1');

        const v = localStorage.getItem(VIBRATE_STORAGE_KEY);
        if (v !== null) vibrationEnabled = (v === '1');

        const a = localStorage.getItem(ANALYSE_STORAGE_KEY);
        if (a !== null) analyseEnabled = (a === '1');
    } catch (e) {
        // localStorage indisponible : on garde les valeurs par défaut
    }
}

// =============================================================================
// [14] DÉTECTEUR DE RACINES ET INTERSECTIONS (Math Analyst) — v4.2+
// =============================================================================
//
//  ╔═══════════════════════════════════════════════════════════════════════╗
//  ║                       ANALYSEUR MATHÉMATIQUE                          ║
//  ║                                                                       ║
//  ║   Détection automatique des points remarquables des courbes tracées : ║
//  ║                                                                       ║
//  ║     • RACINES       : f(x) = 0   (la courbe croise l'axe X)           ║
//  ║     • INTERSECTIONS : f(x) = g(x) (deux courbes se croisent)          ║
//  ║                                                                       ║
//  ║   Les points trouvés apparaissent comme de petits cercles lumineux    ║
//  ║   sur le canvas. Un clic sur un point capture ses coordonnées exactes ║
//  ║   dans les variables cX / cY (capture spatiale enrichie).             ║
//  ╚═══════════════════════════════════════════════════════════════════════╝
//
// PHILOSOPHIE :
// Cette feature est **désactivée par défaut** pour préserver les perfs du
// rendu 144Hz lors des pan/zoom intensifs. L'utilisateur l'active :
//   • via le bouton 🔍 ANA de la barre système (toggle persistant)
//   • via la commande texte `analyse` ou `racines` (force un recalcul)
//
// ALGORITHME DE DÉTECTION DES RACINES :
// 1. Balayage de l'axe X visible avec N_SAMPLES échantillons (800 par défaut)
// 2. Pour chaque segment [x_i, x_{i+1}], on évalue f aux deux bornes
// 3. Si sign(f(x_i)) ≠ sign(f(x_{i+1})) → une racine existe dans le segment
//    (théorème des valeurs intermédiaires pour les fonctions continues)
// 4. Raffinement par BISSECTION : on divise le segment en deux de manière
//    itérative en gardant la moitié qui contient le changement de signe,
//    jusqu'à convergence sous une tolérance de 1e-10 ou 40 itérations max
// 5. Le résultat est stocké dans analyseResults
//
// ALGORITHME DE DÉTECTION DES INTERSECTIONS :
// Identique au détecteur de racines, mais appliqué à la fonction auxiliaire
// h(x) = f(x) - g(x). Une racine de h correspond à un point où f(x) = g(x),
// c'est-à-dire une intersection entre les courbes de f et g.
// Pour N courbes affichées, on examine toutes les paires (i, j) avec i<j,
// soit C(N, 2) = N*(N-1)/2 combinaisons.
//
// GESTION DES ASYMPTOTES ET DISCONTINUITÉS :
// Un changement de signe autour d'une asymptote verticale (ex : tan(π/2))
// produit un faux positif. On filtre ces cas en vérifiant que la valeur de f
// au point trouvé reste raisonnablement proche de zéro (|f(racine)| < 1e-4).
//
// COÛT CPU :
// Pour N courbes et S échantillons : N*S évaluations pour les racines +
// C(N,2)*S pour les intersections + bissection (jusqu'à 40 iter par point).
// Pour 3 courbes × 800 échantillons on a environ 5000-6000 évaluations
// math.js par analyse. À 50 μs par évaluation, ça fait 250-300 ms de calcul.
// Acceptable en déclenchement manuel, mais incompatible avec un recalcul
// à chaque frame de pan — d'où le déclenchement à la demande uniquement.
// -----------------------------------------------------------------------------

const ANALYSE_STORAGE_KEY = 'qn:analyse';
const ANALYSE_SAMPLES     = 800;     // Nombre d'échantillons pour le balayage initial
const ANALYSE_BISSECT_TOL = 1e-10;   // Tolérance de convergence de la bissection
const ANALYSE_BISSECT_MAX = 40;      // Itérations max de bissection (garde-fou)
const ANALYSE_ZERO_TOL    = 1e-4;    // |f(racine)| en-dessous duquel on accepte la racine
const ANALYSE_CLICK_RADIUS_PX = 12;  // Rayon en pixels pour qu'un clic capture un point

let analyseEnabled = false;  // OFF par défaut pour préserver les perfs
let analyseResults = [];     // Points remarquables trouvés
// Format d'une entrée :
//   { type: 'root'|'intersection', x: Number, y: Number,
//     fnA: String, fnB: String|null, cssColor: String }

// ── LIMITES (v5.3) ────────────────────────────────────────────────────────
// limModeEnabled : quand true, le clic sur le canvas pose une limite au lieu
//                  de capturer cX/cY. Toggle via le bouton Δ LIM ou Échap.
// limMarkers     : liste persistante des limites posées par l'utilisateur.
//                  Chaque marker = { x, fnName, cssColor, result }
//                  où result est l'objet retourné par computeLimit().
//                  Persiste jusqu'à effacerGraphe() ou purgerMemoire().
let limModeEnabled = false;
let limMarkers = [];

/**
 * Raffinement par bissection d'une racine dans [a, b] où g(a) et g(b) sont
 * de signes opposés. Retourne l'abscisse de la racine avec tolérance tol,
 * ou NaN si la fonction n'est pas évaluable quelque part dans l'intervalle.
 *
 * @param {Function} g    Fonction scalaire à zéro rechercher : x → number
 * @param {number}   a    Borne gauche de l'intervalle
 * @param {number}   b    Borne droite
 * @param {number}   tol  Tolérance (écart |b - a| à atteindre)
 * @param {number}   maxIter  Nombre maximal d'itérations
 * @returns {number} Abscisse raffinée, ou NaN en cas d'échec
 */
function bissection(g, a, b, tol = ANALYSE_BISSECT_TOL, maxIter = ANALYSE_BISSECT_MAX) {
    let ga, gb;
    try { ga = g(a); gb = g(b); } catch (e) { return NaN; }
    if (!isFinite(ga) || !isFinite(gb)) return NaN;
    if (ga === 0) return a;
    if (gb === 0) return b;
    if (Math.sign(ga) === Math.sign(gb)) return NaN; // pas de changement de signe

    let lo = a, hi = b, glo = ga;
    for (let iter = 0; iter < maxIter; iter++) {
        const mid = (lo + hi) / 2;
        let gmid;
        try { gmid = g(mid); } catch (e) { return NaN; }
        if (!isFinite(gmid)) return NaN;

        if (Math.abs(hi - lo) < tol || gmid === 0) return mid;

        if (Math.sign(gmid) === Math.sign(glo)) {
            lo = mid; glo = gmid;
        } else {
            hi = mid;
        }
    }
    return (lo + hi) / 2;
}

/**
 * Exécute l'analyse complète : détection des racines et des intersections
 * pour toutes les courbes affichées, dans la fenêtre de vue courante.
 * Remplit analyseResults avec les points trouvés et redessine le canvas.
 *
 * Peut être appelée :
 *   - automatiquement quand analyseEnabled est activé (via setAnalyse(true))
 *   - manuellement via la commande texte `analyse` ou `racines`
 *   - après un pan/zoom si l'utilisateur a explicitement demandé un rafraîchissement
 */
function analyseCurves() {
    analyseResults = [];

    if (fonctionsAffichees.length === 0) {
        ajouterLog('🔍 Analyse', 'Aucune courbe à analyser', 'var(--text-warn)');
        return;
    }

    const xMin = view.xMin;
    const xMax = view.xMax;
    const step = (xMax - xMin) / ANALYSE_SAMPLES;

    // Helper : évaluer f(x) dans le scope actuel (avec support RAD/DEG)
    const evalAt = (fn, x) => {
        const s = buildScope(x);
        return fn.ast.evaluate(s);
    };

    // ── 1. DÉTECTION DES RACINES : f(x) = 0 ────────────────────────────────
    let rootsFound = 0;
    for (const fn of fonctionsAffichees) {
        const gfn = (x) => evalAt(fn, x);
        let prevX = xMin;
        let prevY;
        try { prevY = gfn(prevX); } catch (e) { prevY = NaN; }

        for (let i = 1; i <= ANALYSE_SAMPLES; i++) {
            const curX = xMin + i * step;
            let curY;
            try { curY = gfn(curX); } catch (e) { curY = NaN; }

            // On ignore les segments contenant des valeurs non finies
            // (discontinuités, domaines de définition restreints)
            if (isFinite(prevY) && isFinite(curY)) {
                // Changement de signe détecté → raffinement par bissection
                if (Math.sign(prevY) !== Math.sign(curY) && prevY !== 0 && curY !== 0) {
                    const root = bissection(gfn, prevX, curX);
                    if (isFinite(root)) {
                        // Vérification : |f(racine)| doit être petit. Si la
                        // racine est sur une asymptote, |f| y est grand et
                        // on filtre le faux positif.
                        let froot;
                        try { froot = gfn(root); } catch (e) { froot = Infinity; }
                        if (isFinite(froot) && Math.abs(froot) < ANALYSE_ZERO_TOL) {
                            analyseResults.push({
                                type: 'root',
                                x: root,
                                y: 0,
                                fnA: fn.nom,
                                fnB: null,
                                cssColor: fn.cssColor
                            });
                            rootsFound++;
                        }
                    }
                }
            }
            prevX = curX;
            prevY = curY;
        }
    }

    // ── 2. DÉTECTION DES INTERSECTIONS : f(x) = g(x) ───────────────────────
    let intersFound = 0;
    for (let i = 0; i < fonctionsAffichees.length; i++) {
        for (let j = i + 1; j < fonctionsAffichees.length; j++) {
            const fA = fonctionsAffichees[i];
            const fB = fonctionsAffichees[j];

            // Fonction auxiliaire h(x) = fA(x) - fB(x). Une racine de h
            // correspond à une intersection de fA et fB.
            const h = (x) => {
                const s = buildScope(x);
                return fA.ast.evaluate(s) - fB.ast.evaluate(s);
            };

            let prevX = xMin;
            let prevH;
            try { prevH = h(prevX); } catch (e) { prevH = NaN; }

            for (let k = 1; k <= ANALYSE_SAMPLES; k++) {
                const curX = xMin + k * step;
                let curH;
                try { curH = h(curX); } catch (e) { curH = NaN; }

                if (isFinite(prevH) && isFinite(curH)) {
                    if (Math.sign(prevH) !== Math.sign(curH) && prevH !== 0 && curH !== 0) {
                        const xInter = bissection(h, prevX, curX);
                        if (isFinite(xInter)) {
                            // Calcul de la coordonnée Y à l'intersection
                            let yInter;
                            try { yInter = fA.ast.evaluate(buildScope(xInter)); }
                            catch (e) { yInter = NaN; }

                            // Vérification de cohérence : |h(xInter)| doit être petit
                            let hval;
                            try { hval = h(xInter); } catch (e) { hval = Infinity; }

                            if (isFinite(yInter) && isFinite(hval) && Math.abs(hval) < ANALYSE_ZERO_TOL) {
                                analyseResults.push({
                                    type: 'intersection',
                                    x: xInter,
                                    y: yInter,
                                    fnA: fA.nom,
                                    fnB: fB.nom,
                                    cssColor: 'var(--text-warn)' // jaune pour distinguer
                                });
                                intersFound++;
                            }
                        }
                    }
                }
                prevX = curX;
                prevH = curH;
            }
        }
    }

    ajouterLog(
        '🔍 Analyse',
        `${rootsFound} racine(s) · ${intersFound} intersection(s) détectée(s)`,
        'var(--text-neon)'
    );

    // ── Détail point par point dans l'historique (v5.2) ─────────────────────
    // Chaque point remarquable est loggé avec ses coordonnées formatées à 4
    // chiffres significatifs. La couleur du log reprend celle du marqueur
    // sur le canvas (couleur de la courbe pour les racines, jaune pour les
    // intersections), pour que l'utilisateur fasse instantanément le lien
    // visuel entre l'historique et le graphe.
    const fmt = v => parseFloat(v.toPrecision(4)).toString();
    for (const pt of analyseResults) {
        if (pt.type === 'root') {
            ajouterLog(
                `${pt.fnA}(x) = 0`,
                `x = ${fmt(pt.x)}   [racine]`,
                pt.cssColor
            );
        } else { // 'intersection'
            ajouterLog(
                `${pt.fnA} ∩ ${pt.fnB}`,
                `(${fmt(pt.x)}, ${fmt(pt.y)})   [intersection]`,
                pt.cssColor
            );
        }
    }

    dessiner();
}

/**
 * Active ou désactive l'analyseur et persiste le choix.
 * Quand activé, lance automatiquement une première analyse.
 */
function setAnalyse(on, silent = false) {
    analyseEnabled = !!on;
    try { localStorage.setItem(ANALYSE_STORAGE_KEY, analyseEnabled ? '1' : '0'); }
    catch (e) { /* silencieux */ }

    if (analyseEnabled) {
        analyseCurves(); // lance une première analyse immédiatement
    } else {
        analyseResults = [];
        dessiner();
        if (!silent) {
            ajouterLog('🔍 Analyse', 'Désactivée', 'var(--text-dim)');
        }
    }

    // Met à jour le bouton UI
    const btn = document.getElementById('analyseBtn');
    if (btn) {
        btn.classList.toggle('active', analyseEnabled);
        btn.title = analyseEnabled
            ? 'Analyse ACTIVE — Clic pour désactiver (préserve les perfs)'
            : 'Lance le détecteur de racines et intersections';
    }
}

/**
 * Dessine les marqueurs de points remarquables sur le canvas.
 * Appelée depuis dessiner() si analyseEnabled && analyseResults non vide.
 * Chaque point est un petit cercle lumineux avec un halo pulsant coloré
 * selon le type (couleur de la courbe pour une racine, jaune pour une
 * intersection).
 *
 * @param {number} W  Largeur du canvas en pixels
 * @param {number} H  Hauteur du canvas en pixels
 * @param {number} xRange  view.xMax - view.xMin
 * @param {number} yRange  view.yMax - view.yMin
 */
function drawAnalyseMarkers(W, H, xRange, yRange) {
    if (!analyseEnabled || analyseResults.length === 0) return;

    for (const pt of analyseResults) {
        // Conversion coordonnées math → pixel
        const px = ((pt.x - view.xMin) / xRange) * W;
        const py = H - ((pt.y - view.yMin) / yRange) * H;

        // Skip si hors écran
        if (px < -20 || px > W + 20 || py < -20 || py > H + 20) continue;

        // Résolution de la couleur CSS (var(--xxx) → vraie couleur)
        let color = '#ffcc00';
        const m = pt.cssColor.match(/var\(([^)]+)\)/);
        if (m) color = getCSSVar(m[1]) || color;

        // ── Halo externe (effet lumineux) ─────────────────────────────
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();

        // ── Anneau extérieur ──────────────────────────────────────────
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();

        // ── Centre plein ──────────────────────────────────────────────
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
    }
}

/**
 * Vérifie si un clic aux coordonnées pixels (px, py) se trouve près d'un
 * point remarquable. Si oui, retourne le point ; sinon null.
 * Utilisé par mouseup/touchend pour enrichir la capture spatiale.
 *
 * @param {number} px  Position X du clic en pixels (dans le canvas)
 * @param {number} py  Position Y du clic en pixels
 * @returns {Object|null} Le point trouvé ou null
 */
function findAnalysePointNear(px, py) {
    if (!analyseEnabled || analyseResults.length === 0) return null;

    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    const xRange = view.xMax - view.xMin;
    const yRange = view.yMax - view.yMin;

    let bestPt = null;
    let bestDist = ANALYSE_CLICK_RADIUS_PX;

    for (const pt of analyseResults) {
        const ppx = ((pt.x - view.xMin) / xRange) * W;
        const ppy = H - ((pt.y - view.yMin) / yRange) * H;
        const d = Math.hypot(ppx - px, ppy - py);
        if (d < bestDist) {
            bestDist = d;
            bestPt = pt;
        }
    }
    return bestPt;
}

// =============================================================================
// ║                       CALCUL DES LIMITES (v5.3)                            ║
// =============================================================================
//
// Détection de limites numériques par approche adaptative. Pour une fonction
// f et un point a (fini ou ±∞), on évalue f en une séquence de points qui
// s'approchent de a à des échelles décroissantes (10⁻¹, 10⁻², … 10⁻¹²).
//
// Classification du résultat :
//
//   'finite'    → convergence vers une valeur stable L
//                  → result = { kind:'finite', value: L }
//   'infinite'  → divergence monotone vers ±∞
//                  → result = { kind:'infinite', sign: +1|-1 }
//   'jump'      → limite gauche ≠ limite droite (discontinuité)
//                  → result = { kind:'jump', left: L⁻, right: L⁺ }
//   'dne'       → n'existe pas (oscillations, valeurs erratiques)
//                  → result = { kind:'dne' }
//
// Le calcul ne demande pas de connaissance symbolique — c'est une méthode
// purement numérique, robuste sur la plupart des cas scolaires (1/x en 0,
// sin(1/x) en 0, (sin x)/x en 0, lim x→∞ de fonctions rationnelles, etc.).
//
// -----------------------------------------------------------------------------

const LIMIT_CONVERGE_TOL  = 1e-6;   // Stabilité pour conclure à une limite finie
const LIMIT_INFINITY_THR  = 1e10;   // Au-delà, on considère "infini"
const LIMIT_JUMP_TOL      = 1e-4;   // Écart max entre lim gauche et droite pour une limite bilatérale

/**
 * Calcule la limite de f(x) en x = a par un côté ou les deux.
 *
 * @param {Function} fEval  Fonction prenant un x numérique et renvoyant f(x)
 *                          (en général : x => fn.ast.evaluate(buildScope(x)))
 * @param {number} a        Point cible, fini ou ±Infinity
 * @param {'left'|'right'|'both'} side  Côté à calculer
 * @returns {Object} Résultat structuré (voir kinds ci-dessus)
 */
function computeLimit(fEval, a, side = 'both') {
    // Cas limites à ±∞ : on ne calcule qu'un côté.
    if (!isFinite(a)) {
        const sign = a > 0 ? +1 : -1;
        // On évalue en x = sign * 10^k pour k = 1 .. 12
        const values = [];
        for (let k = 1; k <= 12; k++) {
            const x = sign * Math.pow(10, k);
            try {
                const y = fEval(x);
                if (typeof y === 'number' && isFinite(y)) values.push(y);
                else if (typeof y === 'number') values.push(y); // ±∞
                else values.push(NaN);
            } catch (e) { values.push(NaN); }
        }
        return classifySequence(values);
    }

    // Cas limite en un point fini. On calcule gauche et droite séparément.
    const computeOneSide = (dir) => {
        // dir = +1 (droite) ou -1 (gauche)
        const values = [];
        for (let k = 1; k <= 12; k++) {
            const h = Math.pow(10, -k);
            const x = a + dir * h;
            try {
                const y = fEval(x);
                if (typeof y === 'number') values.push(y);
                else values.push(NaN);
            } catch (e) { values.push(NaN); }
        }
        return classifySequence(values);
    };

    if (side === 'left')  return computeOneSide(-1);
    if (side === 'right') return computeOneSide(+1);

    // side === 'both' : comparer les deux côtés
    const L = computeOneSide(-1);
    const R = computeOneSide(+1);

    // Les deux sont finies et proches → limite bilatérale finie
    if (L.kind === 'finite' && R.kind === 'finite') {
        if (Math.abs(L.value - R.value) < LIMIT_JUMP_TOL) {
            return { kind: 'finite', value: (L.value + R.value) / 2 };
        }
        return { kind: 'jump', left: L.value, right: R.value };
    }

    // Les deux divergent vers le même infini → limite bilatérale infinie
    if (L.kind === 'infinite' && R.kind === 'infinite' && L.sign === R.sign) {
        return { kind: 'infinite', sign: L.sign };
    }

    // Les deux divergent vers des infinis opposés → "jump vers infini"
    if (L.kind === 'infinite' && R.kind === 'infinite') {
        return { kind: 'jump',
                 left:  L.sign > 0 ? +Infinity : -Infinity,
                 right: R.sign > 0 ? +Infinity : -Infinity };
    }

    // Mix fini/infini → jump
    if (L.kind !== 'dne' && R.kind !== 'dne') {
        const leftVal  = L.kind === 'finite' ? L.value : (L.sign > 0 ? +Infinity : -Infinity);
        const rightVal = R.kind === 'finite' ? R.value : (R.sign > 0 ? +Infinity : -Infinity);
        return { kind: 'jump', left: leftVal, right: rightVal };
    }

    // Au moins un côté n'existe pas
    return { kind: 'dne' };
}

/**
 * Classifie une séquence de valeurs obtenues en s'approchant du point cible.
 * La séquence est ordonnée du plus éloigné (k=1) au plus proche (k=12).
 * C'est l'ordre naturel pour détecter la convergence.
 */
function classifySequence(values) {
    // Nettoyage : on enlève les NaN du début (la fonction peut ne pas être
    // définie aux grandes échelles mais l'être près de la cible).
    const clean = values.filter(v => typeof v === 'number' && !isNaN(v));
    if (clean.length < 3) return { kind: 'dne' };

    // On regarde les 4-5 dernières valeurs (les plus proches de a).
    const tail = clean.slice(-5);

    // Détection d'une divergence vers ±∞ :
    // (a) soit les dernières valeurs sont toutes > LIMIT_INFINITY_THR en magnitude
    // (b) soit la séquence est monotone en magnitude et la dernière valeur est grande
    //     (cas 1/x en 0, où on a -10, -100, -1000, ..., -1e12).
    const allHuge = tail.every(v => !isFinite(v) || Math.abs(v) > LIMIT_INFINITY_THR);
    let divergesMonotone = false;
    if (tail.length >= 3) {
        const absTail = tail.map(v => Math.abs(v));
        // strictement croissant en valeur absolue ?
        let monotone = true;
        for (let i = 1; i < absTail.length; i++) {
            if (absTail[i] <= absTail[i-1] * 1.5) { monotone = false; break; }
        }
        // dernière valeur suffisamment grande pour conclure ?
        if (monotone && absTail[absTail.length - 1] > 1e6) {
            divergesMonotone = true;
        }
    }

    if (allHuge || divergesMonotone) {
        // Signe de la divergence : on regarde la dernière valeur finie connue
        let sign = 0;
        for (let i = tail.length - 1; i >= 0; i--) {
            if (isFinite(tail[i]) && tail[i] !== 0) { sign = tail[i] > 0 ? +1 : -1; break; }
            if (tail[i] === +Infinity) { sign = +1; break; }
            if (tail[i] === -Infinity) { sign = -1; break; }
        }
        if (sign === 0) sign = +1; // défaut raisonnable
        return { kind: 'infinite', sign };
    }

    // Sont-elles stables autour d'une valeur ? → limite finie
    // On calcule l'écart max entre les 3 dernières valeurs finies.
    const finiteTail = tail.filter(v => isFinite(v));
    if (finiteTail.length >= 3) {
        const last3 = finiteTail.slice(-3);
        const maxV = Math.max(...last3);
        const minV = Math.min(...last3);
        const spread = maxV - minV;
        // Tolérance absolue OU relative, selon l'échelle de la valeur
        const scale = Math.max(1, Math.abs(last3[last3.length - 1]));
        if (spread < LIMIT_CONVERGE_TOL * scale) {
            let v = last3[last3.length - 1];
            // Arrondi cosmétique : si la valeur est microscopique (<1e-10)
            // et que la séquence décroît vers zéro, on renvoie 0 exact
            // (cas typique : lim 1/x quand x→∞).
            if (Math.abs(v) < 1e-10) v = 0;
            return { kind: 'finite', value: v };
        }
    }

    // Ni stable ni franchement infinie → n'existe pas (oscillation, chaos, etc.)
    return { kind: 'dne' };
}

/**
 * Formate un objet résultat de limite en texte lisible.
 */
function formatLimitResult(result) {
    switch (result.kind) {
        case 'finite':
            return parseFloat(result.value.toPrecision(6)).toString();
        case 'infinite':
            return result.sign > 0 ? '+∞' : '-∞';
        case 'jump':
            return `${formatFiniteOrInf(result.left)} (gauche) ≠ ${formatFiniteOrInf(result.right)} (droite)`;
        case 'dne':
            return 'n\'existe pas';
        default:
            return '?';
    }
}
function formatFiniteOrInf(v) {
    if (v === +Infinity) return '+∞';
    if (v === -Infinity) return '-∞';
    return parseFloat(v.toPrecision(6)).toString();
}

/**
 * Active ou désactive le mode LIM. Quand actif, le clic sur le canvas pose
 * une limite au lieu de capturer cX/cY. Le curseur devient crosshair et le
 * bouton est highlight.
 */
function setLimMode(on) {
    limModeEnabled = !!on;
    const btn = document.getElementById('limModeBtn');
    if (btn) {
        btn.classList.toggle('active', limModeEnabled);
        btn.title = limModeEnabled
            ? 'Mode LIM ACTIF — Cliquez sur le graphe pour poser une limite (Échap pour quitter)'
            : 'Mode LIM : cliquer pour activer, puis cliquer sur le graphe pour poser une limite';
    }
    if (canvas) {
        canvas.style.cursor = limModeEnabled ? 'crosshair' : '';
    }
    ajouterLog(
        'Δ LIM',
        limModeEnabled ? 'Mode LIM activé — cliquez sur le graphe' : 'Mode LIM désactivé',
        limModeEnabled ? 'var(--text-neon)' : 'var(--text-dim)'
    );
}

/**
 * Appelée par le handler mouseup quand limModeEnabled === true.
 * Calcule les limites de toutes les fonctions non-implicites au x cliqué,
 * crée les marqueurs correspondants et les loggue dans l'historique.
 */
function poserLimiteAuClic(xClic) {
    if (fonctionsAffichees.length === 0) {
        ajouterLog('Δ LIM', 'Aucune fonction tracée', 'var(--text-error)');
        return;
    }

    let posees = 0;
    for (const fn of fonctionsAffichees) {
        if (fn.implicit) continue; // les implicites n'ont pas de y=f(x)

        const fEval = (xx) => fn.ast.evaluate(buildScope(xx));
        const result = computeLimit(fEval, xClic, 'both');

        limMarkers.push({
            x: xClic,
            fnName: fn.nom,
            cssColor: fn.cssColor,
            result: result
        });

        // Loggue chaque limite avec la couleur de la courbe
        const xFmt = parseFloat(xClic.toPrecision(4)).toString();
        ajouterLog(
            `lim ${fn.nom}(x) x→${xFmt}`,
            `= ${formatLimitResult(result)}`,
            fn.cssColor
        );
        posees++;
    }

    if (posees > 0) dessiner();
}

/**
 * Dessine les marqueurs de limites sur le canvas : cercle ouvert pour une
 * limite finie, asymptote verticale pointillée pour une limite infinie,
 * croix barrée pour "n'existe pas".
 */
function drawLimMarkers(W, H, xRange, yRange) {
    if (limMarkers.length === 0) return;

    for (const m of limMarkers) {
        const cssVarName = m.cssColor.match(/var\(([^)]+)\)/)?.[1];
        const color = cssVarName ? getCSSVar(cssVarName) : getCSSVar('--text-neon');

        const px = ((m.x - view.xMin) / xRange) * W;
        if (px < -20 || px > W + 20) continue; // hors fenêtre

        if (m.result.kind === 'finite') {
            // Cercle ouvert au point (x, L)
            const py = H - ((m.result.value - view.yMin) / yRange) * H;
            if (py < -20 || py > H + 20) continue;

            ctx.save();
            // "Creux" du cercle en fond de canvas
            ctx.fillStyle = getCSSVar('--screen-bg');
            ctx.beginPath();
            ctx.arc(px, py, 5, 0, 2 * Math.PI);
            ctx.fill();
            // Contour coloré
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px, py, 5, 0, 2 * Math.PI);
            ctx.stroke();
            // Petit label "L" à droite
            ctx.fillStyle = color;
            ctx.font = "11px 'JetBrains Mono', monospace";
            ctx.textAlign = 'left';
            ctx.fillText(
                `lim=${parseFloat(m.result.value.toPrecision(4))}`,
                px + 9, py + 4
            );
            ctx.restore();

        } else if (m.result.kind === 'infinite') {
            // Asymptote verticale pointillée sur toute la hauteur
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 4]);
            ctx.globalAlpha = 0.75;
            ctx.beginPath();
            ctx.moveTo(px, 0);
            ctx.lineTo(px, H);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
            // Label en haut
            ctx.fillStyle = color;
            ctx.font = "11px 'JetBrains Mono', monospace";
            ctx.textAlign = 'center';
            ctx.fillText(
                `x=${parseFloat(m.x.toPrecision(4))} (${m.result.sign > 0 ? '+∞' : '-∞'})`,
                px, 14
            );
            ctx.restore();

        } else if (m.result.kind === 'jump') {
            // Deux cercles ouverts, un pour gauche, un pour droite
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            // Trait vertical pointillé discret pour marquer la discontinuité
            ctx.setLineDash([3, 3]);
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.moveTo(px, 0);
            ctx.lineTo(px, H);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;

            // Cercles aux deux valeurs (si finies)
            for (const v of [m.result.left, m.result.right]) {
                if (isFinite(v)) {
                    const py = H - ((v - view.yMin) / yRange) * H;
                    ctx.fillStyle = getCSSVar('--screen-bg');
                    ctx.beginPath(); ctx.arc(px, py, 5, 0, 2 * Math.PI); ctx.fill();
                    ctx.beginPath(); ctx.arc(px, py, 5, 0, 2 * Math.PI); ctx.stroke();
                }
            }
            ctx.fillStyle = color;
            ctx.font = "11px 'JetBrains Mono', monospace";
            ctx.textAlign = 'center';
            ctx.fillText(`saut`, px, 14);
            ctx.restore();

        } else { // 'dne'
            // Croix barrée au niveau de l'axe
            const pyAxis = (view.yMin <= 0 && view.yMax >= 0)
                ? H - ((0 - view.yMin) / yRange) * H
                : H / 2;
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(px - 6, pyAxis - 6); ctx.lineTo(px + 6, pyAxis + 6);
            ctx.moveTo(px + 6, pyAxis - 6); ctx.lineTo(px - 6, pyAxis + 6);
            ctx.stroke();
            ctx.fillStyle = color;
            ctx.font = "11px 'JetBrains Mono', monospace";
            ctx.textAlign = 'center';
            ctx.fillText('DNE', px, pyAxis - 10);
            ctx.restore();
        }
    }
}

/**
 * Efface tous les marqueurs de limites et redessine.
 */
function effacerLimites() {
    if (limMarkers.length === 0) {
        ajouterLog('Δ LIM', 'Aucune limite à effacer', 'var(--text-dim)');
        return;
    }
    limMarkers = [];
    ajouterLog('Δ LIM', 'Toutes les limites effacées', 'var(--text-warn)');
    dessiner();
}

# Architecture QUANTUM-NOVA — V6 sur base V5

Ce document explique **où va quoi** dans le repo. Toujours le mettre à jour
quand on ajoute, déplace ou supprime une responsabilité.

## Principe directeur

> **Un fichier = une responsabilité. Si un fichier dépasse ~150 lignes, c'est
> qu'il fait trop de choses : extraire un service.**

On évite à tout prix le mélange clavier + logique métier + rendu DOM dans
un même fichier. Chaque couche a son emplacement et ne déborde pas.

---

## Arborescence

```
_repo/
├── index.html              ← uniquement la structure HTML, pas de logique
│
├── core/                   ← INFRASTRUCTURE PARTAGÉE (touchée avec précaution)
│   ├── menu.js / .css      ← menu de modes (overlay) et brand-header
│   ├── help.js / .css      ← bouton AIDE (sommaire-télécommande)
│   ├── history.js          ← service QNHistory : zone CALCULATRICE
│   ├── memory.js           ← service QNMemory : snapshots restaurables
│   ├── erase.js            ← effacement contextuel + panneau MÉMOIRE
│   └── loader.js           ← moteur de dispatch des claviers et actions
│
├── modes/                  ← UN DOSSIER PAR MODE — TOUT y est centralisé
│   │                          (préfixe numéroté pour ordre de chargement)
│   ├── calc/
│   │   ├── 01_mode_calc.js          ← logique du mode (apply, onEvaluate)
│   │   ├── 02_keyb_calc.js          ← définition du clavier (KEYBOARD_CALC)
│   │   └── 03_doc_calc.js           ← section d'aide (QNHelp.calc)
│   ├── graph/
│   │   ├── 01_mode_graph.js
│   │   ├── 02_keyb_graph.js         ← alias vers KEYBOARD_SCIENTIFIC
│   │   ├── 03_doc_graph.js
│   │   └── 04_examples_graph.js     ← exemples pas-à-pas (QNHelp['graph-examples'])
│   ├── scientific/
│   │   ├── 01_mode_scientific.js
│   │   ├── 02_keyb_scientific.js
│   │   ├── 03_doc_scientific.js
│   │   └── 04_examples_scientific.js
│   ├── matrix/
│   │   ├── 01_mode_matrix.js
│   │   ├── 02_keyb_matrix.js
│   │   ├── 03_doc_matrix.js
│   │   └── 04_examples_matrix.js
│   └── stats/
│       ├── 01_mode_stats.js
│       ├── 02_keyb_stats.js
│       ├── 03_doc_stats.js
│       └── 04_examples_stats.js
│
├── docs/                   ← DOCUMENTATION TRANSVERSE (hors-mode)
│   └── sections/
│       ├── start.js        ← section "Premiers pas"
│       └── shortcuts.js    ← section "Raccourcis clavier"
│
├── shared/                 ← UTILITAIRES TRANSVERSES (à peupler progressivement)
│
├── ARCHITECTURE.md         ← CE FICHIER
│
└── (V5 inchangée)
    ├── style.css           ← thèmes, layout général
    ├── ui.js               ← UI utilities V5 (themes, modal, haptic)
    └── engine.js           ← moteur de tracé (canvas, parseur, executer())
```

---

## Règles de couplage

1. **Pas d'import croisé entre `modes/`.** Si calc et scientifique partagent
   du code, ce code va dans `core/` ou `shared/`.

2. **Le `core/` est neutre.** Il ne connaît pas les modes individuellement.
   Il expose des API génériques (`QNHistory`, `QNMemory`) que les modes
   appellent.

3. **Les fichiers V5** (`ui.js`, `engine.js`, `style.css`) **sont en
   lecture seule**. Si un comportement V5 doit évoluer, on l'override
   dans la couche évolution sans modifier la base.

4. **`keyboards/<id>.js`** ne contient **que la définition** des touches
   (tableau de specs). Aucune logique d'action — la logique vit dans
   `keyboards/loader.js` (cas génériques) ou dans le `modes/<id>/`
   correspondant (cas spécifiques au mode).

---

## API exposées sur `window`

| Objet | Source | Rôle |
|---|---|---|
| `QNHistory` | `core/history.js` | `add()` `getLast()` `getEntries()` `clear()` |
| `QNMemory`  | `core/memory.js`  | `save()` `list()` `restore()` `remove()` `subscribe()` |
| `QNHelp`    | `modes/*/help.js`, `docs/sections/*.js` | Sections d'aide indexées par id |
| `MODE_HANDLERS` | `modes/*/mode.js` | Indexé par id de mode : `{label, apply, onEvaluate?…}` |
| `KEYBOARD_BASE / SCIENTIFIC / MATRIX / STATS` | `keyboards/*.js` | Définitions de clavier |
| `loadKeyboard(modeId)` | `keyboards/loader.js` | Recharge la grille selon le mode |
| `ouvrirMenuModes()` `ouvrirAide()` etc. | `core/menu.js`, `core/help.js` | Pilotage UI |

---

## Cycle de vie d'un mode

1. **Au chargement** : chaque `modes/<id>/mode.js` s'enregistre dans
   `window.MODE_HANDLERS[id] = { label, apply, ... }`.
2. **L'utilisateur sélectionne un mode** dans le menu →
   `core/menu.js` → `selectionnerMode()` :
   - `body.classList.add('mode-<id>')`
   - `loadKeyboard(<id>)` — régénère le clavier
   - `MODE_HANDLERS[<id>].apply()` — placeholder, panneaux, redessin éventuel
3. **L'utilisateur tape ⏎** → `keyboards/loader.js` → `dispatchAction('evaluate')`
   - Mode `graph` : `executer()` V5 (tracé)
   - Autres modes : `MODE_HANDLERS.calc.onEvaluate()` → `QNHistory.add()`

---

## Ajouter un mode (ex : V7 « Physique »)

1. Créer `keyboards/physics.js` exportant `window.KEYBOARD_PHYSICS`.
2. Créer `modes/physics/mode.js` :
   ```js
   window.MODE_HANDLERS.physics = {
       label: 'PHYSIQUE',
       apply() { ... }
   };
   ```
3. Créer `modes/physics/help.js` :
   ```js
   window.QNHelp = window.QNHelp || {};
   window.QNHelp.physics = { title: 'Physique', html: `<h2>...</h2>` };
   ```
4. Ajouter `'physics'` dans `HELP_ORDER` de `core/help.js`.
5. Ajouter une entrée dans le tableau `MODES` de `core/menu.js`.
6. Référencer le clavier dans `keyboards/loader.js` (`getKeyboardForMode`).
7. Charger les trois nouveaux scripts dans `index.html`.
8. Mettre à jour ce document.

## Modifier la doc d'un mode existant

→ Toucher uniquement **`modes/<id>/help.js`**. Aucun autre fichier.

## Ajouter une section d'aide transverse

1. Créer `docs/sections/<nom>.js` qui s'enregistre dans `QNHelp`.
2. Ajouter son id dans `HELP_ORDER` de `core/help.js` à la position voulue.
3. Charger le script dans `index.html`.

---

## Sauvegardes

Le script `_backups/backup.sh "raison"` crée une archive horodatée du
dossier `_repo/`. Il s'appelle automatiquement avant et après chaque étape
majeure. Les 20 sauvegardes les plus récentes sont conservées.

Pour restaurer :
```bash
cd ~/Documents/QUANTUM-NOVA/_repo
tar -xzf ~/Documents/QUANTUM-NOVA/_backups/backup_<timestamp>_<raison>.tar.gz
```

/**
 * modes/matrix/examples.js
 * Exemples pas-à-pas du mode MATRICES.
 */

window.QNHelp = window.QNHelp || {};

window.QNHelp['matrix-examples'] = {
    title: 'Exemples — Matrices',
    parent: 'matrix',
    html: `
        <h2>Exemples : calcul matriciel</h2>

        <h3>Résoudre un système 2×2</h3>
        <p>Système : <code>3x + 2y = 7</code> et <code>x − y = 1</code>.</p>
        <p>① Choisis <strong>🔲 Matrices</strong> dans le menu.</p>
        <p>② Wizard à droite : taille de A = <code>2 × 2</code>, choix B = "Non, juste A", puis <strong>Continuer</strong>.</p>
        <p>③ Coche la case <strong>Système A·x = b</strong> (en haut). Une colonne <code>| b</code> apparaît à droite de A.</p>
        <p>④ Remplis A et b :</p>
        <p><code>3   2   |   7</code><br><code>1   -1  |   1</code></p>
        <p>⑤ Clique sur <strong>RÉSOUDRE A·x = b</strong>.</p>
        <p>Résultat attendu (avec « Fractions exactes » coché) : <code>x = 9/5</code> et <code>y = 4/5</code>.</p>

        <h3>Déterminant 2×2</h3>
        <p>Wizard : A en <code>2 × 2</code>, "Non, juste A". Remplis :</p>
        <p><code>1   2</code><br><code>3   4</code></p>
        <p>Clique sur <strong>DET(A)</strong>. La valeur <code>-2</code> et la formule <code>ad − bc</code> sont affichées.</p>

        <h3>Pivot de Gauss (RREF)</h3>
        <p>Wizard : A en <code>2 × 3</code>, "Non, juste A". Remplis :</p>
        <p><code>2   1   5</code><br><code>1   -1  1</code></p>
        <p>Clique sur <strong>RREF</strong> pour dérouler le pivot étape par étape, avec chaque opération sur les lignes (échange, division, élimination).</p>

        <h3>Astuce saisie</h3>
        <p>Les cellules acceptent <code>1/2</code>, <code>-3/4</code>, <code>sqrt(2)</code>, virgule ou point décimal — l'évaluation se fait à la lecture.</p>
    `
};

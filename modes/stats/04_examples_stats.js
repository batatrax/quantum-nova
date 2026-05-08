/**
 * modes/stats/examples.js
 * Exemples pas-à-pas du mode STATISTIQUES.
 */

window.QNHelp = window.QNHelp || {};

window.QNHelp['stats-examples'] = {
    title: 'Exemples — Statistiques',
    parent: 'stats',
    html: `
        <h2>Exemples : statistiques et probabilités</h2>

        <h3>Moyenne d'une série</h3>
        <p>① Mode <strong>🎲 Statistiques</strong> dans le menu.</p>
        <p>② Saisis une série de notes : <code>12, 15, 10, 19, 14, 16</code></p>
        <p>③ Clique sur <strong>STATS DESCRIPTIVES</strong>.</p>
        <p>Résultat : moyenne ≈ 14,33, médiane = 14,5, écart-type ≈ 2,98.</p>

        <h3>Loi binomiale (sondages)</h3>
        <p>10 personnes votent. Chacune a 50 % de chance de voter « oui ».
        Probabilité que 7 votent oui ?</p>
        <p>Saisis n=10, k=7, p=0.5, clique sur <strong>LOI BINOMIALE</strong>.</p>

        <div class="help-todo">À enrichir : loi normale (notes d'examen), combinatoire (combinaisons d'objets).</div>
    `
};

/**
 * modes/scientific/examples.js
 * Exemples pas-à-pas du mode SCIENTIFIQUE.
 */

window.QNHelp = window.QNHelp || {};

window.QNHelp['scientific-examples'] = {
    title: 'Exemples — Scientifique',
    parent: 'scientific',
    html: `
        <h2>Exemples : calcul scientifique et formel</h2>

        <h3>Trigonométrie en degrés</h3>
        <p>① Mode <strong>ƒ Scientifique</strong>, vérifie que <code>DEG</code> est
        actif (sinon clique <code>RAD</code> pour basculer).</p>
        <p>② Saisis <code>sin(30)</code>, puis <code>=</code>. Résultat : <code>0,5</code>.</p>

        <h3>Dériver un polynôme</h3>
        <p>① Saisis : <code>x^3 - 3*x</code></p>
        <p>② Ouvre <code>MATH ▾</code> → clique <strong>DÉRIVER</strong>. Résultat :
        <code>3*x^2 - 3</code>.</p>

        <h3>Simplifier une expression</h3>
        <p>Saisis <code>2*x + 5*x + 3</code>, clique <strong>SIMPLIFIER</strong> →
        <code>7*x + 3</code>.</p>

        <h3>Factoriser</h3>
        <p>Saisis <code>x^2 - 4</code>, clique <strong>FACTORISER</strong> →
        <code>(x - 2)(x + 2)</code>.</p>

        <h3>Logarithmes</h3>
        <p><code>log(1000)</code> → <code>3</code> (log décimal) ;
        <code>ln(e^2)</code> → <code>2</code> (log naturel).</p>

        <h3>Fonctions cachées dans MATH ▾</h3>
        <p>Pour <code>arcsin</code>, <code>cosh</code>, <code>n!</code>, racine cubique,
        valeur absolue : ouvre <strong>MATH ▾</strong> en bas du clavier.
        Exemple : <code>asin(0.5)</code> en mode DEG → <code>30</code>.</p>
    `
};

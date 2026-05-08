/**
 * modes/scientific/help.js
 * Section d'aide du mode SCIENTIFIQUE.
 */

window.QNHelp = window.QNHelp || {};

window.QNHelp.scientific = {
    title: 'Scientifique',
    html: `
        <h2>Mode scientifique</h2>
        <p>Toutes les fonctions usuelles : <code>sin</code>, <code>cos</code>,
        <code>tan</code>, <code>log</code>, <code>ln</code>, <code>exp</code>, <code>√</code>,
        <code>n!</code>, constantes <code>π</code>, <code>e</code> — accessibles depuis
        le clavier. Les fonctions plus rares (<code>asin</code>, <code>cosh</code>,
        <code>cbrt</code>, <code>mod</code>, <code>|x|</code>, <code>floor</code>, …)
        sont rangées sous le bouton <code>MATH ▾</code>.</p>

        <h3>Mode angulaire</h3>
        <p>Le bouton <code>RAD</code> / <code>DEG</code> en haut du clavier bascule
        l'unité utilisée par les fonctions trigonométriques. Affiché à droite du
        statut.</p>

        <h3>Calcul formel</h3>
        <p>Trois actions dans le panneau <code>MATH ▾</code> :</p>
        <ul>
            <li><strong>DÉRIVER</strong> calcule la dérivée de l'expression saisie
            par rapport à <code>x</code> (utilise <code>derivative()</code> de math.js).</li>
            <li><strong>SIMPLIFIER</strong> tente une réduction symbolique
            (regroupement de termes, factorisation simple).</li>
            <li><strong>FACTORISER</strong> rationalise / factorise lorsque c'est
            possible.</li>
        </ul>

        <h3>Limites du calcul formel</h3>
        <p>math.js gère bien les polynômes simples et les expressions
        trigonométriques élémentaires. Les factorisations complexes
        (polynômes de degré ≥ 4 sans racine rationnelle, expressions
        transcendantes…) peuvent retourner l'expression non transformée. Dans
        ce cas, c'est normal — pas une erreur.</p>
    `
};

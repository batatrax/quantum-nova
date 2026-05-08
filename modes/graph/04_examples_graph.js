/**
 * modes/graph/04_examples_graph.js
 * Exemples pas-à-pas du mode GRAPHIQUE.
 */

window.QNHelp = window.QNHelp || {};

window.QNHelp['graph-examples'] = {
    title: 'Exemples — Graphique',
    parent: 'graph',
    html: `
        <h2>Exemples : tracé de fonctions</h2>

        <h3>1. Parabole et racines</h3>
        <p><strong>Objectif :</strong> voir les racines d'un second degré sur le graphe.</p>
        <p>① Saisis :</p>
        <p><code>f(x) = x^2 - 4</code></p>
        <p>② La courbe coupe l'axe des x en <code>x = -2</code> et <code>x = 2</code>.</p>
        <p>③ Active <strong>🔍 ANALYSE</strong> pour repérer visuellement les points importants si disponible.</p>

        <h3>2. Sinus et cosinus</h3>
        <p><strong>Objectif :</strong> comparer une fonction et sa dérivée.</p>
        <p><code>f(x) = sin(x)</code></p>
        <p><code>g(x) = cos(x)</code></p>
        <p>Aux maxima de <code>sin(x)</code>, <code>cos(x)</code> vaut 0. Quand <code>sin(x)</code> monte, <code>cos(x)</code> est positif ; quand <code>sin(x)</code> descend, <code>cos(x)</code> est négatif.</p>

        <h3>3. Transformations d'une même courbe</h3>
        <p><strong>Objectif :</strong> comprendre amplitude, fréquence et translation.</p>
        <p><code>f(x) = sin(x)</code></p>
        <p><code>g(x) = 2*sin(x)</code> — amplitude doublée.</p>
        <p><code>h(x) = sin(2*x)</code> — oscillation plus rapide.</p>
        <p><code>p(x) = sin(x) + 1</code> — courbe déplacée vers le haut.</p>

        <h3>4. Fonction en cloche</h3>
        <p><strong>Objectif :</strong> produire une courbe élégante et parlante.</p>
        <p><code>f(x) = exp(-x^2)</code></p>
        <p>La courbe est centrée autour de 0, positive, et tend rapidement vers 0.</p>

        <h3>5. Rupture et asymptotes</h3>
        <p><strong>Objectif :</strong> montrer qu'une fonction peut ne pas être définie partout.</p>
        <p><code>f(x) = 1/x</code></p>
        <p>Le graphe se sépare autour de 0 : c'est l'occasion d'expliquer les asymptotes.</p>

        <h3>6. Valeur absolue</h3>
        <p><strong>Objectif :</strong> visualiser le changement brutal de pente.</p>
        <p><code>f(x) = abs(x)</code></p>
        <p>La courbe forme un V. Elle est continue, mais elle a un angle en 0.</p>

        <h3>7. Paramètre simple</h3>
        <p><strong>Objectif :</strong> préparer le futur mode slider.</p>
        <p><code>a = 3</code></p>
        <p><code>f(x) = a*sin(x)</code></p>
        <p>Changer <code>a</code> puis retracer montre immédiatement l'effet du paramètre.</p>

        <div class="help-todo">Prochaine amélioration spectaculaire : transformer <code>a</code> en curseur visuel sur la page de droite.</div>
    `
};

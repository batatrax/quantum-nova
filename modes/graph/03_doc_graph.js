/**
 * modes/graph/03_doc_graph.js
 * Section d'aide du mode GRAPHIQUE.
 *
 * Objectif : la page de droite doit servir de mémo visuel pendant que
 * l'utilisateur trace. On affiche donc les formes d'entrée, les fonctions
 * utiles et les outils du grapheur, pas seulement une phrase d'introduction.
 */

window.QNHelp = window.QNHelp || {};

window.QNHelp.graph = {
    title: 'Graphique',
    html: `
        <h2>📈 Calculatrice graphique</h2>
        <p>Cette page sert de mémo pendant le tracé. À gauche tu tapes dans la barre ;
        à droite tu gardes sous les yeux les fonctions, les formes acceptées et les outils utiles.</p>

        <h3>Entrées rapides</h3>
        <div class="graph-ref-grid">
            <article class="graph-ref-card">
                <strong>Fonction nommée</strong>
                <code>f(x) = sin(x)</code>
                <span>Crée ou remplace la courbe <em>f</em>.</span>
            </article>
            <article class="graph-ref-card">
                <strong>Tracé direct</strong>
                <code>x^2 - 3*x + 2</code>
                <span>Trace directement l'expression en fonction de x.</span>
            </article>
            <article class="graph-ref-card">
                <strong>Plusieurs courbes</strong>
                <code>g(x) = cos(x)</code>
                <span>Ajoute une autre courbe à la légende.</span>
            </article>
            <article class="graph-ref-card">
                <strong>Paramètre</strong>
                <code>a = 2</code>
                <span>Définit une variable réutilisable dans <code>a*sin(x)</code>.</span>
            </article>
        </div>

        <h3>Fonctions à tracer</h3>
        <div class="graph-function-list">
            <section>
                <h4>Classiques</h4>
                <p><code>x</code> <code>x^2</code> <code>x^3</code> <code>1/x</code> <code>abs(x)</code> <code>sqrt(x)</code></p>
            </section>
            <section>
                <h4>Trigonométrie</h4>
                <p><code>sin(x)</code> <code>cos(x)</code> <code>tan(x)</code> <code>asin(x)</code> <code>acos(x)</code> <code>atan(x)</code></p>
            </section>
            <section>
                <h4>Exponentielles & logarithmes</h4>
                <p><code>exp(x)</code> <code>log(x)</code> <code>log10(x)</code> <code>e^x</code> <code>2^x</code></p>
            </section>
            <section>
                <h4>Transformations visuelles</h4>
                <p><code>sin(2*x)</code> <code>2*sin(x)</code> <code>sin(x-1)</code> <code>sin(x)+1</code></p>
            </section>
            <section>
                <h4>Constantes</h4>
                <p><code>pi</code> <code>e</code> <code>tau</code> <code>phi</code></p>
            </section>
            <section>
                <h4>Analyse depuis un point</h4>
                <p><code>f(cX)</code> <code>g(cX)</code> <code>cX</code> <code>cY</code></p>
            </section>
        </div>

        <h3>Exemples prêts à taper</h3>
        <div class="graph-example-stack">
            <p><code>f(x) = x^2 - 4</code> — parabole, racines visibles en −2 et 2.</p>
            <p><code>f(x) = sin(x)</code> puis <code>g(x) = cos(x)</code> — comparaison onde / dérivée.</p>
            <p><code>f(x) = exp(-x^2)</code> — courbe en cloche propre et très visuelle.</p>
            <p><code>f(x) = abs(x)</code> — valeur absolue, angle en 0.</p>
            <p><code>f(x) = 1/x</code> — asymptotes et rupture au voisinage de 0.</p>
            <p><code>a = 2</code> puis <code>f(x) = a*sin(x)</code> — paramètre réutilisable.</p>
        </div>

        <h3>Outils du grapheur</h3>
        <div class="graph-tool-list">
            <p><strong>⌂ VUE</strong> recentre la fenêtre graphique.</p>
            <p><strong>🗑 GRAPHE</strong> efface les courbes.</p>
            <p><strong>∫ AIRE</strong> prépare l'ombrage d'une aire sous la courbe.</p>
            <p><strong>🔍 ANALYSE</strong> active ou désactive les repères d'analyse.</p>
            <p><strong>📸 EXPORT</strong> envoie le graphe vers le panneau d'export.</p>
        </div>

        <h3>Navigation</h3>
        <p>Molette = zoom. Cliquer-glisser = déplacement. Clic simple sur une courbe ou la zone graphique = repère, avec sauvegarde de <code>cX</code> et <code>cY</code> si le moteur le permet.</p>

        <div class="help-todo">À venir : catalogue cliquable depuis la page de droite, sliders de paramètres, intersections affichées proprement, fonctions implicites et ombrage d'intégrale plus guidé.</div>
    `
};

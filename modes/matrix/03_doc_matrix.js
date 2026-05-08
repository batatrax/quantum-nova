/**
 * modes/matrix/help.js
 * Section d'aide du mode MATRICES.
 */

window.QNHelp = window.QNHelp || {};

window.QNHelp.matrix = {
    title: 'Matrices',
    html: `
        <h2>🔲 Calcul matriciel</h2>
        <p>Ce mode est pensé pour le cours : tu remplis les matrices à droite,
        puis tu lances les opérations avec le clavier à gauche. Les résultats
        sont affichés en notation mathématique, et le pivot de Gauss montre les
        étapes ligne par ligne.</p>

        <h3>À utiliser en priorité</h3>
        <p><code>DET(A)</code> calcule le déterminant. En 2×2 et 3×3, la formule
        utilisée est affichée pour rester proche de la méthode vue en classe.</p>
        <p><code>RREF</code> transforme la matrice par Gauss-Jordan.</p>
        <p><code>RÉSOUDRE A·x = b</code> ajoute une colonne <code>| b</code>, effectue
        le pivot, puis conclut clairement : solution unique, aucune solution ou
        infinité de solutions.</p>

        <h3>Saisie utile</h3>
        <p>Les cellules acceptent les nombres décimaux et les petites expressions
        comme <code>1/2</code>, <code>-3</code> ou <code>sqrt(2)</code>.</p>
    `
};

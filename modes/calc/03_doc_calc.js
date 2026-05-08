/**
 * modes/calc/help.js
 * Section d'aide du mode CALCUL.
 * Auto-enregistrement dans window.QNHelp pour que core/help.js l'agrège.
 */

window.QNHelp = window.QNHelp || {};

window.QNHelp.calc = {
    title: 'Calcul',
    html: `
        <h2>Calcul standard</h2>
        <p>Tape ton expression directement dans la barre de saisie : <code>2 + 3 × 4</code>,
        <code>(7 − 2) / 3</code>, <code>2^10</code>… puis appuie sur <code>=</code> ou
        <code>⏎ CALCULER</code>.</p>

        <h3>Touche ANS</h3>
        <p>Le bouton <code>ANS</code> rappelle le dernier résultat calculé. Utile
        pour enchaîner : tape un calcul, puis <code>ANS / 2</code> pour diviser le
        résultat par 2.</p>

        <h3>Touche %</h3>
        <p>Insère <code>/100</code> dans la saisie. Pour calculer 25 % de 80 :
        <code>80 × 25 / 100</code> → <code>20</code>.</p>

        <h3>Historique cliquable</h3>
        <p>Chaque ligne de l'historique est cliquable : un clic sur l'expression
        la réinjecte dans la barre, un clic sur le résultat l'ajoute à la saisie
        en cours.</p>

        <h3>Variables</h3>
        <p>Tu peux nommer un résultat : <code>a = 3</code> stocke 3 sous le nom
        <em>a</em>. Tu peux ensuite écrire <code>a^2 + 1</code> → <code>10</code>.</p>

        <h3>Fonctions disponibles</h3>
        <p>Le mode standard accepte aussi les fonctions usuelles : <code>sqrt(2)</code>,
        <code>abs(-5)</code>, <code>round(3.7)</code>, <code>min(2,8,3)</code>… Pour la
        trigonométrie, le calcul formel et la dérivation, bascule en mode <strong>ƒ Scientifique</strong>.</p>
    `
};

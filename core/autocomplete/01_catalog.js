/**
 * core/autocomplete/01_catalog.js
 * Catalogue des fonctions / constantes proposées par l'auto-complétion.
 *
 * Constante flexible : pour ajouter un module ou enrichir, il suffit de
 * pousser des entrées dans `window.QNAutocompleteCatalog.FUNCTIONS`.
 *
 *   - name   : identifiant à matcher contre la frappe utilisateur
 *   - insert : ce qui est inséré dans la saisie au moment de la sélection
 *              (souvent name + '(' pour les fonctions, name brut pour
 *               les constantes)
 *   - desc   : description courte affichée en gris à droite dans le dropdown
 *   - kind   : 'fn' | 'const' (servait à distinguer dans les sources)
 */

window.QNAutocompleteCatalog = {
    FUNCTIONS: [
        // Trigonométrie
        { name: 'sin',  insert: 'sin(',  desc: 'Sinus',                kind: 'fn' },
        { name: 'cos',  insert: 'cos(',  desc: 'Cosinus',              kind: 'fn' },
        { name: 'tan',  insert: 'tan(',  desc: 'Tangente',             kind: 'fn' },
        { name: 'asin', insert: 'asin(', desc: 'Arc sinus',            kind: 'fn' },
        { name: 'acos', insert: 'acos(', desc: 'Arc cosinus',          kind: 'fn' },
        { name: 'atan', insert: 'atan(', desc: 'Arc tangente',         kind: 'fn' },
        { name: 'sinh', insert: 'sinh(', desc: 'Sinus hyperbolique',   kind: 'fn' },
        { name: 'cosh', insert: 'cosh(', desc: 'Cosinus hyperbolique', kind: 'fn' },
        { name: 'tanh', insert: 'tanh(', desc: 'Tangente hyperbolique',kind: 'fn' },

        // Logs / exp
        { name: 'log',   insert: 'log(',   desc: 'Logarithme népérien (ln)', kind: 'fn' },
        { name: 'log10', insert: 'log10(', desc: 'Logarithme décimal',       kind: 'fn' },
        { name: 'exp',   insert: 'exp(',   desc: 'Exponentielle e^x',        kind: 'fn' },

        // Racines / puissances
        { name: 'sqrt',    insert: 'sqrt(',    desc: 'Racine carrée',  kind: 'fn' },
        { name: 'cbrt',    insert: 'cbrt(',    desc: 'Racine cubique', kind: 'fn' },
        { name: 'nthRoot', insert: 'nthRoot(', desc: 'Racine n-ième',  kind: 'fn' },

        // Nombres
        { name: 'abs',   insert: 'abs(',   desc: 'Valeur absolue',                   kind: 'fn' },
        { name: 'mod',   insert: 'mod(',   desc: 'Modulo : reste de la division',    kind: 'fn' },
        { name: 'floor', insert: 'floor(', desc: 'Partie entière inférieure',        kind: 'fn' },
        { name: 'ceil',  insert: 'ceil(',  desc: 'Partie entière supérieure',        kind: 'fn' },
        { name: 'round', insert: 'round(', desc: 'Arrondi',                          kind: 'fn' },

        // Calcul formel
        { name: 'derivative',  insert: 'derivative(',  desc: 'Dérivée symbolique', kind: 'fn' },
        { name: 'simplify',    insert: 'simplify(',    desc: 'Simplifier',         kind: 'fn' },
        { name: 'rationalize', insert: 'rationalize(', desc: 'Forme rationnelle',  kind: 'fn' },

        // Statistiques
        { name: 'mean',         insert: 'mean(',         desc: 'Moyenne',          kind: 'fn' },
        { name: 'median',       insert: 'median(',       desc: 'Médiane',          kind: 'fn' },
        { name: 'std',          insert: 'std(',          desc: 'Écart-type',       kind: 'fn' },
        { name: 'variance',     insert: 'variance(',     desc: 'Variance',         kind: 'fn' },
        { name: 'sum',          insert: 'sum(',          desc: 'Somme',            kind: 'fn' },
        { name: 'prod',         insert: 'prod(',         desc: 'Produit',          kind: 'fn' },
        { name: 'factorial',    insert: 'factorial(',    desc: 'Factorielle',      kind: 'fn' },
        { name: 'combinations', insert: 'combinations(', desc: 'Combinaisons nCr', kind: 'fn' },
        { name: 'permutations', insert: 'permutations(', desc: 'Arrangements nPr', kind: 'fn' },

        // Matrices
        { name: 'det',       insert: 'det(',       desc: 'Déterminant', kind: 'fn' },
        { name: 'inv',       insert: 'inv(',       desc: 'Inverse',     kind: 'fn' },
        { name: 'transpose', insert: 'transpose(', desc: 'Transposée',  kind: 'fn' },

        // Constantes
        { name: 'pi', insert: 'pi', desc: 'Constante π ≈ 3.14159', kind: 'const' },
        { name: 'e',  insert: 'e',  desc: 'Constante e ≈ 2.71828', kind: 'const' }
    ]
};

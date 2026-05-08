# Guide d'Intégration QUANTUM-NOVA V6 pour Google Sites

Pour une expérience optimale sur ton site, suis ces étapes :

## 1. Téléversement
Téléverse l'intégralité du dossier `V6/` (HTML, JS, CSS, sous-dossiers `apps/`, `core/`, `lib/`) sur un hébergement **HTTPS** (GitHub Pages, Netlify, Cloudflare Pages, ton propre serveur). Google Sites refuse les iframes en HTTP.

> *Note* : Google Sites ne permet pas d'héberger directement des dossiers de scripts complexes — c'est pourquoi on passe par un hébergement tiers.

## 2. Intégration via Code Embed
Dans l'éditeur Google Sites :
1. Clique sur **Intégrer** (`<>`).
2. Choisis l'onglet **Code intégré**.
3. Colle le code suivant (en remplaçant l'URL par la tienne) :

```html
<iframe
  src="https://TON-URL-HEBERGEE/index.html"
  title="QUANTUM-NOVA V6 — Station de calcul"
  loading="lazy"
  referrerpolicy="no-referrer"
  sandbox="allow-scripts allow-same-origin allow-popups allow-downloads"
  style="border:0; display:block; max-width:420px; width:100%; height:820px; margin:0 auto;"
  allowfullscreen>
</iframe>
```

### Pourquoi ces attributs ?
- `title` : annoncé aux lecteurs d'écran (accessibilité).
- `loading="lazy"` : ne charge la calculatrice que si elle entre dans la fenêtre visible — gain de bande passante.
- `referrerpolicy="no-referrer"` : l'iframe ne révèle pas l'URL du site Google qui l'embarque.
- `sandbox` : isolation. `allow-scripts` est obligatoire pour exécuter le JS, `allow-same-origin` pour `localStorage` (thème + préférences), `allow-popups` pour le widget détaché legacy, `allow-downloads` pour l'export de session.
- `max-width:420px; width:100%` : responsive — sur mobile, l'iframe occupe toute la largeur ; sur desktop, elle reste centrée à 420px.

## 3. Hauteurs recommandées
- **Standard** : 820px (hauteur native du châssis).
- **Compact** : 720px si Google Sites te coupe en bas.
- **Plein écran** : ajoute `height:100vh` côté CSS si tu veux dédier une page entière.

## 4. Astuce Mobile
À 500px de large, le châssis disparaît automatiquement (CSS responsive intégré) pour laisser place à une interface plein écran native.

## 5. Raccourcis clavier (bonus utilisateur)
- `Échap` → retour menu Home (sauf dans la calc, qui l'utilise pour effacer)
- `?` ou `F1` → ouvre le manuel
- `Alt+1..5` → lance directement Calculus / Graph / Matrices / Algebra / Stats

## 6. Sécurité
La librairie `math.js` est hébergée dans `lib/math.min.js` avec un hash SRI dans `index.html`. Si tu mets à jour math.js, **recalcule le hash** :
```bash
openssl dgst -sha384 -binary lib/math.min.js | openssl base64 -A
```
Et remplace la valeur de `integrity="sha384-…"` dans `index.html`.

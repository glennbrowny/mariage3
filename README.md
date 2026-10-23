# Invitation de mariage — Daniel & Grâce

Site 100 % HTML, CSS et JavaScript. Tous les fichiers sont à la racine, sans aucun dossier ni serveur.

## Publier sur GitHub Pages

1. Créez un dépôt sur https://github.com/new (ex. `mariage`).
2. **Add file → Upload files** : glissez **tous les fichiers** de ce dossier, puis **Commit changes**.
3. **Settings → Pages** → Source : **Deploy from a branch** → branche **main**, dossier **/ (root)** → **Save**.
4. Après 1 à 2 minutes, le site est en ligne sur `https://VOTRE-NOM.github.io/mariage/`.

## Personnaliser

| Fichier | Contenu |
|---|---|
| `config.js` | Prénoms, date, heures, lieux, numéro WhatsApp, e-mail de réception, cagnotte |
| `invites.js` | Liste « Ils seront présents » (à compléter au fil des réponses) |
| `index.html` | Textes longs : parents, biographies, histoire, programme, FAQ |

## Comment arrivent les réponses (RSVP)

Quand un invité valide le formulaire :
1. **WhatsApp** s'ouvre avec sa réponse déjà rédigée : il n'a plus qu'à l'envoyer au numéro de `config.js`.
2. **Un e-mail** vous est envoyé automatiquement si vous avez renseigné `email` dans `config.js` (service gratuit FormSubmit).
   La toute première réponse déclenche un e-mail d'activation de FormSubmit : cliquez une fois sur le lien pour l'activer.
   Astuce : FormSubmit vous donne ensuite un identifiant aléatoire à mettre à la place de votre adresse, pour ne pas l'afficher dans le code.

## Mettre à jour la liste « Ils seront présents »

Ouvrez `invites.js` sur GitHub (icône crayon ✏️), ajoutez une ligne par invité, puis **Commit changes** :

```js
{ nom: "Marie Ndong", accompagnants: 1, message: "Vive les mariés !" },
```

Le site n'affiche que « Marie N. ». N'ajoutez que les invités qui ont coché « Afficher mon prénom… » (indiqué dans l'e-mail).

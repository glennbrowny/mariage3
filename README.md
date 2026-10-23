# Invitation de mariage — Daniel & Grâce

Site d'invitation one-page (HTML/CSS/JS + GSAP) avec RSVP enregistré en PHP/SQLite.
Le motion design reprend celui du site `evens` : GSAP + ScrollTrigger, mêmes easings, boutons magnétiques, cartes inclinables, rideaux sur les images, texte révélé mot par mot, curseur personnalisé.

## Personnaliser

| Quoi | Où |
|---|---|
| Prénoms, date, heures, lieux, adresses, WhatsApp, cagnotte | `assets/js/config.js` |
| Textes longs (parents, biographies, histoire, FAQ, programme) | `index.html` |
| Titre / description de partage (WhatsApp, réseaux) | `<head>` de `index.html` |
| Mot de passe admin, e-mail de notification | `api/config.php` |
| Photos | `assets/img/` (format WebP conseillé) |

## Lancer en local (WAMP)

Ouvrir http://localhost/mariage4/ — l'espace mariés est sur http://localhost/mariage4/admin/
(mot de passe par défaut : `ChangezMoi-2026`, **à changer**).

## Mettre en ligne

N'importe quel hébergement PHP 8+ avec SQLite (OVH, o2switch, Hostinger…) : copier le dossier tel quel.

- Le dossier `data/` contient la base des réponses : il est bloqué par `.htaccess`. Sur Nginx, interdire l'accès à `/data/` et à `/api/config.php` dans la configuration du serveur.
- Pour recevoir un e-mail à chaque réponse, renseigner `notify_email` dans `api/config.php` (la fonction `mail()` doit être activée chez l'hébergeur).
- Pour Open Graph, remplacer `assets/img/og.jpg` par une image 1200×630 et mettre des URL absolues dans les balises `og:image` une fois le domaine connu.

## Confidentialité

La liste publique « Ils seront présents » n'affiche que le prénom + l'initiale du nom, le nombre d'accompagnants et le message (si l'invité l'a autorisé). E-mails, numéros et régimes alimentaires ne sont visibles que dans l'espace admin.
Un même e-mail ou numéro ne crée qu'une réponse : un nouvel envoi la met à jour.

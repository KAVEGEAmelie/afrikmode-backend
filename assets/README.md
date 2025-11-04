# AfrikMode - Système de Gestion Médias avec CDN

Ce dossier contient les assets par défaut pour le système de médias.

## Filigrane par défaut

Le fichier `watermark.png` doit être placé ici pour servir de filigrane par défaut sur les images.

## Recommandations pour le filigrane :

- Taille recommandée : 200x100px (sera redimensionné automatiquement)
- Format : PNG avec transparence
- Couleur : Logo en blanc avec opacité ajustable
- Contenu : Logo AfrikMode et/ou texte de copyright

## Configuration

La position et l'opacité du filigrane peuvent être configurées via :
- Variables d'environnement
- API d'administration (`/api/media/watermark/config`)
- Interface d'administration

## Génération automatique

Si aucun filigrane n'est fourni, le système continuera de fonctionner sans ajouter de filigrane aux images.
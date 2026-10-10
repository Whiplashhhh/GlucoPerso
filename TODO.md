# À faire / pistes

## Actions manuelles (dépôt et hébergement)

- [ ] Activer la protection de `main` sur GitHub : PR obligatoire, checks requis (« Lint, types,
      unit tests, build », « Integration & end-to-end tests », « Docker image build »,
      « Conventional PR title »), historique linéaire.
- [ ] Choisir le domaine, remplir `.env` de production (`BETTER_AUTH_URL` en https) et lancer
      `docker compose --profile caddy up -d --build`.
- [ ] Planifier `scripts/backup.sh` (cron) et copier les sauvegardes hors du serveur.
- [ ] Tester l'installation PWA et les écrans de démarrage sur un vrai iPhone et un Android.

## Améliorations possibles

- [ ] Notification (Web Push) pour le « Comment ça s'est passé ? » 2 h après le repas.
- [ ] Version sombre des écrans de démarrage iOS.
- [ ] Synchroniser le thème choisi entre appareils à la connexion (aujourd'hui : cookie par
      appareil + réglage en base).
- [ ] Mode hors ligne pour la saisie (file d'attente locale chiffrée), aujourd'hui volontairement
      absent pour ne pas stocker de données de santé dans le navigateur.
- [ ] Verrouillage par email + IP plutôt que par email seul (limite le blocage malveillant).
- [ ] Remplacer `style-src 'unsafe-inline'` si Motion permet un jour les styles à nonce.
- [ ] Build Docker multi-architecture (ARM).

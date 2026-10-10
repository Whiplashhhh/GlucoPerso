# À faire / pistes

## Actions manuelles (dépôt et hébergement)

- [x] Activer la protection de `main` sur GitHub : PR obligatoire, checks requis (« Lint, types,
      unit tests, build », « Integration & end-to-end tests », « Docker image build »,
      « Conventional PR title »), branche à jour, historique linéaire, conversations résolues.
- [ ] Choisir le domaine, remplir `.env` de production (`BETTER_AUTH_URL` en https) et lancer
      `docker compose --profile caddy up -d --build`.
- [x] Scripts de planification et de copie chiffrée hors serveur (`scripts/schedule-backup.sh`,
      `scripts/backup-offsite.sh`).
- [ ] Sur le serveur : créer la clé age (hors serveur), choisir la destination et lancer
      `scripts/schedule-backup.sh` (voir `docs/deploiement.md`).
- [x] Tester l'installation PWA et les écrans de démarrage sur un vrai iPhone et un Android.

## Améliorations possibles

- [x] Notification (Web Push) pour le « Comment ça s'est passé ? » 2 h après le repas (#28),
      sauf si elle a déjà répondu.
- [x] Version sombre des écrans de démarrage iOS (#27).
- [x] Synchroniser le thème choisi entre appareils (#26) : connectée, le réglage en base fait foi ;
      le cookie de l'appareil est réécrit à la connexion.
- [x] Mode hors ligne pour la saisie (#29) : file d'attente locale chiffrée pour le serveur,
      illisible par l'appareil. Sans calcul de dose hors ligne.
- [ ] Verrouillage par email + IP plutôt que par email seul (limite le blocage malveillant).
- [ ] Remplacer `style-src 'unsafe-inline'` si Motion permet un jour les styles à nonce.
- [ ] Build Docker multi-architecture (ARM).
- [ ] Tester sur un vrai iPhone / Android : réception des rappels (serveur en https) et écran de
      démarrage sombre (réinstaller l'appli sur l'écran d'accueil).

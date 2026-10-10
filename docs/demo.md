# Démo

## Compte de démonstration

```bash
npm run db:up        # base de dev sur localhost:5433
npm run seed:demo    # ou : npx prisma db seed
```

Crée (ou recrée, la commande est idempotente) le compte **Camille** :

- email : `demo@demo.local`
- mot de passe : `glucoperso-demo`, ou la valeur de `DEMO_PASSWORD` (10 caractères minimum), affiché à la fin du script

Le compte est déjà configuré (g/L, stylo au 0,5 U, seuil d'hypo 0,70 g/L, Europe/Paris, ratios par moment) et contient 6 semaines de repas variés qui se terminent maintenant : photos placeholder générées (aucune image externe), plats récurrents et favoris pour « Déjà mangé », tags (règles, sport, stress, apéro, absorption lente…), basale quotidienne et historique des ratios.

Sur l'accueil, on voit :

- la carte « Comment ça s'est passé ? » pour un repas d'il y a 2 h 30 ;
- une suggestion pour le dîner (« Passer de 1 U / 12 g à 1 U / 13 g ? »), vérifiée par le script avec le vrai moteur de ratios (il échoue sinon).

Les données sont déterministes (PRNG à graine fixe) par rapport à l'instant du lancement : relance la commande avant une démo pour que « aujourd'hui » soit à jour. Le script refuse de tourner avec `NODE_ENV=production` sauf si `DEMO_SEED_ALLOW_PRODUCTION=1`.

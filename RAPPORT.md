# Rapport de réalisation — GlucoPerso

Ce document résume ce qui a été construit, ce qui reste et les choix importants. Le détail des
décisions est dans [`DECISIONS.md`](DECISIONS.md), l'architecture dans [`PLAN.md`](PLAN.md).

## En bref

- Appli web mobile-first complète, installable (PWA), en français, clair et sombre.
- Parcours principal (saisie → retour → ratio) entièrement fonctionnel et testé de bout en bout.
- 23 Pull Requests fusionnées dans `main`, chacune avec CI verte : lint, Prettier, TypeScript
  strict, ~250 tests unitaires, 28 tests d'intégration sur une vraie base, ~20 parcours
  Playwright, build Next.js et build de l'image Docker. Messages Conventional Commits.
- Revue sécurité complète réalisée en fin de projet, avec correctifs et tests (voir
  [`docs/securite.md`](docs/securite.md)).

## Ce qui est fait (par rapport au brief)

| Brief                                                                                                                                                                                                                             | État                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1. Compte et données : inscription fermée par défaut (invitation), codes de récupération, reset email si SMTP, onboarding 4 écrans, paramètres, export RGPD, suppression du compte                                                | ✅                                                             |
| 2. Saisie d'un repas : bouton + central, photo (appareil/galerie), « Déjà mangé » flou, moment/heure, pavé numérique, dose indicative arrondie au stylo, correction exclue, glycémie avant, tags, notes, garde-fou de dose        | ✅                                                             |
| 3. « Comment ça s'est passé ? » : carte 2 h après, 3 réponses, glycémies qui pré-sélectionnent, hypo ressucrée, notes rappelées la fois suivante                                                                                  | ✅                                                             |
| 4. Ratio adaptatif : module pur couvert à 100 %, règles d'exclusion, fenêtre 21 j pondérée, majorité claire, ±10 %, bornes, 7 jours, jamais automatique, historique, confiance, alerte bienveillante, mention médicale permanente | ✅                                                             |
| 5. Calendrier : vue mois avec swipe, pastilles forme + couleur, liste du jour, détail, modification, suppression annulable, recherche                                                                                             | ✅                                                             |
| 6. Mes plats : regroupement trigram, fiche plat (galerie, moyennes, meilleure dose, taux pile poil, notes), fusion manuelle, favoris en un tap                                                                                    | ✅                                                             |
| 7. Insuline lente : coche du jour sur l'accueil                                                                                                                                                                                   | ✅                                                             |
| 8. Mon évolution + exports CSV/PDF                                                                                                                                                                                                | ✅                                                             |
| 9. Seed de démo (6 semaines, photos générées, suggestion visible)                                                                                                                                                                 | ✅                                                             |
| Design : direction artistique, illustrations SVG originales, mode sombre, microcopie, animations, `prefers-reduced-motion`, cibles 48 px, safe areas, présentation bureau                                                         | ✅ (2 passes de polish sur ~49 écrans × clair/sombre + bureau) |
| Sécurité : argon2id, cookies, rate limiting + verrouillage, CSRF, isolation testée, photos, en-têtes, Zod, secrets, logs, sauvegardes, `npm audit`                                                                                | ✅                                                             |
| Docker + Caddy + sauvegardes, README, RAPPORT                                                                                                                                                                                     | ✅                                                             |

## Vérifications réalisées

- Toute la suite (lint, types, unitaires, intégration, build, e2e, image Docker) passe en CI sur
  chaque PR.
- Image Docker construite et démarrée localement : migrations, secret généré au premier lancement,
  CSP présente, modules natifs (sharp, argon2) chargés, commande d'invitation, sauvegarde puis
  restauration vérifiées.
- Service worker testé hors ligne (aucune donnée de santé mise en cache).
- Revue visuelle : captures Playwright 390×844 clair/sombre de chaque écran + 1280×800, relues et
  corrigées en deux passes.
- `npm audit --omit=dev` : 0 vulnérabilité.

## Choix importants

- **Flux Git** : une branche + une PR par étape, fusion en squash après CI verte. Plusieurs
  étapes ont été menées en parallèle par des sous-agents dans des worktrees séparés, puis
  rebasées et intégrées une à une.
- **CSP stricte à nonce** plutôt que le prérendu partiel de Next 16 (`cacheComponents` désactivé) :
  appli authentifiée de données de santé, rendue dynamiquement de toute façon.
- **Inscription uniquement via Server Action** (endpoint HTTP Better Auth fermé), codes
  d'invitation à usage unique réservés atomiquement.
- **Ratio** : suggestion recalculée côté serveur au moment d'appliquer ; le délai de 7 jours part
  de sa réponse ; au moins 0,5 g dans le sens signalé, plafonné à 10 %.
- **Hors ligne prudent** : seules la page hors ligne et les ressources statiques sont mises en
  cache.
- **Glycémies stockées en g/L**, affichées dans son unité.

## Ce qui reste / limites connues

Voir [`TODO.md`](TODO.md). En résumé :

- Protection de `main` activée (PR + CI requises, historique linéaire). Installation PWA vérifiée
  sur iPhone et Android.
- Non vérifié : HTTPS réel avec Let's Encrypt, build ARM, sauvegarde planifiée sur le serveur de
  production (scripts prêts, à configurer sur place).
- Risques résiduels de sécurité documentés (port 3000 exposé directement, verrouillage par email
  utilisable pour bloquer temporairement une connexion, `style-src 'unsafe-inline'` requis par
  les animations, pas de chiffrement applicatif au repos).
- Avis `npm audit` sur `braces` (outillage de dev uniquement, aucun correctif publié).

## Pour la démo de demain

```bash
npm run db:up && npm run db:migrate
npm run seed:demo        # demo@demo.local / glucoperso-demo
npm run build && npm start
```

Relancer le seed le matin même : les données sont calculées par rapport à « maintenant » (carte de
retour en attente, repas du jour, suggestion du dîner).

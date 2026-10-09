# Mission : construire « "GlucoPerso" », une appli web mobile-first de suivi repas / insuline

Tu vas construire, de façon autonome et en une seule longue session, une application web complète, publiable et sécurisée. Personne ne sera disponible pour répondre à tes questions : prends les décisions raisonnables toi-même et consigne-les dans `DECISIONS.md`. L'appli doit être présentable DEMAIN à sa future utilisatrice. Priorité absolue : un parcours principal qui marche parfaitement et qui est magnifique. Ensuite seulement, les fonctionnalités secondaires.

## Contexte humain (important pour toutes tes décisions)

L'utilisatrice est une jeune femme diabétique de type 1 depuis 8 mois. Elle utilise un stylo d'insuline lente (basale) et un stylo d'insuline rapide (bolus aux repas). À chaque repas, elle compte ses glucides et calcule sa dose avec un ratio du type « 1 unité pour X grammes de glucides ». Elle a l'impression que ce ratio n'est pas fixe. Vivre avec cette maladie est difficile : l'appli doit lui donner le sourire, jamais la culpabiliser, et lui faire gagner du temps. Toute l'interface est en français, avec le tutoiement, un ton chaleureux et léger.

## Stack imposée

- Next.js (dernière version stable, App Router) + TypeScript strict
- PostgreSQL + Prisma (extension `pg_trgm` pour la recherche floue de plats)
- Auth : Better Auth (email + mot de passe), sessions en base
- Tailwind CSS, Motion (ex-Framer Motion) pour les animations, lucide-react pour les icônes, Recharts pour les graphiques
- Zod pour TOUTES les validations (client et serveur)
- `sharp` pour le traitement des photos
- PWA installable (manifest, icônes, service worker pour le shell de l'appli, écran de démarrage)
- Docker : `Dockerfile` multi-stage + `docker-compose.yml` (app + postgres + volume photos), prêt à mettre derrière un reverse proxy HTTPS (fournis un exemple `Caddyfile`)
- Tests : Vitest pour la logique métier, Playwright pour les parcours e2e

## Fonctionnalités

### 1. Compte et données
- Inscription / connexion. Champs : prénom, email, mot de passe.
- L'inscription est fermée par défaut : variable d'env `REGISTRATION_MODE=invite|open|closed` avec code d'invitation. L'appli est personnelle et ne doit pas être ouverte à tout internet.
- À l'inscription, génère des codes de récupération (affichés une fois, à télécharger) pour réinitialiser le mot de passe sans dépendre d'un serveur mail. Si `SMTP_*` est configuré, active aussi la réinitialisation par email.
- Onboarding en 3–4 écrans illustrés et animés : prénom, unité de glycémie (g/L par défaut, ou mg/dL), incrément du stylo rapide (0,5 U ou 1 U), ratios de départ donnés par son diabétologue (un ratio par défaut, et optionnellement un ratio différent par moment : petit-déj, déjeuner, goûter, dîner, encas), seuil d'hypo (0,70 g/L par défaut).
- Paramètres modifiables ensuite. Suppression du compte et export complet des données (RGPD).

### 2. Saisie d'un repas (LE parcours clé, il doit prendre moins de 30 secondes)
Bouton flottant central « + » toujours accessible. Formulaire en une seule page fluide (ou bottom sheet plein écran) :
- Photo (appareil photo direct sur mobile via `capture`, ou galerie). Optionnelle.
- Nom du plat, avec autocomplétion floue sur l'historique. Si un plat similaire existe, affiche une carte « Déjà mangé » avec la photo, les glucides, les unités injectées, le résultat (pile poil / trop / pas assez) et ses notes. Bouton « Reprendre ces valeurs ».
- Moment (pré-rempli selon l'heure) et date/heure (modifiables pour une saisie après coup).
- Glucides en grammes (gros pavé numérique, pas de petit input).
- Calcul indicatif affiché en direct : « Avec ton ratio du midi (1 U / 12 g) : 60 g → 5 U », arrondi à l'incrément du stylo, avec la mention « indicatif ».
- Unités de rapide injectées pour le repas.
- Champ séparé et optionnel « dont correction (U) » pour une glycémie haute avant le repas. La correction est EXCLUE du calcul de ratio.
- Glycémie avant le repas (optionnelle).
- Tags rapides (chips) : 🍿 absorption lente / gras, 🏃 sport, 🤒 malade, 🌸 règles, 🍷 alcool, 😰 stress, ⚠️ atypique.
- Notes libres.
- Garde-fou : au-delà d'un seuil configurable (15 U par défaut), demande une confirmation douce (« C'est bien X unités ? »).

### 3. Retour d'expérience (« Comment ça s'est passé ? »)
- Après chaque repas, le retour est en attente. Sur l'accueil, une carte apparaît 2 h après : « Comment ça s'est passé pour la raclette ? ».
- 3 grosses réponses visuelles au vocabulaire bienveillant :
    - « Un peu trop d'insuline » (descente / hypo)
    - « Pile poil 🎯 »
    - « Pas assez » (glycémie haute)
- Champs optionnels : glycémie après (ou point le plus bas / le plus haut), « hypo ressucrée ? » oui/non, note complémentaire (ex. « les glucides sont arrivés 3 h après »).
- Si des valeurs de glycémie sont saisies, pré-sélectionne le résultat le plus probable, mais elle a toujours le dernier mot.
- Quand un plat a une note ou le tag « absorption lente », la prochaine saisie d'un plat similaire affiche un rappel bien visible : « 💡 La dernière fois, tu avais noté : … ».

### 4. Le ratio adaptatif (fonctionnalité phare, logique à tester exhaustivement)
Le ratio s'exprime en « 1 U pour X g ». Il en existe un par moment de la journée (ou un seul si elle n'en a défini qu'un). Il est TOUJOURS visible en grand sur l'accueil.

Algorithme (dans `src/lib/ratio/`, pur, sans dépendance à la base, couvert à 100 % par des tests Vitest) :
- Pour chaque repas évalué : ratio effectif = glucides / (unités injectées − correction).
- Sont exclus du calcul : les repas tagués sport, malade, alcool, atypique, ceux sans retour, ceux avec 0 U de bolus repas. Les tags « règles » et « stress » sont inclus mais signalés dans l'explication.
- Signal : « trop d'insuline » → le vrai ratio est plus grand que le ratio effectif (il faut plus de grammes par unité). « Pas assez » → le vrai ratio est plus petit. « Pile poil » → confirme le ratio effectif.
- Fenêtre : 21 derniers jours, par moment de la journée, avec pondération décroissante selon l'ancienneté.
- Une suggestion n'est proposée que si : au moins 3 repas évalués dans la fenêtre, une majorité claire et récente va dans le même sens (ex. au moins 3 des 5 derniers), et pas de suggestion déjà proposée pour ce moment dans les 7 derniers jours.
- Amplitude max d'une suggestion : ±10 % du ratio actuel, arrondi à 0,5 g. Bornes absolues configurables (par défaut 3 à 50 g/U).
- La suggestion n'est JAMAIS appliquée automatiquement. Elle s'affiche comme une carte douce sur l'accueil : « Ces derniers temps au dîner, tu as eu 3 descentes sur tes 4 derniers repas. Passer de 1 U / 12 g à 1 U / 13 g ? » Elle liste les repas concernés (cliquables). Boutons « Appliquer », « Pas maintenant », « Je préfère en parler à mon diabéto ».
- Si plusieurs hypos ressucrées sont signalées en peu de temps, affiche en plus un message bienveillant invitant à en parler à son équipe médicale.
- Historique complet des changements de ratio (date, ancien, nouveau, origine : manuel / suggestion acceptée, justification).
- Indicateur de confiance (faible / moyen / bon) selon le nombre de repas récents évalués.
- Mention permanente et discrète, rédigée avec soin : « Indications basées sur ton historique, à titre indicatif seulement. Ne remplace pas l'avis de ton équipe médicale. »

### 5. Calendrier et historique
- Vue mois façon calendrier, jolie et tactile (swipe entre les mois). Chaque jour affiche de petites pastilles colorées, une par repas, selon le résultat (avec une forme ou une icône différente en plus de la couleur, pour l'accessibilité).
- Tap sur un jour → liste chronologique des repas : photo, nom, glucides, unités, résultat, notes. Tap sur un repas → détail complet, modifiable, supprimable (avec annulation possible via un toast).
- Recherche globale dans l'historique (par nom, tag, note).

### 6. Bibliothèque « Mes plats »
- Regroupement automatique des repas similaires (similarité trigram sur le nom, et fusion manuelle possible).
- Fiche plat : galerie de photos, moyenne des glucides, dose qui a le mieux marché, taux de « pile poil », toutes les notes.
- Favoris pour la saisie en un tap.

### 7. Insuline lente (secondaire)
- Petit suivi quotidien : « Lente faite aujourd'hui ✓ » avec le nombre d'unités et l'heure. Une coche toute simple sur l'accueil.

### 8. Stats et export (secondaire)
- Écran « Mon évolution » : courbe des ratios dans le temps, répartition des résultats par moment de la journée, formulé positivement (« 68 % de pile poil ce mois-ci 🎉 »), jamais de classement ni de rouge culpabilisant.
- Export CSV et PDF propre d'une période, à montrer au diabétologue.

### 9. Démo
- Script de seed créant un compte de démonstration (`demo@demo.local`) avec 6 semaines de données réalistes et variées, photos comprises (génère des visuels placeholder élégants : formes et dégradés avec un emoji, pas d'images externes), pour que le calendrier, les stats et une suggestion de ratio soient visibles en démo.

## Design et interface (section la plus importante : prends ton temps ici)

Objectif émotionnel : qu'en ouvrant l'appli, elle sourie. Doux, chaleureux, ludique, rassurant, jamais médical ou froid. Imagine un mélange entre un joli carnet de recettes illustré et une appli de bien-être soignée. Pas l'esthétique d'un template générique.

**Direction artistique**
- Fond crème chaud (pas de blanc pur), cartes aux coins très arrondis (20–28 px), ombres douces et diffuses, légère texture ou grain subtil possible.
- Palette : pêche/corail pour l'accent principal, menthe pour « pile poil », lavande pour « un peu trop d'insuline », ambre doux pour « pas assez ». PAS de rouge alarmant. Contrastes conformes WCAG AA.
- Typo : une serif expressive et ronde pour les titres et les grands chiffres (ex. Fraunces), une sans-serif ronde et très lisible pour le texte (ex. Nunito ou Plus Jakarta Sans). Chiffres tabulaires pour les doses.
- Le ratio sur l'accueil est le héros : très grand chiffre, carte dédiée, petit indicateur de confiance. Le ratio du moment actuel est mis en avant, les autres sont accessibles d'un swipe.
- Illustrations originales en SVG inline, créées par toi (petits aliments mignons avec des visages, nuages, étoiles) pour les états vides, l'onboarding et les célébrations. N'utilise aucun personnage ni aucune marque existante.
- Mode sombre complet et soigné (prunes et bleus nuit profonds, pas du gris neutre), qui suit le système et peut être forcé dans les paramètres.

**Microcopie** (exemples du ton à adopter partout)
- Accueil : « Coucou [prénom] ☀️ », avec un message qui varie selon l'heure.
- État vide : « Rien ici pour l'instant… ton estomac attend son heure 🍽️ ».
- Après « pile poil » : petite célébration (confettis légers, vibration haptique si dispo) + phrase variée tirée d'une liste d'au moins 20 encouragements.
- Après « un peu trop » ou « pas assez » : jamais de reproche. Ex. « Merci de l'avoir noté, c'est comme ça qu'on affine 💪 ».
- Petit « mot du jour » bienveillant et aléatoire sur l'accueil.

**Interactions et mouvement**
- Navigation basse (Accueil, Calendrier, + central surélevé, Mes plats, Moi) avec indicateur animé.
- Transitions de page douces, bottom sheets glissables, cartes qui réagissent au toucher (scale léger), compteurs animés, skeletons élégants au chargement.
- Respecte `prefers-reduced-motion`.
- Cibles tactiles d'au moins 48 px, utilisable à une main, gestion des safe areas iOS (encoche, barre home).
- Optimistic UI : les saisies apparaissent instantanément.

**Mobile first strict** : conçu pour 360–430 px de large. Sur desktop, présentation centrée et élégante (colonne type téléphone ou layout deux colonnes), jamais étirée.

**Auto-revue visuelle obligatoire** : avec Playwright, fais des captures d'écran de chaque écran à 390×844, en clair et en sombre, regarde-les, et itère sur le design jusqu'à ce que ce soit vraiment beau (alignements, espacements, hiérarchie, cohérence). Fais au moins 2 passes de polish complètes.

## Sécurité (appli publiée contenant des données de santé)

- Mots de passe hachés en argon2id (via Better Auth), sessions en cookies `httpOnly`, `Secure`, `SameSite=Lax`, rotation de session à la connexion.
- Rate limiting sur la connexion, l'inscription et la récupération de compte (verrouillage progressif).
- Protection CSRF sur toutes les mutations. Server Actions ou routes API toujours authentifiées.
- Isolation stricte des données : chaque requête Prisma filtre par `userId` côté serveur. Écris des tests qui vérifient qu'un utilisateur ne peut ni lire ni modifier les données d'un autre (repas, photos, plats, ratios).
- Photos : stockées hors du dossier public, servies uniquement via une route authentifiée qui vérifie le propriétaire. Vérification du type réel (magic bytes), taille max 10 Mo, ré-encodage en WebP via sharp (redimensionnement + miniature), suppression de toutes les métadonnées EXIF (GPS !), noms de fichiers aléatoires.
- En-têtes : CSP stricte, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (caméra autorisée uniquement pour le site lui-même).
- Validation Zod de toutes les entrées, aucune requête SQL brute non paramétrée.
- Aucun secret dans le code : `.env.example` documenté, secrets générés au premier lancement si absents.
- Logs sans aucune donnée de santé ni donnée personnelle.
- Script de sauvegarde (`pg_dump` + archive des photos) et procédure de restauration documentée.
- `npm audit` propre à la fin, dépendances à jour.

## Méthode de travail

1. Commence par écrire `PLAN.md` (architecture, modèle de données, écrans, ordre de travail) et une todo list. Initialise git.
2. Ordre : fondations + auth → saisie repas + photo → retour d'expérience → accueil avec ratio → calendrier → algorithme de ratio + tests → design polish (2 passes) → bibliothèque de plats → seed démo → lente, stats, export → sécurité (revue complète) → Docker + README.
3. Commit après chaque étape fonctionnelle, avec un message clair.
4. Après chaque étape : `typecheck`, `lint`, tests et `build` doivent passer. Corrige avant de continuer.
5. Si un élément secondaire bloque trop longtemps, documente-le dans `TODO.md` et avance. Ne laisse jamais le parcours principal cassé.
6. À la fin : un `README.md` en français (lancement en local, déploiement Docker + Caddy, sauvegardes, création du compte via code d'invitation) et un `RAPPORT.md` qui résume ce qui est fait, ce qui reste, et les choix importants.

Lance-toi. Prends tout le temps nécessaire, vise l'excellence, surtout sur l'interface.
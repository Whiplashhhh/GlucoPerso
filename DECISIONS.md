# Décisions

Journal des décisions prises en autonomie (personne n'était disponible pour trancher).
Format : date — décision — raison.

## Méthode

- **2026-10-10 — Flux Git** : `main` reste toujours déployable. Chaque étape du plan part sur sa propre branche (`feat/…`, `fix/…`, `chore/…`, `style/…`), passe par une Pull Request GitHub et n'est fusionnée (squash) qu'une fois la CI verte. Les messages suivent Conventional Commits, vérifiés par commitlint via un hook Husky.
- **2026-10-10 — Versions** : Next.js 16 (App Router), React 19, Prisma 7.10 (dernière stable : le tag npm `latest` pointe sur une RC 8.0, écartée), Better Auth 1.7, Tailwind 4, Zod 4, Motion 14, Vitest, Playwright. TypeScript reste sur la dernière version 5.x/6.x compatible avec Next (TS 7 natif pas encore pris en charge par l'outillage Next).
- **2026-10-10 — Node** : image Docker sur la LTS Node 24 ; `engines` accepte Node ≥ 22.

## Produit

- **2026-10-10 — Moments de la journée** : `BREAKFAST` (petit-déj, 5 h–10 h 59), `LUNCH` (déjeuner, 11 h–14 h 59), `AFTERNOON_SNACK` (goûter, 15 h–17 h 59), `DINNER` (dîner, 18 h–22 h 59), `SNACK` (encas, le reste). `DEFAULT` désigne le ratio général utilisé pour tout moment sans ratio dédié.
- **2026-10-10 — Glycémies** stockées en g/L, converties en mg/dL à l'affichage si besoin (× 100).
- **2026-10-10 — « Unités injectées » inclut la correction** (« dont correction ») : bolus repas = unités − correction.

## Sécurité et architecture

- **2026-10-10 — CSP à nonce plutôt que Partial Prerendering** : `cacheComponents` désactivé. Une appli authentifiée de données de santé est rendue dynamiquement de toute façon ; la CSP stricte (`script-src 'nonce-…' 'strict-dynamic'`) l'emporte. `style-src` garde `'unsafe-inline'` car Motion anime via l'attribut `style`.
- **2026-10-10 — Inscription uniquement par Server Action** : l'endpoint HTTP Better Auth `/sign-up/email` renvoie 403 ; l'action applique `REGISTRATION_MODE` et réserve atomiquement le code d'invitation _avant_ de créer le compte (libéré en cas d'échec). Codes d'invitation à usage unique créés par `npm run invite`, stockés hachés.
- **2026-10-10 — Codes de récupération** : 8 codes de 60 bits (alphabet sans I/L/O/U), hachés SHA-256 (suffisant vu l'entropie), affichés une fois ; il faut les télécharger ou copier pour continuer. Une récupération révoque toutes les sessions.
- **2026-10-10 — Verrouillage progressif** : après 5 échecs, 30 s puis doublement jusqu'à 1 h, oubli après 24 h calmes. Clés = hash de l'email (jamais l'email en clair). S'ajoute au rate limiting Better Auth stocké en base.
- **2026-10-10 — argon2id** via `@node-rs/argon2` (paramètres OWASP : 19 Mio, t=2, p=1).
- **2026-10-10 — Thème** : cookie `gp-theme` lu côté serveur (pas de script inline, pas de flash) ; sans cookie on suit le système.
- **2026-10-10 — Config ESLint** : laissée à celle du scaffold Next (core-web-vitals + TypeScript) ; un hook local protège ce fichier. Elle ne contient pas de règles de style en conflit avec Prettier.

## Ratio adaptatif

- **2026-10-10 — Pondération** : poids divisé par deux tous les 10 jours (un repas à 21 jours compte ~0,23). Fenêtre de 21 jours bornes incluses.
- **2026-10-10 — Majorité claire et récente** : parmi les 5 derniers repas éligibles, au moins 3 dans le même sens, plus que le sens opposé, et au plus 1 en sens opposé (3/3, 3/4, 4/5, 3/5 avec ≤ 1 contraire).
- **2026-10-10 — Valeur proposée** : estimation pondérée (pile poil → ratio effectif ; trop → effectif × 1,1 ; pas assez → effectif × 0,9). Si l'estimation contredit la majorité récente, pas de 0,5 g dans le sens signalé. Plafond ±10 %, arrondi à 0,5 g _vers_ le ratio actuel (le plafond n'est jamais dépassé), bornes absolues 3–50 g/U. Si le résultat égale le ratio actuel : pas de suggestion.
- **2026-10-10 — Délai de 7 jours** : une suggestion n'est enregistrée (table `RatioSuggestion`) qu'au moment où elle répond (Appliquer / Pas maintenant / J'en parle à mon diabéto) ; le délai de 7 jours part de cette réponse. Tant qu'elle ne répond pas, la carte reste visible.
- **2026-10-10 — Application** : l'action serveur recalcule la suggestion et n'applique que la valeur proposée par le moteur ; le client n'envoie que le moment et la décision.
- **2026-10-10 — Alerte bienveillante** : ≥ 2 hypos ressucrées sur 7 jours → message invitant à en parler à l'équipe médicale.
- **2026-10-10 — Saisie** : la carte de dose indicative occupe un emplacement de hauteur fixe pour que le pavé numérique ne bouge jamais pendant la frappe.

## PWA, déploiement et démo

- **2026-10-10 — Service worker prudent** : les navigations passent toujours par le réseau ; seul `/hors-ligne` (public) est gardé en HTML. Cache-first uniquement pour `/_next/static`, icônes, écrans de démarrage et manifeste. Jamais d'`/api`, de photos ni de pages authentifiées en cache (données de santé). Incrémenter `VERSION` dans `public/sw.js` à chaque changement.
- **2026-10-10 — Image Docker** : Node 24 slim, utilisateur non-root, système de fichiers en lecture seule, migrations via une petite installation Prisma CLI dédiée (`/opt/migrate`), secret Better Auth généré au premier lancement dans `/data/secrets.env` (600). Code d'invitation : `docker compose exec app invite` (script empaqueté avec esbuild).
- **2026-10-10 — Compose** : Postgres sur un réseau interne sans port publié ; l'appli écoute sur `127.0.0.1:3000` ; Caddy optionnel (profil `caddy`) qui retire le paramètre de recherche des logs.
- **2026-10-10 — Sauvegardes** : dump Postgres + volume `/data` complet (photos + secret) avec sommes de contrôle, 14 dernières gardées ; la restauration fait d'abord une sauvegarde de sécurité.
- **2026-10-10 — Seed de démo** : données déterministes, historique antidaté écrit directement, refuse la production sans `DEMO_SEED_ALLOW_PRODUCTION=1` (mot de passe public). Les dîners récents sont calibrés pour produire la suggestion 12 → 13.

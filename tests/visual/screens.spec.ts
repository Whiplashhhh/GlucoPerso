import { type Page, expect, test } from "@playwright/test";
import pg from "pg";
import sharp from "sharp";
import {
  E2E_DATABASE_URL,
  PASSWORD,
  nextInvite,
  registerAndOnboard,
  uniqueEmail,
} from "../e2e/helpers";

/**
 * Visual self-review: captures every screen at 390×844 in light and dark
 * (plus a few at desktop size). Run with `npm run screens`, then look at
 * ./screenshots. Full-page shots show the fixed bottom nav mid-page: that is a
 * capture artefact; the `-vp` shots are viewport-only.
 */
const SCHEMES = ["light", "dark"] as const;

async function shoot(page: Page, name: string, { viewportOnly = false } = {}) {
  for (const colorScheme of SCHEMES) {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.waitForTimeout(250);
    await page.screenshot({
      path: `screenshots/${name}-${colorScheme}.png`,
      fullPage: !viewportOnly,
    });
  }
}

async function withDb<T>(run: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

async function userIdOf(client: pg.Client, email: string): Promise<string> {
  const { rows } = await client.query<{ id: string }>(`SELECT id FROM "User" WHERE email = $1`, [
    email,
  ]);
  return rows[0]!.id;
}

test("public screens", async ({ page }) => {
  for (const [name, path] of [
    ["01-connexion", "/connexion"],
    ["02-inscription", "/inscription"],
    ["03-recuperation", "/recuperation"],
    ["04-recuperation-email", "/recuperation/email"],
    ["05-au-revoir", "/connexion?au-revoir"],
    ["06-hors-ligne", "/hors-ligne"],
  ] as const) {
    await page.goto(path);
    await shoot(page, name);
  }
});

test("register and onboarding", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/inscription");
  await page.getByLabel("Ton prénom").fill("Léa");
  await page.getByLabel("Email").fill(uniqueEmail("lea"));
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Code d'invitation").fill(await nextInvite());
  await page.getByRole("button", { name: "Créer mon carnet" }).click();
  await expect(page.getByRole("heading", { name: "Tes codes de secours" })).toBeVisible();
  await shoot(page, "07-inscription-codes");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger" }).click();
  await download;
  await page.getByRole("link", { name: "C'est noté, on continue" }).click();

  await expect(page.getByRole("heading", { name: "Enchantée !" })).toBeVisible();
  await shoot(page, "08-onboarding-1");
  for (let step = 2; step <= 4; step += 1) {
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.waitForTimeout(400);
    if (step === 3) await page.getByRole("switch").click();
    await shoot(page, `08-onboarding-${step}`);
  }
  await page.getByRole("button", { name: "C'est parti !" }).click();
  await expect(page.getByRole("heading", { name: /C'est prêt/ })).toBeVisible();
  await shoot(page, "09-onboarding-fini", { viewportOnly: true });
});

async function logMeal(
  page: Page,
  {
    name,
    digits,
    tag,
    notes,
    photo,
  }: {
    name: string;
    digits: string[];
    tag?: RegExp;
    notes?: string;
    photo?: boolean;
  },
) {
  await page.goto("/repas/nouveau");
  if (photo) {
    const png = await sharp({
      create: { width: 640, height: 480, channels: 3, background: "#e9b872" },
    })
      .composite([
        {
          input: Buffer.from(
            `<svg width="640" height="480"><circle cx="320" cy="250" r="170" fill="#fff6e8"/><circle cx="270" cy="220" r="60" fill="#f2c94c"/><circle cx="380" cy="270" r="50" fill="#f08a6c"/></svg>`,
          ),
        },
      ])
      .png()
      .toBuffer();
    await page
      .getByTestId("photo-gallery-input")
      .setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: png });
    await page.getByAltText("Aperçu de la photo du repas").waitFor();
  }
  await page.getByLabel("Qu'est-ce qu'on mange ?").fill(name);
  for (const key of digits) await page.getByRole("button", { name: key, exact: true }).click();
  await page.getByRole("button", { name: "Utiliser" }).click();
  if (tag) await page.getByRole("button", { name: tag }).click();
  if (notes) await page.getByLabel("Notes").fill(notes);
  await page.getByRole("button", { name: "Enregistrer le repas" }).click();
  await page.waitForURL(/ajout=/);
  return new URL(page.url()).searchParams.get("ajout") ?? "";
}

test("home and main journey", async ({ page }) => {
  test.setTimeout(120_000);
  const { email } = await registerAndOnboard(page, { name: "Léa" });
  await page.goto("/");
  await shoot(page, "10-accueil-vide");
  await shoot(page, "10-accueil-vide-vp", { viewportOnly: true });

  await page.goto("/repas/nouveau");
  await shoot(page, "20-saisie-vide");
  await page.getByLabel("Qu'est-ce qu'on mange ?").fill("Raclette");
  for (const key of ["6", "5"]) await page.getByRole("button", { name: key, exact: true }).click();
  await page.getByRole("button", { name: /Absorption lente/ }).click();
  await shoot(page, "21-saisie-remplie");
  await shoot(page, "21-saisie-remplie-vp", { viewportOnly: true });

  // High dose: 22 U is above the default 15 U confirmation threshold.
  await page.getByRole("button", { name: /Insuline rapide/ }).click();
  for (const key of ["2", "2"]) await page.getByRole("button", { name: key, exact: true }).click();
  await page.getByRole("button", { name: "Enregistrer le repas" }).click();
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(300);
  await shoot(page, "22-saisie-dose-haute", { viewportOnly: true });
  await page.getByRole("button", { name: "Oui, c'est bien ça" }).click();
  await page.waitForURL(/ajout=/);
  await page.waitForTimeout(400);
  await shoot(page, "12-accueil-toast", { viewportOnly: true });

  await page.goto("/repas/nouveau");
  await page.getByLabel("Qu'est-ce qu'on mange ?").fill("Raclette");
  await page.getByText("Reprendre ces valeurs").waitFor();
  await shoot(page, "23-saisie-deja-mange");

  // A meal from a few hours ago waiting for feedback, and a past streak of
  // « un peu trop » so the engine proposes a gentler ratio.
  await withDb(async (client) => {
    const userId = await userIdOf(client, email);
    const hour = 3_600_000;
    await client.query(
      `INSERT INTO "Meal" (id, "userId", name, "eatenAt", moment, "carbsGrams", "insulinUnits", "updatedAt")
       VALUES ($1, $2, 'Pâtes au pesto', $3, 'LUNCH', 70, 7, now())`,
      [`pending-${userId}`, userId, new Date(Date.now() - 2.5 * hour).toISOString()],
    );
    for (let index = 0; index < 4; index += 1) {
      await client.query(
        `INSERT INTO "Meal" (id, "userId", name, "eatenAt", moment, "carbsGrams", "insulinUnits", outcome, "updatedAt")
         VALUES ($1, $2, $3, $4, 'DINNER', 60, 6, 'TOO_MUCH', now())`,
        [
          `streak-${userId}-${index}`,
          userId,
          ["Lasagnes", "Curry de lentilles", "Gnocchis", "Risotto"][index],
          new Date(Date.now() - (index + 1) * 26 * hour).toISOString(),
        ],
      );
    }
  });
  await page.goto("/");
  await shoot(page, "11-accueil-repas");
  await shoot(page, "11-accueil-repas-vp", { viewportOnly: true });

  await page.goto(`/retour/pending-${await withDb((client) => userIdOf(client, email))}`);
  await shoot(page, "30-retour");
  await page.getByText("Ajouter des valeurs (facultatif)").click();
  await shoot(page, "30-retour-valeurs");
  await page.getByRole("radio", { name: /Pile poil/ }).click();
  await page.getByRole("button", { name: "C'est noté" }).click();
  await page.getByRole("link", { name: "Retour à l'accueil" }).waitFor();
  await shoot(page, "31-retour-pile-poil", { viewportOnly: true });

  const crepes = await logMeal(page, { name: "Crêpes au sucre", digits: ["4", "0"] });
  await page.goto(`/retour/${crepes}`);
  await page.getByRole("radio", { name: /Pas assez/ }).click();
  await page.getByRole("button", { name: "C'est noté" }).click();
  await page.getByRole("link", { name: "Retour à l'accueil" }).waitFor();
  await shoot(page, "32-retour-gentil", { viewportOnly: true });

  await page.goto("/page-qui-n-existe-pas");
  await shoot(page, "90-404");

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await shoot(page, "D1-accueil-desktop", { viewportOnly: true });
  await page.goto("/repas/nouveau");
  await shoot(page, "D2-saisie-desktop", { viewportOnly: true });
  await page.goto("/moi");
  await shoot(page, "D3-moi-desktop", { viewportOnly: true });
});

test("desktop public", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/connexion");
  await shoot(page, "D0-connexion-desktop", { viewportOnly: true });
});

/** A few weeks of history so « Mon évolution » has something to draw. */
async function seedHistory(email: string) {
  await withDb(async (client) => {
    const userId = await userIdOf(client, email);
    const day = 86_400_000;
    const now = Date.now();
    const moments = ["BREAKFAST", "LUNCH", "DINNER"] as const;
    const outcomes = ["PERFECT", "PERFECT", "TOO_MUCH", "PERFECT", "NOT_ENOUGH"] as const;
    for (let index = 0; index < 24; index += 1) {
      await client.query(
        `INSERT INTO "Meal" (id, "userId", name, "eatenAt", moment, "carbsGrams", "insulinUnits", outcome, "updatedAt")
         VALUES ($1, $2, 'Repas', $3, $4, 50, 5, $5, now())`,
        [
          `seed-${userId}-${index}`,
          userId,
          new Date(now - (index + 1) * day * 1.1),
          moments[index % 3],
          outcomes[index % 5],
        ],
      );
    }
    await client.query(`UPDATE "RatioChange" SET "createdAt" = $2 WHERE "userId" = $1`, [
      userId,
      new Date(now - 28 * day),
    ]);
    const changes: [string, number, number, string, number][] = [
      ["DEFAULT", 10, 11, "SUGGESTION", 18],
      ["DINNER", 11, 12, "MANUAL", 9],
    ];
    for (const [moment, from, to, origin, daysAgo] of changes) {
      await client.query(
        `INSERT INTO "RatioChange" (id, "userId", moment, "fromValue", "toValue", origin, justification, "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          `seed-${userId}-${moment}`,
          userId,
          moment,
          from,
          to,
          origin,
          origin === "MANUAL" ? "Conseil de mon diabéto" : "Tes derniers repas ont un peu monté",
          new Date(now - daysAgo * day),
        ],
      );
    }
    await client.query(
      `INSERT INTO "Ratio" (id, "userId", moment, "gramsPerUnit", "updatedAt") VALUES ($1, $2, 'DINNER', 12, now())`,
      [`seed-${userId}-ratio`, userId],
    );
    await client.query(
      `UPDATE "Ratio" SET "gramsPerUnit" = 11 WHERE "userId" = $1 AND moment = 'DEFAULT'`,
      [userId],
    );
    await client.query(
      `UPDATE "UserSettings" SET "usePerMomentRatios" = true WHERE "userId" = $1`,
      [userId],
    );
  });
}

test("moi screens", async ({ page }) => {
  const { email } = await registerAndOnboard(page, { name: "Léa" });
  await seedHistory(email);
  for (const [name, path] of [
    ["13-accueil-lente", "/"],
    ["50-moi", "/moi"],
    ["51-ratios", "/moi/ratios"],
    ["52-evolution", "/moi/evolution"],
    ["53-donnees", "/moi/donnees"],
    ["54-codes", "/moi/codes"],
  ] as const) {
    await page.goto(path);
    await shoot(page, name);
  }
});

test("dishes screens", async ({ page }) => {
  test.setTimeout(120_000);
  await registerAndOnboard(page, { name: "Léa" });
  await page.goto("/plats");
  await shoot(page, "70-plats-vide");

  const pesto = await logMeal(page, {
    name: "Pâtes au pesto",
    digits: ["6", "0"],
    notes: "Avec un peu de parmesan",
    photo: true,
  });
  await page.goto(`/retour/${pesto}`);
  await page.getByRole("radio", { name: /Pile poil/ }).click();
  await page.getByRole("button", { name: "C'est noté" }).click();
  await page.getByRole("link", { name: "Retour à l'accueil" }).waitFor();
  await logMeal(page, { name: "pates pesto", digits: ["7", "0"], tag: /Sport/ });
  await logMeal(page, { name: "Raclette", digits: ["8", "5"], tag: /Absorption lente/ });
  await logMeal(page, { name: "Crêpes au sucre", digits: ["4", "0"] });
  await logMeal(page, { name: "Poke bowl saumon", digits: ["5", "5"], photo: true });

  await page.goto("/plats");
  await page.getByRole("link", { name: /Pâtes au pesto/ }).click();
  await page.waitForURL(/\/plats\/[^/]+$/);
  const dishUrl = page.url();
  await page.getByRole("button", { name: "Favori" }).click();
  await page.getByRole("button", { name: "Favori", pressed: true }).waitFor();
  await page.goto("/plats");
  await page.getByRole("link", { name: /Crêpes au sucre/ }).click();
  await page.getByRole("button", { name: "Favori" }).click();
  await page.getByRole("button", { name: "Favori", pressed: true }).waitFor();

  await page.goto("/plats");
  await shoot(page, "71-plats");
  await page.goto(dishUrl);
  await page.getByRole("heading", { name: "Pâtes au pesto", level: 1 }).waitFor();
  await shoot(page, "72-plat-detail");
  await page.getByRole("button", { name: "Fusionner…" }).click();
  await page.getByRole("dialog").waitFor();
  await shoot(page, "73-plat-fusion", { viewportOnly: true });

  await page.goto("/repas/nouveau");
  await shoot(page, "74-saisie-favoris");
});

test("calendar screens", async ({ page }) => {
  await registerAndOnboard(page, { name: "Léa" });
  const raclette = await logMeal(page, {
    name: "Raclette",
    digits: ["6", "5"],
    tag: /Absorption lente/,
    notes: "Avec les copines, beaucoup de fromage",
    photo: true,
  });
  await page.goto(`/retour/${raclette}`);
  await page.getByRole("radio", { name: /Pile poil/ }).click();
  await page.getByRole("button", { name: "C'est noté" }).click();
  await page.getByRole("link", { name: "Retour à l'accueil" }).waitFor();
  await logMeal(page, { name: "Crêpes au sucre", digits: ["4", "0"], tag: /Sport/ });

  await page.goto("/calendrier");
  await shoot(page, "60-calendrier");

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  await page.locator(`[data-day="${today}"]`).click();
  await shoot(page, "61-calendrier-jour");
  const otherDay = `${today.slice(0, 8)}${today.endsWith("-01") ? "02" : "01"}`;
  await page.locator(`[data-day="${otherDay}"]`).click();
  await shoot(page, "61-calendrier-jour-vide");

  await page.goto(`/repas/${raclette}`);
  await page.getByAltText("Photo : Raclette").waitFor();
  await shoot(page, "62-repas-detail");

  await page.goto(`/repas/${raclette}/modifier`);
  await shoot(page, "63-repas-modifier");

  await page.goto("/recherche");
  await shoot(page, "64-recherche-vide");
  await page.goto("/recherche?q=r&tag=SLOW_ABSORPTION");
  await shoot(page, "65-recherche-resultats");
});

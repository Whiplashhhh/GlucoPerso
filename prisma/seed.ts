/**
 * Demo account: six weeks of Camille's meals, photos, basal logs and ratio
 * history, ending now. Idempotent: the demo user and its photos are replaced.
 *
 *   npm run seed:demo            (password: DEMO_PASSWORD or "glucoperso-demo")
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cleanDishName, normalizeDishName } from "@/lib/dishes";
import { env } from "@/lib/env";
import { MOMENT_LABEL } from "@/lib/moments";
import { pendingFeedback } from "@/server/repos/meals";
import { ratioInsights } from "@/server/repos/ratios";
import { deleteAllPhotoFiles, storePhoto } from "@/server/photos";
import { type ArtKind, demoArtSvg } from "./demo/art";
import { HYPO_THRESHOLD, PEN_INCREMENT, buildDemoPlan } from "./demo/plan";

const DEMO_EMAIL = "demo@demo.local";
const DEMO_NAME = "Camille";
const TIME_ZONE = "Europe/Paris";
const DEFAULT_PASSWORD = "glucoperso-demo";
const PHOTO_CONCURRENCY = 4;

async function removeDemoUser(): Promise<void> {
  const existing = await db.user.findUnique({ where: { email: DEMO_EMAIL }, select: { id: true } });
  if (!existing) return;
  await deleteAllPhotoFiles(existing.id);
  // Every domain row cascades from the user.
  await db.user.delete({ where: { id: existing.id } });
}

/** Renders each kind × variant once; meals reuse the PNG buffer. */
function artRenderer() {
  const cache = new Map<string, Promise<Buffer>>();
  return (kind: ArtKind, variant: number) => {
    const key = `${kind}:${variant}`;
    let png = cache.get(key);
    if (!png) {
      png = sharp(Buffer.from(demoArtSvg(kind, variant)))
        .png()
        .toBuffer();
      cache.set(key, png);
    }
    return png;
  };
}

/** Runs `task` over `items` with at most `limit` in flight. */
async function eachLimited<T>(items: T[], limit: number, task: (item: T) => Promise<void>) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      if (item !== undefined) await task(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

async function main() {
  if (env.NODE_ENV === "production" && process.env.DEMO_SEED_ALLOW_PRODUCTION !== "1") {
    throw new Error(
      "Refus : pas de compte de démo en production (DEMO_SEED_ALLOW_PRODUCTION=1 pour forcer).",
    );
  }
  const password = process.env.DEMO_PASSWORD || DEFAULT_PASSWORD;
  if (password.length < 10) throw new Error("DEMO_PASSWORD doit faire au moins 10 caractères.");

  const started = Date.now();
  const now = new Date();
  const plan = buildDemoPlan({ now, timeZone: TIME_ZONE });

  await removeDemoUser();

  // Real sign-up path: Better Auth hashes the password with argon2id.
  const { user } = await auth.api.signUpEmail({
    body: { name: DEMO_NAME, email: DEMO_EMAIL, password },
  });
  const userId = user.id;

  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { createdAt: plan.startedAt } }),
    db.userSettings.create({
      data: {
        userId,
        glucoseUnit: "G_L",
        penIncrement: PEN_INCREMENT,
        hypoThreshold: HYPO_THRESHOLD,
        usePerMomentRatios: true,
        timezone: TIME_ZONE,
        onboardedAt: plan.startedAt,
      },
    }),
    db.ratio.createMany({
      data: Object.entries(plan.ratios).map(([moment, gramsPerUnit]) => ({
        userId,
        moment: moment as keyof typeof plan.ratios,
        gramsPerUnit,
      })),
    }),
    db.ratioChange.createMany({ data: plan.ratioChanges.map((change) => ({ userId, ...change })) }),
    db.basalLog.createMany({ data: plan.basal.map((log) => ({ userId, ...log })) }),
  ]);

  // Dishes, one per distinct name, dated from their first to their last meal.
  const dishIds = new Map<string, string>();
  const dishRows = [...new Set(plan.meals.map((meal) => meal.dish))].map((name) => {
    const eaten = plan.meals.filter((meal) => meal.dish === name).map((meal) => meal.eatenAt);
    const id = randomUUID();
    dishIds.set(name, id);
    return {
      id,
      userId,
      name: cleanDishName(name),
      normalizedName: normalizeDishName(name),
      isFavorite: plan.favorites.includes(name),
      createdAt: eaten[0] ?? now,
      updatedAt: eaten[eaten.length - 1] ?? now,
    };
  });
  await db.dish.createMany({ data: dishRows });

  const mealIds = new Map(plan.meals.map((meal) => [meal.key, randomUUID()]));
  await db.meal.createMany({
    data: plan.meals.map((meal) => ({
      id: mealIds.get(meal.key),
      userId,
      dishId: dishIds.get(meal.dish),
      name: meal.dish,
      eatenAt: meal.eatenAt,
      moment: meal.moment,
      carbsGrams: meal.carbsGrams,
      insulinUnits: meal.insulinUnits,
      correctionUnits: meal.correctionUnits,
      ratioUsed: meal.ratioUsed,
      glucoseBefore: meal.glucoseBefore,
      tags: meal.tags,
      notes: meal.notes,
      outcome: meal.outcome,
      outcomeAt: meal.outcomeAt,
      glucoseAfter: meal.glucoseAfter,
      glucoseLow: meal.glucoseLow,
      glucoseHigh: meal.glucoseHigh,
      hypoTreated: meal.hypoTreated,
      outcomeNote: meal.outcomeNote,
      feedbackSkipped: meal.feedbackSkipped,
      createdAt: meal.eatenAt,
    })),
  });

  await db.ratioSuggestion.createMany({
    data: plan.suggestions.map(({ mealKeys, createdAt, ...suggestion }) => ({
      ...suggestion,
      userId,
      mealIds: mealKeys.flatMap((key) => mealIds.get(key) ?? []),
      createdAt,
      decidedAt: createdAt,
    })),
  });

  // Photos go through the real pipeline (WebP re-encode, thumbnails, Photo row).
  const render = artRenderer();
  const attachments: { photoId: string; mealId: string; at: Date }[] = [];
  const withArt = plan.meals.filter((meal) => meal.art !== null);
  await eachLimited(withArt, PHOTO_CONCURRENCY, async (meal) => {
    if (!meal.art) return;
    const photo = await storePhoto(userId, await render(meal.art.kind, meal.art.variant));
    const mealId = mealIds.get(meal.key);
    if (mealId) attachments.push({ photoId: photo.id, mealId, at: meal.eatenAt });
  });
  await db.$transaction(
    attachments.map(({ photoId, mealId, at }) =>
      db.photo.update({ where: { id: photoId }, data: { mealId, createdAt: at } }),
    ),
  );

  // Check what the home screen will really compute from the database.
  const insights = await ratioInsights(userId, { ratioMin: 3, ratioMax: 50 }, new Date());
  const pending = await pendingFeedback(userId);
  const suggestions = insights.analyses.flatMap((analysis) =>
    analysis.suggestion ? [analysis.suggestion] : [],
  );

  console.info(`\n  Compte de démo prêt en ${((Date.now() - started) / 1000).toFixed(1)} s\n`);
  console.info(`    Email        : ${DEMO_EMAIL}`);
  console.info(`    Mot de passe : ${password}`);
  console.info(
    `    Données      : ${plan.meals.length} repas, ${dishRows.length} plats, ` +
      `${attachments.length} photos, ${plan.basal.length} basales`,
  );
  console.info(`    À évaluer    : ${pending.map((meal) => meal.name).join(", ") || "aucun"}`);
  console.info("    Ratios :");
  for (const analysis of insights.analyses) {
    const ratio = insights.ratios[analysis.key];
    const line = analysis.suggestion?.question ?? "pas de suggestion";
    console.info(
      `      ${MOMENT_LABEL[analysis.key].padEnd(10)} 1 U / ${ratio} g · ` +
        `confiance ${analysis.confidence} · ${line}`,
    );
  }
  if (insights.medicalTalk) console.info("    Message bienveillant sur les hypos : affiché");

  if (!suggestions.some((suggestion) => suggestion.key === "DINNER")) {
    throw new Error("La démo devait produire une suggestion pour le dîner.");
  }
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}

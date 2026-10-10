/**
 * Per-user isolation: user B calls every repository with A's identifiers and
 * must neither read nor change anything of A's.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { cleanOrphanPhotos, readOwnedPhoto, storePhoto } from "@/server/photos";
import { basalStatus, deleteBasal, upsertBasal } from "@/server/repos/basal";
import {
  dishMemories,
  findOrCreateDish,
  getDish,
  getDishPrefill,
  listDishes,
  listFavoriteDishes,
  listMergeTargets,
  mergeDishes,
  renameDish,
  searchDishes,
  setDishFavorite,
} from "@/server/repos/dishes";
import {
  collectAllData,
  firstMealAt,
  mealsForExport,
  outcomesSince,
  ratioChangesBetween,
} from "@/server/repos/export";
import {
  getMeal,
  listMealsBetween,
  pendingFeedback,
  purgeDeletedMeals,
  restoreMeal,
  searchMeals,
  setMealFeedback,
  skipMealFeedback,
  softDeleteMeal,
  updateMeal,
} from "@/server/repos/meals";
import { decideSuggestion, ratioInsights } from "@/server/repos/ratios";
import { consumeRecoveryCode, createRecoveryCodes } from "@/server/repos/recovery";
import {
  getRatioTable,
  ratioHistory,
  removeMomentRatios,
  setPerMomentRatios,
  setRatioManually,
  updateProfileName,
  updateSettings,
} from "@/server/repos/settings";
import { addMeal, createUser, daysAgo, mealInput } from "./fixtures";

type User = Awaited<ReturnType<typeof createUser>>;

let alice: User;
let bob: User;
let aliceMeal: Awaited<ReturnType<typeof addMeal>>;
let aliceDishId: string;
let alicePhoto: { id: string };
let bobDishId: string;

async function jpeg() {
  return sharp({
    create: { width: 64, height: 48, channels: 3, background: { r: 200, g: 120, b: 40 } },
  })
    .jpeg()
    .toBuffer();
}

beforeAll(async () => {
  alice = await createUser("Alice");
  bob = await createUser("Bob");

  alicePhoto = await storePhoto(alice.id, await jpeg());
  aliceMeal = await addMeal(alice.id, {
    photoId: alicePhoto.id,
    eatenAt: daysAgo(0.2),
    notes: "Secret d'Alice",
  });
  aliceDishId = aliceMeal.dishId as string;
  await db.dish.update({ where: { id: aliceDishId }, data: { isFavorite: true } });

  const bobMeal = await addMeal(bob.id, { name: "Riz cantonais", notes: null });
  bobDishId = bobMeal.dishId as string;
});

describe("meals", () => {
  it("B cannot read A's meal, by id, search, calendar or pending feedback", async () => {
    expect(await getMeal(bob.id, aliceMeal.id)).toBeNull();
    expect(await searchMeals(bob.id, { q: "carbonara", tags: [] })).toEqual([]);
    expect(await searchMeals(bob.id, { q: "Secret d", tags: [] })).toEqual([]);
    const all = await listMealsBetween(bob.id, daysAgo(30), daysAgo(-1));
    expect(all.map((meal) => meal.id)).not.toContain(aliceMeal.id);
    const pending = await pendingFeedback(bob.id, new Date(Date.now() + 3 * 60 * 60 * 1000));
    expect(pending.map((meal) => meal.id)).not.toContain(aliceMeal.id);
    // Sanity check: A sees it.
    expect((await getMeal(alice.id, aliceMeal.id))?.id).toBe(aliceMeal.id);
    expect(await searchMeals(alice.id, { q: "carbonara", tags: [] })).toHaveLength(1);
  });

  it("B cannot edit, give feedback on, delete or restore A's meal", async () => {
    expect(
      await updateMeal(bob.id, aliceMeal.id, mealInput({ name: "Piraté", photoId: null })),
    ).toBe(false);
    expect(
      await setMealFeedback(bob.id, aliceMeal.id, {
        outcome: "TOO_MUCH",
        glucoseAfter: null,
        glucoseLow: null,
        glucoseHigh: null,
        hypoTreated: null,
        outcomeNote: "piraté",
      }),
    ).toBe(false);
    await skipMealFeedback(bob.id, aliceMeal.id);
    expect(await softDeleteMeal(bob.id, aliceMeal.id)).toBe(false);

    const unchanged = await db.meal.findUniqueOrThrow({
      where: { id: aliceMeal.id },
      include: { photos: true },
    });
    expect(unchanged.name).toBe("Pâtes carbonara");
    expect(unchanged.outcome).toBeNull();
    expect(unchanged.outcomeNote).toBeNull();
    expect(unchanged.feedbackSkipped).toBe(false);
    expect(unchanged.deletedAt).toBeNull();
    expect(unchanged.photos.map((photo) => photo.id)).toEqual([alicePhoto.id]);

    // A deleted meal of A's can only be restored or purged by A.
    const old = await addMeal(alice.id, { name: "Gratin", eatenAt: daysAgo(20) });
    await db.meal.update({ where: { id: old.id }, data: { deletedAt: daysAgo(10) } });
    expect(await restoreMeal(bob.id, old.id)).toBe(false);
    expect(await purgeDeletedMeals(bob.id)).toBe(0);
    const still = await db.meal.findUniqueOrThrow({ where: { id: old.id } });
    expect(still.deletedAt).not.toBeNull();
  });

  it("B cannot attach A's photo to one of B's meals", async () => {
    const orphan = await storePhoto(alice.id, await jpeg());
    const bobMeal = await addMeal(bob.id, { name: "Soupe", photoId: orphan.id });
    expect((await db.photo.findUniqueOrThrow({ where: { id: orphan.id } })).mealId).toBeNull();
    expect(
      await updateMeal(bob.id, bobMeal.id, mealInput({ name: "Soupe", photoId: orphan.id })),
    ).toBe(true);
    expect((await db.photo.findUniqueOrThrow({ where: { id: orphan.id } })).mealId).toBeNull();
  });
});

describe("photos", () => {
  it("B cannot read A's photo files, and the files live outside public/", async () => {
    expect(await readOwnedPhoto(bob.id, alicePhoto.id, "full")).toBeNull();
    expect(await readOwnedPhoto(bob.id, alicePhoto.id, "thumb")).toBeNull();
    expect(await readOwnedPhoto(alice.id, alicePhoto.id, "full")).toBeInstanceOf(Buffer);

    const stored = await db.photo.findUniqueOrThrow({ where: { id: alicePhoto.id } });
    const photosDir = path.resolve(process.env.PHOTOS_DIR as string);
    expect(photosDir.startsWith(path.resolve("public"))).toBe(false);
    expect(existsSync(path.join(photosDir, alice.id, `${stored.storageKey}.webp`))).toBe(true);
  });

  it("B's orphan cleanup never touches A's uploads", async () => {
    const orphan = await storePhoto(alice.id, await jpeg());
    await db.photo.update({ where: { id: orphan.id }, data: { createdAt: daysAgo(3) } });
    await cleanOrphanPhotos(bob.id);
    expect(await db.photo.findUnique({ where: { id: orphan.id } })).not.toBeNull();
    expect(await readOwnedPhoto(alice.id, orphan.id, "full")).toBeInstanceOf(Buffer);
  });
});

describe("dishes", () => {
  it("B cannot see A's dishes, in the library, the dish page, favourites or search", async () => {
    expect(await getDish(bob.id, aliceDishId)).toBeNull();
    expect(await getDishPrefill(bob.id, aliceDishId)).toBeNull();
    expect((await listDishes(bob.id)).map((dish) => dish.id)).not.toContain(aliceDishId);
    expect((await listFavoriteDishes(bob.id)).map((dish) => dish.id)).not.toContain(aliceDishId);
    expect((await listMergeTargets(bob.id, bobDishId)).map((dish) => dish.id)).not.toContain(
      aliceDishId,
    );
    expect(await searchDishes(bob.id, "carbonara")).toEqual([]);
    expect(await dishMemories(bob.id, "carbonara")).toEqual([]);
    // Sanity check: A sees it.
    expect((await dishMemories(alice.id, "carbonara"))[0]?.dishId).toBe(aliceDishId);
  });

  it("a name B types never links B's meal to A's dish", async () => {
    const dishId = await findOrCreateDish(bob.id, "Pâtes carbonara");
    expect(dishId).not.toBe(aliceDishId);
  });

  it("B cannot favourite, rename or merge A's dish", async () => {
    expect(await setDishFavorite(bob.id, aliceDishId, false)).toBe(false);
    expect(await renameDish(bob.id, aliceDishId, "Piraté")).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(await mergeDishes(bob.id, aliceDishId, bobDishId)).toBe(false);
    expect(await mergeDishes(bob.id, bobDishId, aliceDishId)).toBe(false);

    const dish = await db.dish.findUniqueOrThrow({ where: { id: aliceDishId } });
    expect(dish).toMatchObject({ name: "Pâtes carbonara", isFavorite: true, userId: alice.id });
    const meal = await db.meal.findUniqueOrThrow({ where: { id: aliceMeal.id } });
    expect(meal.dishId).toBe(aliceDishId);
    expect(await db.dish.findUnique({ where: { id: bobDishId } })).not.toBeNull();
  });
});

describe("ratios and suggestions", () => {
  it("B cannot accept a suggestion computed from A's meals", async () => {
    // Five recent dinners of A's that were « pas assez »: A gets a suggestion.
    for (let day = 1; day <= 5; day += 1) {
      const meal = await addMeal(alice.id, { name: "Lasagnes", eatenAt: daysAgo(day + 0.5) });
      await db.meal.update({ where: { id: meal.id }, data: { outcome: "NOT_ENOUGH" } });
    }
    const forAlice = await ratioInsights(alice.id, alice.settings);
    expect(forAlice.analyses.find((item) => item.key === "DINNER")?.suggestion).toBeTruthy();

    const forBob = await ratioInsights(bob.id, bob.settings);
    expect(Object.keys(forBob.mealNames)).not.toContain(aliceMeal.id);
    expect(forBob.analyses.find((item) => item.key === "DINNER")?.suggestion).toBeFalsy();

    expect(await decideSuggestion(bob.id, bob.settings, "DINNER", "ACCEPTED")).toBe(false);
    expect((await getRatioTable(alice.id)).DINNER).toBe(12);
    expect(await db.ratioSuggestion.count({ where: { userId: alice.id } })).toBe(0);
  });

  it("B's ratio and settings edits only change B's rows", async () => {
    expect(
      await setRatioManually(bob.id, { moment: "DINNER", value: 20, justification: null }),
    ).toBe(true);
    await removeMomentRatios(bob.id, ["DINNER"], false);
    await setPerMomentRatios(bob.id, false);
    expect(await updateSettings(bob.id, { hypoThreshold: 0.8, doseConfirmThreshold: 30 })).toBe(
      null,
    );
    await updateProfileName(bob.id, "Bobby");

    expect(await getRatioTable(alice.id)).toEqual({ DEFAULT: 12, DINNER: 12 });
    const settings = await db.userSettings.findUniqueOrThrow({ where: { userId: alice.id } });
    expect(settings).toMatchObject({
      hypoThreshold: alice.settings.hypoThreshold,
      doseConfirmThreshold: alice.settings.doseConfirmThreshold,
      usePerMomentRatios: alice.settings.usePerMomentRatios,
    });
    expect((await db.user.findUniqueOrThrow({ where: { id: alice.id } })).name).toBe("Alice");
    const history = await ratioHistory(bob.id);
    expect(history.length).toBeGreaterThan(0);
    expect(await db.ratioChange.count({ where: { userId: alice.id } })).toBe(0);
  });
});

describe("basal", () => {
  it("B cannot see or undo A's long-acting log", async () => {
    await upsertBasal(alice.id, "2026-10-10", 14, new Date("2026-10-10T20:00:00Z"));
    expect((await basalStatus(bob.id, "2026-10-10")).today).toBeNull();
    expect((await basalStatus(bob.id, "2026-10-10")).lastUnits).toBeNull();
    await deleteBasal(bob.id, "2026-10-10");
    expect((await basalStatus(alice.id, "2026-10-10")).today?.units).toBe(14);
  });
});

describe("exports", () => {
  it("B's exports never contain A's data", async () => {
    const meals = await mealsForExport(bob.id, daysAgo(400), daysAgo(-1));
    expect(meals.map((meal) => meal.name)).not.toContain("Pâtes carbonara");
    expect((await outcomesSince(bob.id, null)).length).toBe(0);
    expect(await firstMealAt(bob.id)).not.toBeNull();
    expect(await ratioChangesBetween(bob.id, null, daysAgo(-1))).not.toContainEqual(
      expect.objectContaining({ justification: "Ratio de départ" }),
    );

    const { data, photoIds } = await collectAllData(bob.id);
    const dump = JSON.stringify(data);
    expect(dump).not.toContain(alice.id);
    expect(dump).not.toContain(aliceMeal.id);
    expect(dump).not.toContain(aliceDishId);
    for (const text of ["Secret d'Alice", "Lasagnes", "Gratin"]) expect(dump).not.toContain(text);
    expect(photoIds).not.toContain(alicePhoto.id);
    expect(data.profile?.email).toContain("bob");
    // Secrets are never exported.
    expect(dump).not.toMatch(/codeHash|"token"|"password"/);
  });
});

describe("recovery codes", () => {
  it("A's recovery code is useless on B's account and works once for A", async () => {
    const [code] = await createRecoveryCodes(alice.id);
    expect(await consumeRecoveryCode(bob.id, code as string)).toBe(false);
    expect(await consumeRecoveryCode(alice.id, code as string)).toBe(true);
    expect(await consumeRecoveryCode(alice.id, code as string)).toBe(false);
    const stored = await db.recoveryCode.findMany({ where: { userId: alice.id } });
    expect(stored.every((row) => /^[0-9a-f]{64}$/.test(row.codeHash))).toBe(true);
    expect(stored.map((row) => row.codeHash)).not.toContain(code);
  });
});

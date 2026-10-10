import { type Page, expect, test } from "@playwright/test";
import { registerAndOnboard } from "./helpers";

/** Whether OfflineSync stored what the offline form needs on this device. */
function offlineConfigStored(page: Page) {
  return page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const request = indexedDB.open("glucoperso-offline");
        request.onerror = () => resolve(false);
        request.onsuccess = () => {
          try {
            const read = request.result.transaction("config").objectStore("config").get("current");
            read.onsuccess = () => resolve(Boolean(read.result));
            read.onerror = () => resolve(false);
          } catch {
            resolve(false);
          }
        };
      }),
  );
}

test("a meal noted offline joins the journal once the network is back", async ({
  page,
  context,
}) => {
  await registerAndOnboard(page, { name: "Léa" });
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await expect.poll(() => offlineConfigStored(page)).toBe(true);

  await context.setOffline(true);
  await page.goto("/repas/nouveau").catch(() => undefined);
  await expect(page.getByRole("heading", { name: "Pas de réseau…" })).toBeVisible();
  await page.getByLabel("Qu'est-ce qu'on mange ?").fill("Soupe du refuge");
  await page.getByLabel("Glucides (g)").fill("30");
  await page.getByLabel("Rapide (U)").fill("2,5");
  await page.getByRole("button", { name: "Garder ce repas" }).click();
  await expect(page.getByText("Noté ! Il rejoindra ton carnet")).toBeVisible();
  await expect(page.getByText("1 repas en attente d'envoi.")).toBeVisible();

  await context.setOffline(false);
  await page.goto("/");
  await expect(page.getByText("Ton repas noté hors ligne a rejoint ton carnet ✨")).toBeVisible();
  await expect(page.getByText("Soupe du refuge")).toBeVisible();

  // The queue is empty now: reloading never adds it twice.
  await page.reload();
  await expect(page.getByText("Soupe du refuge")).toHaveCount(1);
});

test("signed out, the offline page offers no form", async ({ page, context }) => {
  await registerAndOnboard(page, { name: "Léa" });
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await expect.poll(() => offlineConfigStored(page)).toBe(true);

  await page.getByRole("link", { name: "Moi" }).click();
  await page.getByRole("button", { name: "Me déconnecter" }).click();
  await expect(page).toHaveURL(/\/connexion$/);
  await expect.poll(() => offlineConfigStored(page)).toBe(false);

  await context.setOffline(true);
  await page.goto("/").catch(() => undefined);
  await expect(page.getByRole("heading", { name: "Pas de réseau…" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Garder ce repas" })).toHaveCount(0);
  await context.setOffline(false);
});

import { expect, test } from "@playwright/test";

/** Regenerates the README screenshots: `npm run screenshots` (needs a build). Skipped in normal runs. */
test.skip(!process.env.SCREENSHOTS, "set SCREENSHOTS=1 to regenerate docs/assets");

const future = new Date(Date.now() + 45 * 864e5).toISOString().slice(0, 10);
const shots = [
  { file: "desktop-light", scheme: "light", viewport: { width: 1280, height: 1000 } },
  { file: "desktop-dark", scheme: "dark", viewport: { width: 1280, height: 1000 } },
  { file: "mobile", scheme: "light", viewport: { width: 390, height: 844 } },
] as const;

for (const s of shots) {
  test(`screenshot ${s.file}`, async ({ browser }) => {
    const context = await browser.newContext({
      colorScheme: s.scheme,
      viewport: s.viewport,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto("/");
    await page.getByLabel("Event name").fill("Aarav’s 5th Birthday");
    await page.getByLabel("Event date").fill(future);
    await page.getByLabel("Theme / vibe").fill("Space adventure");
    await page.getByLabel("Must-haves, diet, accessibility").fill("vegetarian, wheelchair access");
    await page.getByRole("button", { name: "Create my plan" }).click();
    await expect(page.getByRole("heading", { name: /Aarav/ })).toBeVisible();
    await page.screenshot({ path: `docs/assets/${s.file}.jpg`, type: "jpeg", quality: 80 });
    await context.close();
  });
}

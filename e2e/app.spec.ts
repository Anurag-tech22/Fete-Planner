import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const AXE = readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const future = (days: number) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);

async function createPlan(page: Page, name = "Meera’s Wedding") {
  await page.goto("/");
  await page.getByLabel("Event type").selectOption("wedding");
  await page.getByLabel("Event name").fill(name);
  await page.getByLabel("Event date").fill(future(60));
  await page.getByLabel("Must-haves, diet, accessibility").fill("Jain menu, wheelchair access");
  await page.getByRole("button", { name: "Create my plan" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(name) })).toBeVisible();
}

test("creates a personalised plan end to end", async ({ page }) => {
  await createPlan(page);
  await expect(page.getByRole("heading", { name: /Plan health: \d+\/100/ })).toBeVisible();
  await expect(page.getByLabel("Written Jain menu sign-off")).toBeVisible();
  await expect(page.getByText(/step-free venue/)).toBeVisible();
  await expect(page.getByRole("img", { name: /Budget split: Venue 25%/ })).toBeVisible();
});

test("tracks spending and warns when over budget", async ({ page }) => {
  await createPlan(page);
  await page.getByLabel("Actual spend (₹)").first().fill("99999999");
  await expect(page.getByText(/Over budget by/)).toBeVisible();
  await expect(page.getByText("Venue is over budget")).toBeVisible();
});

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme, bypassCSP: true });
    test("has no WCAG 2.2 A/AA violations (real colour contrast)", async ({ page }) => {
      await createPlan(page);
      await page.addScriptTag({ content: AXE });
      const violations = await page.evaluate(async (tags) => {
        const axe = (
          window as unknown as {
            axe: { run: (c: Document, o: object) => Promise<{ violations: { id: string }[] }> };
          }
        ).axe;
        return (await axe.run(document, { runOnly: tags })).violations.map((v) => v.id);
      }, TAGS);
      expect(violations).toEqual([]);
    });
  });
}

test("is keyboard operable from the first Tab", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Event type")).toBeFocused();
});

test("reflows at 320 px without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await createPlan(page);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
  ).toBe(true);
});

test("sends hardened headers in a real browser response", async ({ page }) => {
  const res = await page.request.get("/api/health");
  expect(res.headers()["content-security-policy"]).toContain("default-src 'self'");
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  expect(res.headers()["cache-control"]).toBe("no-store");
  expect(res.headers()["x-powered-by"]).toBeUndefined();
});

test("keeps working offline after the first visit (PWA)", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: /Plan the party/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create my plan" })).toBeVisible();
});

test.describe("share link", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });
  test("reopens the same plan in a fresh session", async ({ page, browser }) => {
    await createPlan(page, "Shared Mela");
    await page.getByRole("button", { name: "Copy share link" }).click();
    await expect(page.getByText("Share link copied.")).toBeVisible();
    const url = await page.evaluate(() => navigator.clipboard.readText());
    const context = await browser.newContext();
    const other = await context.newPage();
    await other.goto(url);
    await expect(other.getByRole("heading", { name: /Shared Mela/ })).toBeVisible();
    await context.close();
  });
});

test("runs with no console problems and no browser security or CSP issues", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "uses the Chrome DevTools Protocol");
  const client = await page.context().newCDPSession(page);
  const issues: string[] = [];
  const problems: string[] = [];
  client.on("Audits.issueAdded", (e) => issues.push(`${e.issue.code}: ${JSON.stringify(e.issue.details)}`));
  await client.send("Audits.enable");
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") problems.push(m.text());
  });
  page.on("pageerror", (e) => problems.push(e.message));
  await createPlan(page);
  await page.waitForTimeout(300);
  expect(issues).toEqual([]);
  expect(problems).toEqual([]);
});

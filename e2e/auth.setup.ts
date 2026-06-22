import { expect, test as setup } from "@playwright/test";

const authFile = "playwright/.auth/user.json";

// Logt in met je eigen account (uit env) en bewaart de sessie, zodat de
// rooktest de ingelogde pagina's kan opvragen.
setup("inloggen", async ({ page }) => {
  const email = process.env.SMOKE_EMAIL;
  const password = process.env.SMOKE_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Zet SMOKE_EMAIL en SMOKE_PASSWORD (je eigen login) in je omgeving — bv. in .env.local — om de rooktest te draaien.",
    );
  }

  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Aanmelden" }).click();

  // Na een geslaagde login stuurt de app door naar /dashboard.
  await page.waitForURL("**/dashboard", { timeout: 20_000 });
  await expect(page.getByText(/Welkom terug/i)).toBeVisible();

  await page.context().storageState({ path: authFile });
});

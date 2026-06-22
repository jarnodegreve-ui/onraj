import { expect, test } from "@playwright/test";

// Elke ingelogde pagina die nooit stuk mag renderen. Een crash in een
// server-component geeft HTTP 500 (zoals de /instellingen-bug eerder), en die
// vangen we hier vóór je erop valt.
const ROUTES = [
  "/dashboard",
  "/taken",
  "/notities",
  "/financien",
  "/agenda",
  "/statistieken",
  "/instellingen",
  "/wachtwoord",
];

for (const route of ROUTES) {
  test(`rendert zonder serverfout: ${route}`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });

    // Geen 4xx/5xx — een server-component-crash geeft 500.
    expect(
      response?.status() ?? 0,
      `HTTP-status van ${route}`,
    ).toBeLessThan(400);

    // Geen Next.js-foutscherm in de inhoud.
    await expect(
      page.getByText(
        /This page couldn.?t load|A server error occurred|Application error/i,
      ),
      `foutscherm op ${route}`,
    ).toHaveCount(0);

    // We zijn nog ingelogd (niet teruggestuurd naar /login).
    expect(page.url(), `${route} stuurde terug naar login`).not.toContain(
      "/login",
    );
  });
}

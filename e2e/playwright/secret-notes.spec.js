import { expect, test } from "@playwright/test";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8080";

// When set (CI passes the passive backend URL), config.js is intercepted so the
// UI talks to the freshly deployed backend color instead of the live one.
// This makes the e2e run a real "test green" for the backend before the switch.
const BACKEND_OVERRIDE = process.env.E2E_BACKEND_URL;

test.describe("Secret Notes E2E", () => {
  test.beforeEach(async ({ page }) => {
    if (BACKEND_OVERRIDE) {
      await page.route("**/config.js", (route) =>
        route.fulfill({
          contentType: "application/javascript",
          body: `globalThis.APP_CONFIG = { "API_BASE_URL": "${BACKEND_OVERRIDE}" };`
        })
      );
    }
  });

  test("user can create, read, and reject a secret note", async ({ page }) => {
    const noteText = `Playwright secret note ${Date.now()}`;
    const passphrase = "playwright-correct-passphrase";
    const wrongPassphrase = "playwright-wrong-passphrase";

    // Open the deployed frontend. In CI, FRONTEND_URL should point to staging.
    await page.goto(FRONTEND_URL);
    await expect(page).toHaveTitle(/Secret Notes/);

    // Create a note through the same form a real user uses.
    await page.locator("#createNote").fill(noteText);
    await page.locator("#createKey").fill(passphrase);
    await page.locator("#saveButton").click();

    // The UI writes the created note id into the status output and load form.
    await expect(page.locator("#output")).toContainText("Stored. ID =");
    await expect(page.locator("#loadNoteId")).not.toHaveValue("");
    const noteId = await page.locator("#loadNoteId").inputValue();

    // Read the note with the correct passphrase.
    await page.locator("#loadTab").click();
    await page.locator("#loadNoteId").fill(noteId);
    await page.locator("#loadKey").fill(passphrase);
    await page.getByRole("button", { name: "Load" }).click();

    await expect(page.locator("#output")).toContainText("Note loaded successfully");
    await expect(page.locator("#loadNoteContent")).toHaveValue(noteText);

    // The same note must not be readable with a wrong passphrase.
    await page.locator("#loadKey").fill(wrongPassphrase);
    await page.getByRole("button", { name: "Load" }).click();

    await expect(page.locator("#output")).toContainText("Invalid key or corrupted data");
  });

  test("feature toggle renders the group B experiment UI", async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await expect(page).toHaveTitle(/Secret Notes/);

    // Force the PostHog feature flag to the group_b variant and re-apply the experiment,
    // verifying the toggle-controlled UI path works end to end (spec: "Test Green" incl. feature toggles).
    await page.evaluate(() => {
      globalThis.posthog = {
        onFeatureFlags: (callback) => callback(),
        getFeatureFlag: () => "group_b"
      };
      globalThis.SecretNotes.applyTestGroupUIExperiment();
    });

    await expect(page.locator("#saveButton")).toHaveClass(/button-green/);
    await expect(page.locator("body")).toHaveClass(/experiment-bg-beige/);
    await expect(page.locator(".container")).toHaveClass(/experiment-container-brown/);
  });
});

const { test, expect } = require("./launcher_fixture.cjs");

const handoffPath = (path) => /^(\/|\/apps|\/home|\/leave|\/startup|\/watch)(\?|$)/.test(path);

async function setup(page, version = "10.0") {
  const requests = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://**/*", (route) => route.fulfill({ body: "{}" }));
  await page.route("http://127.0.0.1:47790/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith("/diagnostics/")) {
      await route.fulfill({ headers: { "Access-Control-Allow-Origin": "*" }, body: "{}" });
      return;
    }
    requests.push(path);
    await route.abort();
  });
  await page.addInitScript((platformVersion) => {
    window.testApp = { launches: [], legacyStarts: 0, starts: 0 };
    localStorage.setItem(
      "aerotizen.settings.v1",
      JSON.stringify({ home: ["youtube.app", "regular.app"], background: "black", showWeather: false }),
    );
    window.tizen = {
      systeminfo: { getCapability: () => platformVersion },
      ApplicationControl: function () {},
      application: {
        getAppsInfo(done) {
          done([
            { id: "youtube.app", name: "YouTube", packageId: "Youtube001" },
            { id: "regular.app", name: "Other app", packageId: "Regular001" },
          ]);
        },
        launchAppControl() {
          window.testApp.legacyStarts++;
        },
        launch(id, done) {
          window.testApp.launches.push(id);
          if (done) done();
        },
      },
    };
  }, version);
  await page.goto("/");
  await page.waitForFunction(() => window.AeroTizen?.apps.getSnapshot().ready);
  return { requests, errors };
}

test.describe("compiled plain app", () => {
  for (const version of ["9.0", "10.0"]) {
    test("starts without a watcher service on Tizen " + version, async ({ page }) => {
      const { requests, errors } = await setup(page, version);
      expect(await page.evaluate(() => window.testApp.starts)).toBe(0);
      expect(await page.evaluate(() => window.testApp.legacyStarts)).toBe(0);
      expect(requests.filter(handoffPath)).toEqual([]);
      expect(requests.some((path) => path.startsWith("/diagnostics/native-home"))).toBe(false);
      await page.locator("#gear").click();
      await page.locator('[data-key="section:about"]').click();
      await expect(page.getByText("Native Home tests", { exact: true })).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }

  test("opens a regular app directly without a watch request", async ({ page }) => {
    const { requests, errors } = await setup(page);
    await page.keyboard.press("ArrowRight");
    await expect(page.locator('#grid > [data-id="regular.app"]')).toBeFocused();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => window.testApp.launches.includes("regular.app"));
    expect(await page.evaluate(() => window.testApp.starts)).toBe(0);
    expect(await page.evaluate(() => window.testApp.legacyStarts)).toBe(0);
    expect(requests.filter(handoffPath)).toEqual([]);
    expect(errors).toEqual([]);
  });
});

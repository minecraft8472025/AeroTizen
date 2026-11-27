const { test, expect } = require("./launcher_fixture.cjs");
test.beforeEach(async ({ page }) => {
  await page.route("https://**/*", (route) => route.fulfill({ body: "{}" }));
  await page.route("http://127.0.0.1:47790/**", (route) => route.fulfill({ body: "{}" }));
  await page.addInitScript(() => {
    localStorage.setItem(
      "aerotizen.settings.v1",
      JSON.stringify({ home: ["__fire"], background: "black", showWeather: false, language: "en" }),
    );
  });
});
test("Fireplace remote controls update volume and stop drawing and audio on close", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.install();
  await page.addInitScript(() => {
    const probe = { frames: 0, opened: 0, closed: 0, sources: 0, gain: null };
    window.fireplaceProbe = probe;
    const clearRect = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.id === "fire-canvas") probe.frames++;
      return clearRect.apply(this, args);
    };
    window.AudioContext = class extends AudioContext {
      constructor() {
        super();
        probe.opened++;
        probe.gain = null;
      }
      createGain() {
        const gain = super.createGain();
        if (!probe.gain) probe.gain = gain.gain;
        return gain;
      }
      createBufferSource() {
        probe.sources++;
        return super.createBufferSource();
      }
      close() {
        probe.closed++;
        return super.close();
      }
    };
  });
  await page.goto("/");
  await page.waitForFunction(() => AeroTizen.apps.getSnapshot().ready);
  const tile = page.getByRole("button", { name: "Fireplace" });
  const overlay = page.locator("#fireplace");
  const volume = page.locator("#fire-volume");
  const getPlayback = () =>
    page.evaluate(() => {
      const { frames, opened, closed, sources, gain } = window.fireplaceProbe;
      return { frames, opened, closed, sources, level: gain?.value };
    });
  const getFlameTop = () =>
    page.evaluate(() => {
      const canvas = document.getElementById("fire-canvas");
      const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const offset = (y * canvas.width + x) * 4;
          if (pixels[offset] > 90 && pixels[offset + 1] > 30) {
            return y / canvas.height;
          }
        }
      }
      return 1;
    });
  await expect(tile).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveAttribute("role", "dialog");
  await expect(overlay).toHaveAttribute("aria-modal", "true");
  await expect(overlay.locator("canvas")).toHaveAttribute("width", "960");
  await expect(overlay.locator("canvas")).toHaveAttribute("aria-hidden", "true");
  await expect(overlay.getByRole("button", { name: "Close" })).toBeVisible();
  await expect(overlay.getByText("▲ ▼ Volume · Enter / Back Close")).toBeVisible();
  await page.clock.runFor(100);
  expect((await getPlayback()).frames).toBeGreaterThan(0);
  expect((await getPlayback()).sources).toBeGreaterThanOrEqual(2);
  await page.clock.runFor(900);
  expect(await getFlameTop()).toBeLessThan(0.75);
  await page.evaluate(() => window.Fireplace.open());
  expect((await getPlayback()).opened).toBe(1);
  await page.keyboard.press("ArrowUp");
  await expect(volume).toHaveText("Volume 7");
  await expect(volume).toHaveAttribute("data-visible", "true");
  await expect(volume).toHaveCSS("color", "rgb(255, 255, 255)");
  expect((await getPlayback()).level).toBeCloseTo(0.7);
  for (let level = 7; level > 0; level--) {
    await page.keyboard.press("ArrowDown");
  }
  await expect(volume).toHaveText("Muted");
  expect((await getPlayback()).level).toBe(0);
  await page.clock.runFor(1600);
  await expect(volume).not.toHaveAttribute("data-visible", "true");
  await page.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: AeroTizen.config.KEY.BACK }));
  });
  await expect(overlay).toBeHidden();
  await expect(tile).toBeFocused();
  const stopped = await getPlayback();
  expect(stopped.closed).toBe(1);
  await page.clock.runFor(1000);
  expect(await getPlayback()).toEqual(stopped);
  await page.keyboard.press("Enter");
  await expect(overlay).toBeVisible();
  await page.clock.runFor(100);
  const reopened = await getPlayback();
  expect(reopened.opened).toBe(2);
  expect(reopened.frames).toBeGreaterThan(stopped.frames);
  expect(reopened.level).toBe(0);
  await expect(volume).not.toHaveAttribute("data-visible", "true");
  await page.keyboard.press("Escape");
  await expect(overlay).toBeHidden();
  expect((await getPlayback()).closed).toBe(2);
  await page.keyboard.press("Enter");
  await expect(overlay).toBeVisible();
  await overlay.getByRole("button", { name: "Close" }).click();
  await expect(overlay).toBeHidden();
  await expect(tile).toBeFocused();
  expect((await getPlayback()).closed).toBe(3);
  expect(errors).toEqual([]);
});

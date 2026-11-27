const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { loadTypeScript } = require("./helpers/load_typescript.cjs");
const { createBackgrounds } = loadTypeScript("launcher/src/backgrounds/createBackgrounds.ts");
const { preview, SCENES } = loadTypeScript("launcher/src/backgrounds/scenes.ts");
const { THEME_WALLPAPER } = loadTypeScript("launcher/src/backgrounds/themePalette.ts");
const { needsWebGL } = loadTypeScript("launcher/src/contracts/backgrounds.ts");

const NEW_GRADIENTS = ["prism", "pastel", "afterglow", "twilightpeaks", "borealis"];
const GRADIENT_LAYER = /^(?:repeating-)?(?:linear|radial|conic)-gradient\(/;
const COLOUR_LAYER = /^(?:#[0-9a-f]{3,8}|rgba?\([^)]*\)|var\(--[\w-]+\))$/i;

const backgroundLayers = (value) => {
  const layers = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      layers.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  layers.push(value.slice(start).trim());
  return layers;
};

const assertPureCss = (value, label) => {
  assert.doesNotMatch(value, /url\(|image-set\(|image\(/i, `${label} uses an image`);
  for (const layer of backgroundLayers(value)) {
    assert.ok(GRADIENT_LAYER.test(layer) || COLOUR_LAYER.test(layer), `${label} has a non-gradient layer: ${layer}`);
  }
};

const setup = (previous) => {
  const calls = [];
  const controller = createBackgrounds({
    previous,
    renderState: (state) => calls.push(state && [state.current?.id ?? null, state.speed, state.suspended]),
  });
  return { ...controller, calls };
};

test("scene changes and speed changes render the requested background", () => {
  const { bridge, getState, calls, dispose } = setup();
  bridge.apply("waves");
  assert.equal(getState().suspended, false);
  bridge.setSpeed(1);
  bridge.apply("black", 2);
  bridge.setSpeed(2);
  assert.equal(getState().current.base, "#000000");
  dispose();
  assert.deepEqual(calls, [[null, 1, false], ["waves", 1, false], ["black", 2, false], null]);
});

test("saved Hokie and Custom backgrounds load their theme replacements", () => {
  const { bridge, getState, dispose } = setup();
  for (const [legacy, replacement] of Object.entries({
    hokie: "theme-glow",
    "hokie-stars": "theme-stars",
    "hokie-snow": "theme-snow",
    "hokie-rain": "theme-rain",
    "hokie-waves": "theme-waves",
    "custom-glow": "theme-glow",
    "custom-stars": "theme-stars",
    "custom-snow": "theme-snow",
    "custom-rain": "theme-rain",
    "custom-waves": "theme-waves",
  })) {
    bridge.apply(legacy);
    assert.equal(getState().current?.id, replacement, legacy);
  }
  dispose();
});

test("hot replacement preserves suspension and restores the saved scene at the new speed", () => {
  const original = setup();
  original.bridge.apply("snow");
  original.bridge.suspend();
  original.bridge.setSpeed(3);
  const suspended = setup(original.getState());
  assert.equal(suspended.getState().suspended, true);
  assert.deepEqual(suspended.calls, [["snow", 3, true]]);
  suspended.bridge.apply("snow");
  assert.equal(suspended.getState().suspended, false);
  assert.deepEqual(suspended.calls, [
    ["snow", 3, true],
    ["snow", 3, false],
  ]);
});

test("custom colours are validated and survive speed changes without replacing saved scene IDs", () => {
  const { bridge, getState } = setup();
  bridge.apply("custom", 1, "#FFF0CF");
  assert.equal(getState().current.base, "#fff0cf");
  bridge.setSpeed(2);
  assert.equal(getState().current.base, "#fff0cf");
  bridge.suspend();
  assert.equal(getState().suspended, true);
  bridge.apply("custom", 1, "url(https://example.com)");
  assert.equal(getState().current.base, "#7c5cff");
  bridge.apply("black");
  assert.equal(getState().current.base, "#000000");
  assert.equal(getState().suspended, false);
});

test("custom gradients retain both colours and their direction on speed changes", () => {
  const { bridge, getState } = setup();
  bridge.apply("custom-gradient", 1, undefined, { start: "#336699", end: "#ff0000", angle: 90 });
  assert.equal(getState().current.base, "linear-gradient(90deg, #336699, #ff0000)");
  bridge.setSpeed(2);
  assert.equal(getState().current.base, "linear-gradient(90deg, #336699, #ff0000)");
  assert.deepEqual(getState().current.gradient, { start: "#336699", end: "#ff0000", angle: 90 });
});

test("the new gradient backgrounds are static and pure CSS, with no imagery", () => {
  for (const id of NEW_GRADIENTS) {
    const scene = SCENES.find((candidate) => candidate.id === id);
    assert.ok(scene, `${id} is listed`);
    assert.equal(scene.anim, undefined, `${id} is static`);
    assert.equal(scene.category, undefined, `${id} is listed with the gradients`);
    assertPureCss(scene.base, id);
  }
});

test("Stage is an animated WebGL background with a pure CSS fallback and a still swatch", () => {
  const stage = SCENES.find((scene) => scene.id === "stage");
  assert.ok(stage, "Stage is listed");
  assert.equal(stage.anim, "stage");
  assert.equal(needsWebGL(stage), true);
  assertPureCss(stage.base, "Stage fallback");
  const swatch = preview(stage);
  assert.notEqual(swatch, stage.base, "the swatch shows a still frame, not only the fallback");
  assertPureCss(swatch, "Stage swatch");
});

test("theme wallpaper variants keep their animation types and have still swatches", () => {
  const variants = {
    "theme-glow": "blobs",
    "theme-stars": "stars",
    "theme-snow": "particles",
    "theme-rain": "particles",
    "theme-waves": "waves",
  };
  for (const [id, anim] of Object.entries(variants)) {
    const scene = SCENES.find((candidate) => candidate.id === id);
    assert.ok(scene, `${id} is listed`);
    assert.equal(scene.anim, anim, `${id} keeps its animation`);
    assert.equal(needsWebGL(scene), anim === "stars" || anim === "particles", `${id} WebGL requirement`);
    assert.match(scene.base, /var\(--wallpaper-/, `${id} uses the active theme colours`);
    assertPureCss(scene.base, `${id} base`);
    const swatch = preview(scene);
    assert.notEqual(swatch, scene.base, `${id} swatch shows a still frame, not only the base`);
    assertPureCss(swatch, `${id} swatch`);
  }
  assert.equal(
    SCENES.some(({ id }) => id.startsWith("hokie")),
    false,
    "Hokie-only scenes are gone",
  );
  assert.equal(
    SCENES.some(({ id }) => ["custom-glow", "custom-stars", "custom-snow", "custom-rain", "custom-waves"].includes(id)),
    false,
    "Custom-named animated scenes are gone",
  );
});

const rgbToHex = (colour) =>
  "#" +
  colour
    .split(",")
    .map((channel) => Number(channel.trim()).toString(16).padStart(2, "0"))
    .join("");

const cssColourToRgb = (colour) => {
  const hex = /^#([0-9a-f]{6})$/i.exec(colour);
  if (!hex) {
    return colour.replace(/\s+/g, "");
  }
  return [0, 2, 4].map((offset) => parseInt(hex[1].slice(offset, offset + 2), 16)).join(", ");
};

const cssContainsColour = (text, colour) => {
  const rgb = colour.replace(/\s+/g, "");
  const candidates = colour.startsWith("#") ? [colour, cssColourToRgb(colour)] : [colour, rgb, rgbToHex(colour)];
  return candidates.some((candidate) => text.includes(candidate));
};

test("wallpaper palettes mirror the colours of their theme sheets", () => {
  const cssDir = path.resolve(__dirname, "../launcher/css");
  assert.deepEqual(Object.keys(THEME_WALLPAPER).sort(), [
    "amethyst",
    "classic",
    "frost",
    "glass",
    "gloss",
    "halo",
    "hokie",
    "mint",
    "pop",
  ]);
  for (const [theme, palette] of Object.entries(THEME_WALLPAPER)) {
    const text = readFileSync(path.join(cssDir, `theme-${theme}.css`), "utf8");
    for (const [name, value] of Object.entries(palette)) {
      assert.ok(cssContainsColour(text, value), `${theme} ${name} (${value}) is in its theme sheet`);
    }
  }
  assert.deepEqual(THEME_WALLPAPER.hokie, {
    base: "#150409",
    primary: "229, 117, 31",
    secondary: "134, 31, 65",
  });
});

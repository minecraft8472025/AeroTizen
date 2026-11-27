import { render } from "@testing-library/preact";
import { expect, test, vi } from "vitest";

import type { BackgroundGraphics } from "../../contracts/backgrounds";
import type { SettingsSnapshot } from "../../contracts/preferences";
import { createStore } from "../../shared/state/createStore";
import { SCENES } from "../scenes";
import { THEME_WALLPAPER } from "../themePalette";

import { BackgroundSceneView } from "./BackgroundSceneView";

const settings = createStore<SettingsSnapshot>({ theme: "hokie" } as SettingsSnapshot);

test("performance mode keeps a static nebula even when WebGL is unavailable", () => {
  const scene = SCENES.find(({ id }) => id === "nebula")!;
  const webGL: BackgroundGraphics = { ...createStore(false), check: vi.fn() };
  const { container } = render(
    <BackgroundSceneView
      scene={scene}
      settings={settings}
      speed={1}
      webGL={webGL}
      reportWebGL={vi.fn()}
      performanceMode
    />,
  );
  expect(container.querySelectorAll('[data-background-blob][data-static="true"]')).toHaveLength(4);
  expect(container.querySelector("canvas")).toBeNull();
});

test("Stage is not drawn when WebGL is unavailable, so its static fallback shows", () => {
  const scene = SCENES.find(({ id }) => id === "stage")!;
  const webGL: BackgroundGraphics = { ...createStore(false), check: vi.fn() };
  const { container } = render(
    <BackgroundSceneView scene={scene} settings={settings} speed={1} webGL={webGL} reportWebGL={vi.fn()} />,
  );
  expect(container.querySelector("[data-stage-background]")).toBeNull();
  expect(container.querySelector("canvas")).toBeNull();
});

test("performance mode keeps Stage still on its static fallback", () => {
  const scene = SCENES.find(({ id }) => id === "stage")!;
  const webGL: BackgroundGraphics = { ...createStore(true), check: vi.fn() };
  const { container } = render(
    <BackgroundSceneView
      scene={scene}
      settings={settings}
      speed={1}
      webGL={webGL}
      reportWebGL={vi.fn()}
      performanceMode
    />,
  );
  expect(container.querySelector("[data-stage-background]")).toBeNull();
  expect(container.querySelector("canvas")).toBeNull();
});

test("Stage reports that WebGL is unavailable when the TV cannot create a WebGL context", () => {
  const scene = SCENES.find(({ id }) => id === "stage")!;
  const webGL: BackgroundGraphics = { ...createStore(undefined), check: vi.fn() };
  const reportWebGL = vi.fn();
  const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const { container } = render(
    <BackgroundSceneView scene={scene} settings={settings} speed={1} webGL={webGL} reportWebGL={reportWebGL} />,
  );
  expect(container.querySelector("[data-stage-background]")).not.toBeNull();
  expect(reportWebGL).toHaveBeenCalledWith(false);
  expect(reportWebGL).not.toHaveBeenCalledWith(true);
  getContext.mockRestore();
});

test("theme waves use the active theme palette with Hokie colours in the Hokie theme", () => {
  const scene = SCENES.find(({ id }) => id === "theme-waves")!;
  const webGL: BackgroundGraphics = { ...createStore(true), check: vi.fn() };
  const { container } = render(
    <BackgroundSceneView scene={scene} settings={settings} speed={1} webGL={webGL} reportWebGL={vi.fn()} />,
  );
  expect(container.querySelector('[data-background-wave="back"] path')?.getAttribute("fill")).toBe(
    "rgba(var(--wallpaper-alt-rgb), .42)",
  );
  expect(container.querySelector('[data-background-wave="front"] path')?.getAttribute("fill")).toBe(
    "rgba(var(--wallpaper-rgb), .38)",
  );
  expect(THEME_WALLPAPER.hokie.primary).toBe("229, 117, 31");
  expect(THEME_WALLPAPER.hokie.secondary).toBe("134, 31, 65");
});

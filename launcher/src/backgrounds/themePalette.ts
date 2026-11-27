import type { Theme } from "../contracts/preferences";

export interface WallpaperPalette {
  readonly base: string;
  /** Comma-separated RGB channels, matching the CSS custom properties. */
  readonly primary: string;
  readonly secondary: string;
}

// Mirrors the accent colours already used by each theme sheet. mountHome writes these
// to the root element for CSS wallpapers; WebGL particles consume them directly.
export const THEME_WALLPAPER: Record<Theme, WallpaperPalette> = {
  classic: { base: "#000", primary: "124, 92, 255", secondary: "108, 182, 255" },
  glass: { base: "#000", primary: "237, 242, 255", secondary: "169, 198, 235" },
  pop: { base: "#3a0d2a", primary: "255, 45, 120", secondary: "224, 17, 95" },
  frost: { base: "#f1eef4", primary: "42, 47, 58", secondary: "60, 50, 90" },
  gloss: { base: "#120816", primary: "255, 122, 89", secondary: "74, 91, 255" },
  amethyst: { base: "#0c0616", primary: "196, 169, 255", secondary: "169, 133, 239" },
  hokie: { base: "#150409", primary: "229, 117, 31", secondary: "134, 31, 65" },
  mint: { base: "#0c0d10", primary: "25, 227, 177", secondary: "21, 201, 224" },
  halo: { base: "#020d0c", primary: "95, 245, 181", secondary: "150, 255, 220" },
};

export const rgba = (rgb: string, alpha: number) => `rgba(${rgb}, ${alpha})`;

export const glslRgb = (rgb: string) =>
  rgb
    .split(",")
    .map((channel) => Number(channel.trim()).toFixed(1))
    .join(", ");

import type { BackgroundGraphics, BackgroundScene } from "../../contracts/backgrounds";
import { needsWebGL } from "../../contracts/backgrounds";
import type { SettingsSnapshot } from "../../contracts/preferences";
import { useStore, useStoreSelector } from "../../shared/hooks/useStore";
import type { Store } from "../../shared/state/createStore";
import { blob } from "../scenes";
import { StageBackground } from "../StageBackground/StageBackground";
import { THEME_WALLPAPER } from "../themePalette";
import { WaveBackground } from "../WaveBackground/WaveBackground";
import { WebGLParticleCanvas } from "../WebGLParticleCanvas/WebGLParticleCanvas";

import styles from "./BackgroundSceneView.module.css";

const BLOB_SPOTS = [
  { className: styles.drift0, left: "-10%", top: "-20%", size: 1100, seconds: 11 },
  { className: styles.drift1, left: "55%", top: "35%", size: 1200, seconds: 14 },
  { className: styles.drift2, left: "20%", top: "55%", size: 1000, seconds: 16 },
  { className: styles.drift3, left: "70%", top: "-15%", size: 900, seconds: 12 },
];
const SLOW_SECONDS = 22;

interface Props {
  performanceMode?: boolean;
  reportWebGL(available: boolean): void;
  scene: BackgroundScene;
  settings: Store<SettingsSnapshot>;
  speed: number;
  webGL: BackgroundGraphics;
}

export const BackgroundSceneView = ({ scene, settings, speed, webGL, reportWebGL, performanceMode = false }: Props) => {
  const available = useStore(webGL);
  const theme = useStoreSelector(settings, (snapshot) => snapshot.theme);
  const palette = THEME_WALLPAPER[theme];
  if (!performanceMode && available === false && needsWebGL(scene)) {
    return null;
  }
  switch (scene.anim) {
    case "blobs":
      return (
        <>
          {scene.blobs.map((color, index) => {
            const spot = BLOB_SPOTS[index % BLOB_SPOTS.length];
            return (
              <div
                key={index}
                class={styles.blob + " " + spot.className}
                data-background-blob
                data-static={performanceMode ? "true" : undefined}
                style={{
                  animationDuration: (scene.slow ? SLOW_SECONDS : spot.seconds) / speed + "s",
                  left: spot.left,
                  top: spot.top,
                  width: spot.size,
                  height: spot.size,
                  background: blob(color),
                }}
              />
            );
          })}
          {scene.stars && !performanceMode && (
            <WebGLParticleCanvas kind="nebula" speed={speed} reportWebGL={reportWebGL} />
          )}
        </>
      );
    case "waves":
      return <WaveBackground speed={speed} performanceMode={performanceMode} palette={scene.palette} />;
    case "stars":
      return performanceMode ? null : (
        <WebGLParticleCanvas
          kind={scene.palette === "theme" ? "custom-stars" : "stars"}
          palette={scene.palette === "theme" ? palette : undefined}
          speed={speed}
          reportWebGL={reportWebGL}
        />
      );
    case "particles":
      return performanceMode ? null : (
        <WebGLParticleCanvas
          kind={scene.kind}
          palette={scene.kind === "custom-snow" || scene.kind === "custom-rain" ? palette : undefined}
          speed={speed}
          reportWebGL={reportWebGL}
        />
      );
    case "stage":
      return performanceMode ? null : <StageBackground speed={speed} reportWebGL={reportWebGL} />;
    default:
      return null;
  }
};

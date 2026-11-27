import styles from "./WaveBackground.module.css";

const WAVE_LAYERS = {
  ocean: [
    {
      name: "back",
      seconds: 28,
      fill: "rgba(30,130,190,.28)",
      path: "M0 60 Q 240 20 480 60 T 960 60 T 1440 60 T 1920 60 V 200 H 0 Z",
    },
    {
      name: "front",
      seconds: 18,
      fill: "rgba(20,90,150,.38)",
      path: "M0 80 Q 240 40 480 80 T 960 80 T 1440 80 T 1920 80 V 200 H 0 Z",
    },
  ],
  hokie: [
    {
      name: "back",
      seconds: 28,
      fill: "rgba(134,31,65,.42)",
      path: "M0 60 Q 240 20 480 60 T 960 60 T 1440 60 T 1920 60 V 200 H 0 Z",
    },
    {
      name: "front",
      seconds: 18,
      fill: "rgba(229,117,31,.38)",
      path: "M0 80 Q 240 40 480 80 T 960 80 T 1440 80 T 1920 80 V 200 H 0 Z",
    },
  ],
} as const;

export const WaveBackground = ({
  speed,
  performanceMode = false,
  palette = "ocean",
}: {
  speed: number;
  performanceMode?: boolean;
  palette?: keyof typeof WAVE_LAYERS;
}) => (
  <>
    {WAVE_LAYERS[palette].map((layer) => (
      <div
        key={layer.name}
        class={styles.wave}
        data-background-wave={layer.name}
        data-static={performanceMode ? "true" : undefined}
        style={{ animationDuration: layer.seconds / speed + "s" }}
      >
        <svg viewBox="0 0 1920 200" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path fill={layer.fill} d={layer.path} />
          <path fill={layer.fill} transform="translate(1920 0)" d={layer.path} />
        </svg>
      </div>
    ))}
  </>
);

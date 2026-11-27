export const FIRE_WIDTH = 960;
export const FIRE_HEIGHT = 540;

const FRAME_MS = 33;
const MAX_EMBERS = 72;
const TAU = Math.PI * 2;

interface Ember {
  life: number;
  maxLife: number;
  phase: number;
  size: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
}

interface Flame {
  readonly alpha: number;
  readonly height: number;
  readonly hot: boolean;
  readonly offset: number;
  readonly phase: number;
  readonly speed: number;
  readonly sway: number;
  readonly width: number;
}

const FLAMES: readonly Flame[] = [
  { alpha: 0.46, height: 0.36, hot: false, offset: -0.23, phase: 0.4, speed: 0.82, sway: 0.032, width: 0.14 },
  { alpha: 0.52, height: 0.5, hot: false, offset: -0.08, phase: 1.7, speed: 1.02, sway: 0.044, width: 0.17 },
  { alpha: 0.5, height: 0.44, hot: false, offset: 0.06, phase: 2.9, speed: 0.94, sway: 0.038, width: 0.16 },
  { alpha: 0.44, height: 0.33, hot: false, offset: 0.21, phase: 4.1, speed: 1.12, sway: 0.028, width: 0.12 },
  { alpha: 0.62, height: 0.34, hot: true, offset: -0.13, phase: 0.9, speed: 1.32, sway: 0.024, width: 0.1 },
  { alpha: 0.7, height: 0.42, hot: true, offset: 0.01, phase: 2.2, speed: 1.18, sway: 0.03, width: 0.12 },
  { alpha: 0.58, height: 0.3, hot: true, offset: 0.15, phase: 3.6, speed: 1.44, sway: 0.021, width: 0.09 },
];

const flamePath = (
  context: CanvasRenderingContext2D,
  centerX: number,
  baseY: number,
  tipX: number,
  tipY: number,
  width: number,
) => {
  context.beginPath();
  context.moveTo(centerX - width / 2, baseY);
  context.bezierCurveTo(
    centerX - width * 0.58,
    baseY - (baseY - tipY) * 0.34,
    tipX - width * 0.32,
    baseY - (baseY - tipY) * 0.74,
    tipX,
    tipY,
  );
  context.bezierCurveTo(
    tipX + width * 0.26,
    baseY - (baseY - tipY) * 0.7,
    centerX + width * 0.54,
    baseY - (baseY - tipY) * 0.32,
    centerX + width / 2,
    baseY,
  );
  context.closePath();
};

export const startFireAnimation = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const embers: Ember[] = [];
  const baseY = FIRE_HEIGHT * 0.94;
  let frame = 0;
  let lastDraw = 0;
  let animationFrame = 0;

  const drawGlow = () => {
    const outer = context.createRadialGradient(
      FIRE_WIDTH / 2,
      FIRE_HEIGHT * 1.02,
      FIRE_WIDTH * 0.02,
      FIRE_WIDTH / 2,
      FIRE_HEIGHT * 1.02,
      FIRE_WIDTH * 0.66,
    );
    outer.addColorStop(0, "rgba(255, 124, 28, 0.36)");
    outer.addColorStop(0.45, "rgba(204, 52, 10, 0.18)");
    outer.addColorStop(1, "rgba(80, 12, 2, 0)");
    context.fillStyle = outer;
    context.fillRect(0, FIRE_HEIGHT * 0.2, FIRE_WIDTH, FIRE_HEIGHT * 0.8);

    context.save();
    context.translate(FIRE_WIDTH / 2, baseY);
    context.scale(1, 0.3);
    const coals = context.createRadialGradient(0, 0, 0, 0, 0, FIRE_WIDTH * 0.34);
    coals.addColorStop(0, "rgba(255, 226, 132, 0.5)");
    coals.addColorStop(0.42, "rgba(255, 108, 20, 0.32)");
    coals.addColorStop(1, "rgba(196, 34, 8, 0)");
    context.fillStyle = coals;
    context.fillRect(-FIRE_WIDTH * 0.34, -FIRE_WIDTH * 0.34, FIRE_WIDTH * 0.68, FIRE_WIDTH * 0.68);
    context.restore();
  };

  const drawFlame = (flame: Flame, time: number) => {
    const flicker = 0.88 + 0.12 * Math.sin(time * flame.speed * 2.6 + flame.phase * 1.7);
    const height = FIRE_HEIGHT * flame.height * flicker;
    const width = FIRE_WIDTH * flame.width * (0.92 + 0.08 * Math.sin(time * 2.1 + flame.phase));
    const centerX = FIRE_WIDTH * (0.5 + flame.offset) + Math.sin(time * flame.speed + flame.phase) * FIRE_WIDTH * 0.008;
    const tipX = centerX + Math.sin(time * flame.speed * 0.72 + flame.phase) * FIRE_WIDTH * flame.sway;
    const tipY = baseY - height;
    const gradient = context.createLinearGradient(centerX, baseY, tipX, tipY);

    if (flame.hot) {
      gradient.addColorStop(0, "rgba(255, 247, 206, 0.95)");
      gradient.addColorStop(0.22, "rgba(255, 208, 92, 0.88)");
      gradient.addColorStop(0.58, "rgba(255, 116, 22, 0.62)");
      gradient.addColorStop(1, "rgba(214, 38, 8, 0)");
    } else {
      gradient.addColorStop(0, "rgba(255, 164, 44, 0.78)");
      gradient.addColorStop(0.34, "rgba(238, 88, 14, 0.6)");
      gradient.addColorStop(0.72, "rgba(178, 30, 8, 0.32)");
      gradient.addColorStop(1, "rgba(92, 8, 2, 0)");
    }

    context.save();
    context.globalAlpha = flame.alpha;
    context.fillStyle = gradient;
    context.shadowColor = flame.hot ? "rgba(255, 182, 72, 0.75)" : "rgba(226, 72, 12, 0.55)";
    context.shadowBlur = FIRE_WIDTH * (flame.hot ? 0.018 : 0.03);
    flamePath(context, centerX, baseY, tipX, tipY, width);
    context.fill();

    if (flame.hot) {
      context.globalAlpha = flame.alpha * 0.5;
      context.shadowBlur = 0;
      context.fillStyle = "rgba(255, 251, 224, 0.75)";
      flamePath(context, centerX, baseY + 4, tipX, baseY - height * 0.52, width * 0.34);
      context.fill();
    }
    context.restore();
  };

  const drawLog = (x: number, angle: number, length: number) => {
    context.save();
    context.translate(x, baseY + 6);
    context.rotate(angle);

    const gradient = context.createLinearGradient(0, -17, 0, 17);
    gradient.addColorStop(0, "#4c2a19");
    gradient.addColorStop(0.45, "#2b160e");
    gradient.addColorStop(1, "#120906");
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(-length / 2 + 18, -15);
    context.lineTo(length / 2 - 18, -15);
    context.quadraticCurveTo(length / 2, 0, length / 2 - 18, 15);
    context.lineTo(-length / 2 + 18, 15);
    context.quadraticCurveTo(-length / 2, 0, -length / 2 + 18, -15);
    context.closePath();
    context.fill();

    context.strokeStyle = "rgba(255, 142, 56, 0.22)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-length * 0.34, -8);
    context.quadraticCurveTo(0, -13, length * 0.34, -8);
    context.stroke();

    context.strokeStyle = "rgba(0, 0, 0, 0.45)";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(-length * 0.2, 6);
    context.quadraticCurveTo(length * 0.05, 1, length * 0.28, 7);
    context.stroke();
    context.restore();
  };

  const drawLogs = () => {
    drawLog(FIRE_WIDTH / 2, -0.12, FIRE_WIDTH * 0.46);
    drawLog(FIRE_WIDTH / 2, 0.13, FIRE_WIDTH * 0.42);
  };

  const spawnEmbers = () => {
    if (embers.length >= MAX_EMBERS || Math.random() > 0.55) {
      return;
    }
    embers.push({
      life: 0,
      maxLife: 44 + Math.random() * 74,
      phase: Math.random() * TAU,
      size: FIRE_WIDTH * (0.001 + Math.random() * 0.0016),
      vx: (Math.random() * 2 - 1) * FIRE_WIDTH * 0.0004,
      vy: -FIRE_HEIGHT * (0.0012 + Math.random() * 0.0022),
      x: FIRE_WIDTH / 2 + (Math.random() * 2 - 1) * FIRE_WIDTH * 0.23,
      y: baseY - Math.random() * FIRE_HEIGHT * 0.06,
    });
  };

  const drawEmbers = (time: number) => {
    context.save();
    context.globalCompositeOperation = "lighter";
    for (let index = embers.length - 1; index >= 0; index--) {
      const ember = embers[index];
      ember.life++;
      ember.x += ember.vx + Math.sin(time * 2.4 + ember.phase) * FIRE_WIDTH * 0.00035;
      ember.y += ember.vy;
      ember.vy *= 0.995;
      const alpha = 1 - ember.life / ember.maxLife;
      if (alpha <= 0 || ember.y < FIRE_HEIGHT * 0.08) {
        embers.splice(index, 1);
        continue;
      }
      context.globalAlpha = alpha * 0.9;
      context.fillStyle = alpha > 0.6 ? "#ffe7a6" : "#ff9b36";
      context.shadowColor = "rgba(255, 150, 48, 0.8)";
      context.shadowBlur = FIRE_WIDTH * 0.008;
      context.beginPath();
      context.arc(ember.x, ember.y, ember.size, 0, TAU);
      context.fill();
    }
    context.restore();
  };

  const draw = () => {
    const time = ++frame * 0.016;
    context.clearRect(0, 0, FIRE_WIDTH, FIRE_HEIGHT);

    context.save();
    context.globalCompositeOperation = "lighter";
    drawGlow();
    for (const flame of FLAMES) {
      drawFlame(flame, time);
    }
    context.restore();

    drawLogs();
    spawnEmbers();
    drawEmbers(time);
  };

  const animate = (now: number) => {
    if (now - lastDraw > FRAME_MS) {
      draw();
      lastDraw = now;
    }
    animationFrame = window.requestAnimationFrame(animate);
  };
  animationFrame = window.requestAnimationFrame(animate);

  return () => window.cancelAnimationFrame(animationFrame);
};

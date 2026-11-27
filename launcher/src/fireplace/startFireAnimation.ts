export const FIRE_WIDTH = 256;
export const FIRE_HEIGHT = 144;
const MAX_HEAT = 36;
const MAX_EMBERS = 64;
const RISE_STEPS = 4;

const PALETTE_STOPS = [
  { level: 0, rgb: [0, 0, 0] },
  { level: 40, rgb: [40, 4, 2] },
  { level: 90, rgb: [140, 24, 4] },
  { level: 140, rgb: [220, 80, 10] },
  { level: 190, rgb: [250, 160, 40] },
  { level: 255, rgb: [255, 236, 170] },
] as const;

interface Ember {
  life: number;
  maxLife: number;
  size: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
}

const buildPalette = () => {
  const palette = new Uint8ClampedArray(256 * 3);
  let stop = 0;
  for (let level = 0; level < 256; level++) {
    while (level > PALETTE_STOPS[stop + 1].level) {
      stop++;
    }
    const low = PALETTE_STOPS[stop];
    const high = PALETTE_STOPS[stop + 1];
    const blend = (level - low.level) / (high.level - low.level);
    for (let channel = 0; channel < 3; channel++) {
      palette[level * 3 + channel] = low.rgb[channel] + (high.rgb[channel] - low.rgb[channel]) * blend;
    }
  }
  return palette;
};

export const startFireAnimation = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }
  const image = context.createImageData(FIRE_WIDTH, FIRE_HEIGHT);
  let heat = new Uint8Array(FIRE_WIDTH * FIRE_HEIGHT);
  let next = new Uint8Array(FIRE_WIDTH * FIRE_HEIGHT);
  const palette = buildPalette();
  const embers: Ember[] = [];
  let frame = 0;
  let lastDraw = 0;

  const seedHearth = (time: number) => {
    const middle = FIRE_WIDTH / 2;
    const bottom = (FIRE_HEIGHT - 1) * FIRE_WIDTH;
    for (let x = 0; x < FIRE_WIDTH; x++) {
      const distance = Math.abs(x - middle) / middle;
      const logs =
        Math.max(0, 1 - distance * 1.25) + 0.22 * Math.sin(x * 0.08 + time) + 0.18 * Math.sin(x * 0.041 - time * 1.6);
      const level =
        logs > 0.2 ? MAX_HEAT - Math.floor(Math.random() * 7) : Math.floor(MAX_HEAT * Math.max(0, logs) * 2.4);
      heat[bottom + x] = level;
    }
  };

  const riseOnce = () => {
    for (let y = 1; y < FIRE_HEIGHT; y++) {
      const source = y * FIRE_WIDTH;
      const destination = (y - 1) * FIRE_WIDTH;
      next.fill(0, destination, destination + FIRE_WIDTH);
      for (let x = 0; x < FIRE_WIDTH; x++) {
        const level = heat[source + x];
        if (level === 0) {
          continue;
        }
        const drift = Math.floor(Math.random() * 3) - 1;
        const target = Math.max(0, Math.min(FIRE_WIDTH - 1, x + drift));
        const cooled = Math.max(0, level - (Math.random() < 0.18 ? 1 : 0));
        next[destination + target] = Math.max(next[destination + target], cooled);
      }
    }
    const swap = heat;
    heat = next;
    next = swap;
  };

  const rise = () => {
    for (let step = 0; step < RISE_STEPS; step++) {
      riseOnce();
    }
  };

  const paintHeat = () => {
    const pixels = image.data;
    for (let i = 0; i < heat.length; i++) {
      const color = Math.floor((heat[i] * 255) / MAX_HEAT) * 3;
      pixels[i * 4] = palette[color];
      pixels[i * 4 + 1] = palette[color + 1];
      pixels[i * 4 + 2] = palette[color + 2];
      pixels[i * 4 + 3] = 255;
    }
    context.putImageData(image, 0, 0);
  };

  const spawnEmbers = () => {
    if (embers.length >= MAX_EMBERS || Math.random() > 0.75) {
      return;
    }
    const spread = FIRE_WIDTH * 0.34;
    embers.push({
      x: FIRE_WIDTH / 2 + (Math.random() * 2 - 1) * spread,
      y: FIRE_HEIGHT - 3,
      vx: (Math.random() * 2 - 1) * 0.22,
      vy: 0.35 + Math.random() * 0.6,
      life: 0,
      maxLife: 28 + Math.random() * 58,
      size: 0.6 + Math.random() * 1.5,
    });
  };

  const paintGlowAndEmbers = () => {
    context.save();
    context.globalCompositeOperation = "lighter";
    const glow = context.createRadialGradient(
      FIRE_WIDTH / 2,
      FIRE_HEIGHT,
      0,
      FIRE_WIDTH / 2,
      FIRE_HEIGHT,
      FIRE_WIDTH * 0.72,
    );
    glow.addColorStop(0, "rgba(255, 118, 24, 0.24)");
    glow.addColorStop(0.5, "rgba(196, 48, 8, 0.1)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = glow;
    context.fillRect(0, FIRE_HEIGHT - FIRE_WIDTH * 0.72, FIRE_WIDTH, FIRE_WIDTH * 0.72);

    for (let index = embers.length - 1; index >= 0; index--) {
      const ember = embers[index];
      ember.life++;
      ember.x += ember.vx;
      ember.y -= ember.vy;
      ember.vx += (Math.random() - 0.5) * 0.04;
      const alpha = Math.max(0, 1 - ember.life / ember.maxLife);
      if (alpha === 0 || ember.y < 0) {
        embers.splice(index, 1);
        continue;
      }
      context.beginPath();
      context.fillStyle = `rgba(255, ${150 + Math.floor(alpha * 80)}, 48, ${alpha * 0.85})`;
      context.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();

    context.save();
    context.fillStyle = "rgba(22, 7, 3, 0.92)";
    for (const angle of [-0.12, 0.12]) {
      context.save();
      context.translate(FIRE_WIDTH / 2, FIRE_HEIGHT - 5);
      context.rotate(angle);
      context.fillRect(-FIRE_WIDTH * 0.18, -4, FIRE_WIDTH * 0.36, 8);
      context.restore();
    }
    context.restore();
  };

  const draw = () => {
    const time = ++frame * 0.02;
    seedHearth(time);
    rise();
    paintHeat();
    spawnEmbers();
    paintGlowAndEmbers();
  };

  const animate = (now: number) => {
    if (now - lastDraw > 33) {
      draw();
      lastDraw = now;
    }
    animationFrame = window.requestAnimationFrame(animate);
  };
  let animationFrame = window.requestAnimationFrame(animate);
  return () => window.cancelAnimationFrame(animationFrame);
};

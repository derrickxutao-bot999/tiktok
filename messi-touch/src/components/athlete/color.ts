// Colour arithmetic for the figure: kit colours are pulled towards the body
// tone so that only the shirt carries full saturation.

const parse = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const toHex = (c: readonly number[]) =>
  "#" + c.map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, "0")).join("");

/** Linear mix in sRGB: t = 0 gives a, t = 1 gives b. */
export const mix = (a: string, b: string, t: number) => {
  const ca = parse(a);
  const cb = parse(b);
  return toHex(ca.map((x, i) => x + (cb[i] - x) * t));
};

/** Relative luminance, 0..1 (rough, sRGB weights). */
const luma = (c: string) => {
  const [r, g, b] = parse(c);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

/** Hue (degrees) and saturation (0..1, HSV) of a colour. */
const hueSat = (c: string): [number, number] => {
  const [r, g, b] = parse(c).map((x) => x / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d < 1e-6) return [0, 0];
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, max ? d / max : 0];
};

/**
 * A kit colour sunk into the body tone. Bright colours (white socks) are
 * pulled further, and so is anything that shares the hero's hue (pink shorts
 * under a pink shirt), so nothing competes with the shirt.
 */
export const sink = (kit: string, body: string, amount: number, hero?: string) => {
  let a = amount + 0.25 * luma(kit);
  if (hero) {
    const [hk, sk] = hueSat(kit);
    const [hh, sh] = hueSat(hero);
    const dh = Math.min(Math.abs(hk - hh), 360 - Math.abs(hk - hh));
    if (sk > 0.2 && sh > 0.2 && dh < 30) a += 0.22;
  }
  return mix(kit, body, Math.min(0.9, a));
};

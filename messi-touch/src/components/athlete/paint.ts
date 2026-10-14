// What each part of the figure is painted with, per look and world.
// The shirt is the only saturated thing; every other kit colour is sunk
// towards the body tone, and far-side parts sink further into the dark.

import { Look, ShirtPattern, WorldStyle } from "../../lib/eras";
import { Light, PALETTE, lightOf } from "../../lib/palette";
import { mix, sink } from "./color";
import { Fill } from "./figure";

export type Paint = {
  light: Light;
  /** Solid colours by fill kind; "body", "far" and "shirt" are gradients built by the renderer. */
  solid: Record<Exclude<Fill, "body" | "far" | "shirt">, string>;
  /** The shirt's pattern, with dark kit colours lifted so they still carry light. */
  pattern: ShirtPattern;
  /** The shirt's dominant colour (bloom, edge light). */
  hero: string;
  /** Edge light of the jersey: the hero colour lifted towards white. */
  heroEdge: string;
  /** Light falls off into a deep version of the hero colour, never into grey: stained glass, not paint. */
  heroDeep: string;
  /** Hairline colours. */
  sockBand: string;
  seamLine: string;
  lace: string;
  silver: string;
  /** Point light of the eye, and the colour of the iris (the era's accent). */
  eye: string;
  iris: string;
  /** Stars above the crest. */
  gold: string;
};

const DUSK = PALETTE["rosario-dusk"];
/** The gold of the Barcelona numbers doubles as the gold of the stars. */
const GOLD = "#F2C14E";

export const paintOf = (look: Look, world: WorldStyle): Paint => {
  const L = lightOf(world);
  const kit = look.kit;
  const shirt = kit.shirt;
  const hero = shirt.kind === "solid" ? shirt.color : shirt.colors[0];
  const heroDeep = mix(hero, L.body, 0.6);
  const shorts = sink(kit.shorts, L.body, 0.5, hero);
  const socks = sink(kit.socks, L.body, 0.52, hero);
  const dusk = world === "rosario-dusk";
  const worn = look.boot === "worn";
  // Warm leather answers the sun at dusk; under floodlights it sinks back into the night.
  const boot = worn ? mix(DUSK.dirtFar, L.body, dusk ? 0.55 : 0.72) : mix(L.bodyFar, L.body, 0.55);
  const sole = mix(DUSK.line, L.body, 0.72);
  const hair = mix(L.body, L.bodyFar, 0.55);
  const far = (c: string) => mix(c, L.bodyFar, 0.5);
  // A black half would read as a hole in the light: lift it into the hero's deep tone.
  const pattern: ShirtPattern = shirt.kind === "halves" ? { kind: "halves", colors: [shirt.colors[0], mix(shirt.colors[1], heroDeep, 0.4)] } : shirt;
  return {
    light: L,
    solid: {
      sleeve: kit.sleeve,
      sleeveFar: mix(kit.sleeve, L.bodyFar, 0.62),
      shorts,
      shortsFar: far(shorts),
      socks,
      socksFar: far(socks),
      boot,
      bootFar: far(boot),
      sole,
      soleFar: far(sole),
      mouth: mix(L.bodyFar, "#000000", 0.45),
      hair,
      beard: mix(L.body, L.bodyFar, 0.5),
    },
    pattern,
    hero,
    heroEdge: mix(hero, "#FFFFFF", 0.6),
    heroDeep,
    sockBand: kit.sockBand,
    seamLine: look.boot === "modern" ? look.accent : look.boot === "classic" ? mix(L.contour, "#FFFFFF", 0.4) : mix(DUSK.line, boot, 0.35),
    lace: mix(DUSK.line, boot, 0.25),
    silver: mix(L.contour, "#FFFFFF", 0.5),
    eye: mix(L.contour, "#FFFFFF", 0.7),
    iris: look.accent,
    gold: GOLD,
  };
};

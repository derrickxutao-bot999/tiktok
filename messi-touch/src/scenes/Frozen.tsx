// The frozen instant both scenes share: Scene 1 ends on it and Scene 4 opens on it.

import React from "react";
import { TheTouch } from "../components/TheTouch";
import { eraScaleAtT } from "../lib/clock";
import { ERAS, Look } from "../lib/eras";
import { lerp } from "../lib/math";
import { PALETTE } from "../lib/palette";
import { FREEZE_SHOT } from "../lib/shots";
import { T_FREEZE } from "../lib/touch";

/** The boards glow neutral on the frozen frame, whichever era is frozen in it. */
export const FROZEN_ACCENT = PALETTE["stadium-night"].light.glow;

/** The frozen grade at strength k (1 = fully frozen). */
export const frozenFilter = (k: number) =>
  k <= 0 ? undefined : `saturate(${lerp(1, 0.72, k).toFixed(3)}) contrast(${lerp(1, 1.08, k).toFixed(3)})`;

/** The frozen instant as a given era would have lived it (the shuffle's deck). */
export const FrozenEra: React.FC<{ look: Look; id: string }> = ({ look, id }) => (
  <TheTouch
    variant="veteran-39"
    t={T_FREEZE}
    shot={FREEZE_SHOT}
    look={look}
    // The boy's layer uses Scene 1's scale curve so it matches Scene 1's own frozen frame.
    scaleAt={look.id === ERAS[ERAS.length - 1].id ? eraScaleAtT : () => look.scale}
    world="stadium-night"
    accent={FROZEN_ACCENT}
    idPrefix={id}
  />
);

/**
 * The deck: a sky band, seven bands over the figure's height in the frozen
 * shot, and a ground band. The plate shows the eras top to bottom, from the
 * 39-year-old's head to the boy's feet; sky and ground stay the boy's.
 */
const groundY = FREEZE_SHOT.screenY + FREEZE_SHOT.lookY * FREEZE_SHOT.pxPerM;
const headTopY = groundY - 1.7 * FREEZE_SHOT.pxPerM;
export const SHUFFLE_BANDS = [
  0,
  ...ERAS.map((_, i) => Math.round(headTopY + ((groundY - headTopY) * i) / ERAS.length)),
  Math.round(groundY),
  1920,
];
export const SHUFFLE_PLATE = [ERAS.length - 1, ...ERAS.map((_, i) => i), ERAS.length - 1];

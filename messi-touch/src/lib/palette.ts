// Shared look of the film. Components take colours and light from here so the
// athlete, the world and the effects agree.

import { WorldStyle } from "./eras";

export type Light = {
  /** Rim light colour and the screen direction it comes from (unit vector, y down). */
  rim: string;
  rimDir: { x: number; y: number };
  /** Ink of silhouettes (skin, hair, boots) in this light. */
  ink: string;
  /** Far-side limbs are drawn in this darker ink. */
  inkFar: string;
  /** Ground shadows: screen-space directions (y down) and opacity. */
  shadows: { dx: number; dy: number; opacity: number }[];
  /** General glow colour (lines, boards, pulses). */
  glow: string;
};

export const PALETTE = {
  "stadium-night": {
    skyTop: "#03050B",
    skyMid: "#081022",
    skyHorizon: "#13254A",
    haze: "#2A4A80",
    grassA: "#0D2A1D",
    grassB: "#123725",
    grassFar: "#0A1F17",
    line: "#EEF4FF",
    board: "#7FB4FF",
    crowd: "#1A2238",
    floodlight: "#E3EEFF",
    light: {
      rim: "#CFE3FF",
      rimDir: { x: 0.55, y: -0.83 },
      ink: "#070A12",
      inkFar: "#04060B",
      shadows: [
        { dx: -0.9, dy: 0.18, opacity: 0.32 },
        { dx: 0.9, dy: 0.18, opacity: 0.32 },
        { dx: -0.45, dy: 0.25, opacity: 0.22 },
        { dx: 0.45, dy: 0.25, opacity: 0.22 },
      ],
      glow: "#9CC8FF",
    } as Light,
  },
  "rosario-dusk": {
    skyTop: "#2A1638",
    skyMid: "#B5402E",
    skyHorizon: "#F6A84A",
    haze: "#FFD08A",
    sun: "#FFF1C4",
    dirtA: "#8E3B1D",
    dirtB: "#A2481F",
    dirtFar: "#C0612C",
    line: "#F4E7CF",
    wall: "#5B2416",
    trees: "#3A1712",
    light: {
      rim: "#FFC873",
      rimDir: { x: 0.92, y: -0.38 },
      ink: "#1B0C0A",
      inkFar: "#120807",
      shadows: [{ dx: -1, dy: 0.12, opacity: 0.45 }],
      glow: "#FFB25C",
    } as Light,
  },
} as const;

export const lightOf = (w: WorldStyle): Light => PALETTE[w].light;

export const FONTS = {
  /** Captions, labels, numbers on shirts. */
  condensed: "'Barlow Condensed', 'Arial Narrow', sans-serif",
  /** The closing line. */
  serif: "'Cormorant Garamond', Georgia, serif",
  /** Measurements and data. */
  mono: "'IBM Plex Mono', 'Courier New', monospace",
} as const;

// Shared look of the film (see STYLE.md: "Chronograph"). Components take
// colours and light from here so the athlete, the world and the effects agree.

import { WorldStyle } from "./eras";

export type Light = {
  /** Body volume: a dark tone a step above the background, and its lit side. */
  body: string;
  bodyLit: string;
  /** Far-side limbs sit back in this darker tone. */
  bodyFar: string;
  /** The luminous contour: full strength on the lit side, dim on the other. */
  contour: string;
  contourDim: string;
  /** Screen direction the key light comes from (unit vector, y down). */
  rimDir: { x: number; y: number };
  /** Ground shadows: screen-space directions (y down) and opacity. */
  shadows: { dx: number; dy: number; opacity: number }[];
  /** Glow colour for lines, pulses and callouts in this world. */
  glow: string;
};

export const PALETTE = {
  "stadium-night": {
    skyTop: "#030409",
    skyMid: "#060A16",
    skyHorizon: "#0C1730",
    haze: "#1A2C52",
    grassA: "#06150F",
    grassB: "#081B13",
    grassSeam: "#123526",
    grassFar: "#050F0B",
    line: "#EEF6FF",
    ruler: "#9FB8D6",
    board: "#7FC4FF",
    bokehCool: "#9CC7FF",
    bokehWarm: "#FFD9A6",
    floodlight: "#F4F8FF",
    light: {
      body: "#0B1222",
      bodyLit: "#18264A",
      bodyFar: "#070C17",
      contour: "#DDF0FF",
      contourDim: "#4E6C9C",
      rimDir: { x: 0.55, y: -0.83 },
      shadows: [
        { dx: -0.9, dy: 0.18, opacity: 0.3 },
        { dx: 0.9, dy: 0.18, opacity: 0.3 },
        { dx: -0.45, dy: 0.25, opacity: 0.2 },
        { dx: 0.45, dy: 0.25, opacity: 0.2 },
      ],
      glow: "#8FD1FF",
    } as Light,
  },
  "rosario-dusk": {
    skyTop: "#1C1030",
    skyMid: "#9C3A42",
    skyHorizon: "#F4A85C",
    haze: "#FFD9A2",
    sun: "#FFF1C8",
    dirtA: "#6C2C1B",
    dirtB: "#7A3420",
    dirtSeam: "#5A2416",
    dirtFar: "#A85C36",
    line: "#F7E8CF",
    wall: "#3C1913",
    trees: "#2B120F",
    light: {
      body: "#2A1512",
      bodyLit: "#5A2A1E",
      bodyFar: "#1C0D0B",
      contour: "#FFD49A",
      contourDim: "#8A4A30",
      rimDir: { x: 0.92, y: -0.38 },
      shadows: [{ dx: -1, dy: 0.12, opacity: 0.42 }],
      glow: "#FFB866",
    } as Light,
  },
} as const;

export const lightOf = (w: WorldStyle): Light => PALETTE[w].light;

export const FONTS = {
  /** Captions, labels, numbers on shirts. */
  condensed: "'Barlow Condensed', 'Arial Narrow', sans-serif",
  /** The closing line. */
  serif: "'Cormorant Garamond', Georgia, serif",
  /** Measurements, metadata, rulers. */
  mono: "'IBM Plex Mono', 'Courier New', monospace",
} as const;

// The seven eras of Scene 1, newest first: the run goes backwards in time.
// Colours only, no club crests or sponsor marks.

export type ShirtPattern =
  | { kind: "stripes"; colors: readonly [string, string]; count: number }
  | { kind: "solid"; color: string }
  | { kind: "halves"; colors: readonly [string, string] };

export type Kit = {
  shirt: ShirtPattern;
  sleeve: string;
  collar: string;
  number: string | null;
  numberColor: string;
  shorts: string;
  socks: string;
  sockBand: string;
  /** Stars above the crest position (Argentina: 2 before Qatar, 3 after). */
  stars: number;
};

export type Hair = "crop-grey" | "crop" | "short" | "long" | "mop" | "kid";
export type Beard = "full" | "trim" | "none";
export type Boot = "modern" | "classic" | "worn";

export type Look = {
  id: string;
  /** On-screen caption parts. */
  year: string;
  club: string;
  kit: Kit;
  hair: Hair;
  beard: Beard;
  boot: Boot;
  /** Body height relative to 1.70 m. */
  scale: number;
  /** Head size relative to the body (children's heads are proportionally larger). */
  head: number;
  /** Limb thickness factor. */
  limb: number;
  /** Shoe length relative to the body (hand-me-down shoes run big). */
  foot: number;
  age: number;
  /** Accent used for glows, captions and pulses in this era. */
  accent: string;
  /** Optional edge light on the jersey, to set an era apart at small sizes (Qatar's gold). */
  edge?: string;
};

const ARG_SKY = "#7DB8E8";
const ARG_WHITE = "#F4F7FB";
const BLAU = "#1C4FA8";
const GRANA = "#A3164A";

export const ERAS: readonly Look[] = [
  {
    id: "arg-2026",
    year: "2026",
    club: "ARGENTINA",
    kit: {
      shirt: { kind: "stripes", colors: [ARG_SKY, ARG_WHITE], count: 5 },
      sleeve: ARG_WHITE,
      collar: "#1B2A4A",
      number: "10",
      numberColor: "#141B2D",
      shorts: "#141B2D",
      socks: ARG_WHITE,
      sockBand: ARG_SKY,
      stars: 3,
    },
    hair: "crop-grey",
    beard: "full",
    boot: "modern",
    scale: 1,
    head: 1,
    limb: 1,
    foot: 1,
    age: 39,
    accent: "#9FD3FF",
  },
  {
    id: "miami",
    year: "2023",
    club: "INTER MIAMI",
    kit: {
      shirt: { kind: "solid", color: "#F3A9C4" },
      sleeve: "#F3A9C4",
      collar: "#111111",
      number: "10",
      numberColor: "#111111",
      shorts: "#F3A9C4",
      socks: "#F3A9C4",
      sockBand: "#111111",
      stars: 0,
    },
    hair: "crop",
    beard: "full",
    boot: "modern",
    scale: 0.985,
    head: 1,
    limb: 1,
    foot: 1,
    age: 36,
    accent: "#FF9CC5",
  },
  {
    id: "qatar-2022",
    year: "2022",
    club: "QATAR",
    kit: {
      shirt: { kind: "stripes", colors: [ARG_SKY, ARG_WHITE], count: 5 },
      sleeve: ARG_WHITE,
      collar: "#111111",
      number: "10",
      numberColor: "#111111",
      shorts: "#111111",
      socks: ARG_WHITE,
      sockBand: "#111111",
      stars: 2,
    },
    hair: "crop",
    beard: "trim",
    boot: "modern",
    scale: 0.97,
    head: 1,
    limb: 1,
    foot: 1,
    age: 35,
    accent: "#F5D27A",
    edge: "#F5D27A",
  },
  {
    id: "barca-10",
    year: "2009",
    club: "BARCELONA",
    kit: {
      shirt: { kind: "stripes", colors: [BLAU, GRANA], count: 5 },
      sleeve: GRANA,
      collar: "#0E2350",
      number: "10",
      numberColor: "#F2C14E",
      shorts: BLAU,
      socks: BLAU,
      sockBand: GRANA,
      stars: 0,
    },
    hair: "short",
    beard: "none",
    boot: "classic",
    scale: 0.95,
    head: 1.01,
    limb: 0.98,
    foot: 1,
    age: 22,
    accent: "#E8536F",
  },
  {
    id: "barca-19",
    year: "2006",
    club: "BARCELONA",
    kit: {
      shirt: { kind: "stripes", colors: [BLAU, GRANA], count: 5 },
      sleeve: GRANA,
      collar: "#0E2350",
      number: "19",
      numberColor: "#F2C14E",
      shorts: BLAU,
      socks: BLAU,
      sockBand: GRANA,
      stars: 0,
    },
    hair: "long",
    beard: "none",
    boot: "classic",
    scale: 0.92,
    head: 1.03,
    limb: 0.95,
    foot: 1,
    age: 19,
    accent: "#5B8CFF",
  },
  {
    id: "barca-30",
    year: "2004",
    club: "BARCELONA",
    kit: {
      shirt: { kind: "stripes", colors: [BLAU, GRANA], count: 5 },
      sleeve: GRANA,
      collar: "#0E2350",
      number: "30",
      numberColor: "#F2C14E",
      shorts: BLAU,
      socks: BLAU,
      sockBand: GRANA,
      stars: 0,
    },
    hair: "mop",
    beard: "none",
    boot: "classic",
    scale: 0.88,
    head: 1.06,
    limb: 0.92,
    foot: 1.02,
    age: 17,
    accent: "#B07CFF",
  },
  {
    id: "newells",
    year: "1994",
    club: "NEWELL'S OLD BOYS",
    kit: {
      shirt: { kind: "halves", colors: ["#C8161D", "#121212"] },
      sleeve: "#C8161D",
      collar: "#121212",
      number: null,
      numberColor: "#F4F4F4",
      shorts: "#121212",
      socks: "#C8161D",
      sockBand: "#121212",
      stars: 0,
    },
    hair: "kid",
    beard: "none",
    boot: "worn",
    scale: 0.65,
    head: 1.22,
    limb: 0.84,
    foot: 1.22,
    age: 7,
    accent: "#FF7A45",
  },
];

export type Variant = "veteran-39" | "rosario-kid";
export type WorldStyle = "stadium-night" | "rosario-dusk";

export const VARIANT_LOOK: Record<Variant, Look> = {
  "veteran-39": ERAS[0],
  "rosario-kid": ERAS[ERAS.length - 1],
};

export const VARIANT_WORLD: Record<Variant, WorldStyle> = {
  "veteran-39": "stadium-night",
  "rosario-kid": "rosario-dusk",
};

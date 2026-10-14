// Loads the film's five faces from public/fonts once per page, before the
// first frame is captured. Family names match FONTS in palette.ts. A missing
// or broken file only logs a warning: the frame renders with the fallback
// stack instead of hanging the render.

import { continueRender, delayRender, staticFile } from "remotion";

type FaceSpec = { family: string; file: string; weight: string; style: "normal" | "italic" };

export const FONT_FILES: readonly FaceSpec[] = [
  { family: "Barlow Condensed", file: "fonts/BarlowCondensed-Light.ttf", weight: "300", style: "normal" },
  { family: "Barlow Condensed", file: "fonts/BarlowCondensed-Medium.ttf", weight: "500", style: "normal" },
  { family: "Barlow Condensed", file: "fonts/BarlowCondensed-Bold.ttf", weight: "700", style: "normal" },
  { family: "Cormorant Garamond", file: "fonts/Cormorant-MediumItalic.ttf", weight: "500", style: "italic" },
  { family: "IBM Plex Mono", file: "fonts/IBMPlexMono-Regular.ttf", weight: "400", style: "normal" },
];

/** A face that has not loaded after this long is given up on, ms. */
const GIVE_UP = 10000;

const loadFace = (spec: FaceSpec): Promise<void> => {
  const face = new FontFace(spec.family, `url(${staticFile(spec.file)})`, { weight: spec.weight, style: spec.style });
  const loaded = face.load().then((f) => {
    (document.fonts as unknown as Set<FontFace>).add(f);
  });
  const timeout = new Promise<void>((_, reject) => setTimeout(() => reject(new Error("timed out")), GIVE_UP));
  return Promise.race([loaded, timeout]).catch((err: unknown) => {
    console.warn(`[fonts] ${spec.file} (${spec.family} ${spec.weight} ${spec.style}) not loaded: ${String(err)}`);
  });
};

let pending: Promise<void> | null = null;

/** Loads every face once per page; later calls return the same promise. Never rejects. */
export const loadFonts = (): Promise<void> => {
  if (pending) return pending;
  if (typeof document === "undefined" || typeof FontFace === "undefined") {
    pending = Promise.resolve();
    return pending;
  }
  const handle = delayRender("Loading film fonts", { timeoutInMilliseconds: GIVE_UP * 3 });
  pending = Promise.all(FONT_FILES.map(loadFace)).then(() => continueRender(handle));
  return pending;
};

// Importing this module is enough (Root.tsx does `import "./lib/fonts"`).
loadFonts();

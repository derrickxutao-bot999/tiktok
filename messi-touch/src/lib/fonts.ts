// Loads the film's five faces from public/fonts once per page, before the
// first frame is captured. Family names match FONTS in palette.ts.
//
// Every face is checked with document.fonts.check() once it has loaded. When
// rendering, a face that fails (missing file, broken file, timeout) cancels
// the render with a message saying how to fix it, so a film is never output
// in fallback type. In the Studio it only logs a warning and the frame draws
// with the fallback stack. Either way nothing hangs: each face gives up after
// GIVE_UP, and the delayRender is always released.

import { cancelRender, continueRender, delayRender, getRemotionEnvironment, staticFile } from "remotion";

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

const describe = (spec: FaceSpec) => `${spec.file} (${spec.family} ${spec.weight} ${spec.style})`;

/** Loads one face; resolves to null when it is usable, or to the reason it is not. Never rejects. */
const loadFace = (spec: FaceSpec): Promise<string | null> => {
  const face = new FontFace(spec.family, `url(${staticFile(spec.file)})`, { weight: spec.weight, style: spec.style });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const loaded = face.load().then((f) => {
    (document.fonts as unknown as Set<FontFace>).add(f);
  });
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${GIVE_UP} ms`)), GIVE_UP);
  });
  return Promise.race([loaded, timeout])
    .then(() => {
      // The face is registered; make sure the browser will actually draw with it.
      const probe = `${spec.style} ${spec.weight} 16px "${spec.family}"`;
      return document.fonts.check(probe) ? null : `document.fonts.check("${probe}") is false after loading`;
    })
    .catch((err: unknown) => String(err))
    .finally(() => clearTimeout(timer));
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
  pending = Promise.all(FONT_FILES.map(loadFace)).then((results) => {
    const failed = results.map((r, i) => (r === null ? null : `${describe(FONT_FILES[i])}: ${r}`)).filter((r): r is string => r !== null);
    if (failed.length > 0) {
      const msg = `[fonts] ${failed.length} of ${FONT_FILES.length} faces not loaded. Run ./fetch-fonts.sh to put the OFL fonts in public/fonts.\n  ${failed.join("\n  ")}`;
      if (getRemotionEnvironment().isRendering) {
        try {
          cancelRender(new Error(msg));
        } catch {
          // cancelRender throws to stop the caller; the render itself is already cancelled.
        }
      } else {
        console.warn(msg);
      }
    }
    continueRender(handle);
  });
  return pending;
};

// Importing this module is enough (Root.tsx does `import "./lib/fonts"`).
loadFonts();

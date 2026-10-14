// Lab for the effects and typography, over simple stand-in pictures (no
// athlete, no environment components; the stand-in leg is posed by the rig).
//
//   0-40     FootfallPulses, FREEZE_SHOT camera, fake footfalls at different ages (even steps are strong)
//   50-70    Glitch at 0.2 (50-56), 0.6 (57-63), 1.0 (64-70)
//   80-114   FrameShuffle 'out' over 34 frames (Scene 1's end): intact boy, shuffle, plate (94-104), burn, white (113)
//   125-151  FrameShuffle 'in' over 26 frames (Scene 4's start): plate, shuffle, the 39-year-old intact (148-151)
//   161-169  WhiteOut 0.1 ... 0.9 (165 = 0.5)
//   170-173  EraCaption ERAS[0] at ages 0 / 6 / 20 / 60
//   174      EraCaption ERAS[1] mid-roll (age 6)
//   175-178  EraCaption ERAS[6] at ages 0 / 6 / 20 / 60
//   179-200  EraCaption walk: each era at ages 0, 3, 6 (179 = ERAS[0] age 0 ...)
//   205-208  Subtitle at frames 0 / 20 / 60 / 120 over a sunset; 209-235 continuous
//   240      FREEZE_SHOT: GapMeasure (1 cm) + ContactPulse (age 0.05) + Grain + Vignette
//   241-242  CLOSEUP_SHOT: GapMeasure progress 0.5 / 1
//   243-244  CLOSEUP_SHOT: ContactPulse age 0.03 / 0.1 (257: 0.35)
//   245-255  BallPath: scene1Shot(600..608) at 245-249, scene1Shot(650..658) at 250-254, FREEZE_SHOT at 255
//   256      BallPath with the camera on the OUT spot (ghost ball, plumb line, cross, label)
//   258      FrameShuffle 'out' at 0.75 under a Vignette dimmed by shuffleWhiteness
//   259      WhiteOut 0.35 (the freeze flash)
//   260-267  Glitch over the frozen frame crossed by full-width white hairlines, amounts 0.1 / 0.14 / 0.3 / 0.5 / 0.7 / 0.9 / 1 / 1 (new filter)
//   268-275  the same eight again
//   276-280  EraCaption over a busy sky (roof line, streaks, scan flash): knockout on / off, rolling;
//            over the plain sky: knockout on / off (they should look the same)
//   281-285  GapMeasure: DETAIL A 10:1 lens with 40 px figure (progress 1 / 0.6); FREEZE_SHOT 30 px;
//            FREEZE_SHOT 30 px with lineWidth 1.5; CLOSEUP_SHOT 30 px
//   286-287  Grain alone over mid grey (two frames: tile and offset change)
//
// FrameShuffle (80-114 'out', 125-151 'in') runs on the scenes' deck: a sky band, seven bands over the
// figure, a ground band, the plate built from the seven stand-in eras (each with its colour bar at the left).

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import {
  BallPath,
  ContactPulse,
  EraCaption,
  FootfallPulses,
  FrameShuffle,
  GapMeasure,
  Glitch,
  Grain,
  S_OUT,
  Subtitle,
  Vignette,
  WhiteOut,
  shuffleWhiteness,
} from "../../components/fx";
import "../../lib/fonts";
import { BALL, ballAt } from "../../lib/ball";
import { scene1T } from "../../lib/clock";
import { ERAS, Look } from "../../lib/eras";
import { hash } from "../../lib/math";
import { FONTS, PALETTE } from "../../lib/palette";
import { Footfall, solvePose } from "../../lib/rig";
import { CLOSEUP_SHOT, FREEZE_SHOT, scene1Shot } from "../../lib/shots";
import { HEIGHT, WIDTH } from "../../lib/timeline";
import { CONTACT_POINT, T_FREEZE, TOE_LAND_T_DEFAULT, contactPointAt, toeAt } from "../../lib/touch";
import { Camera, D0, LINE_WIDTH, LINE_Z, Shot, cameraFromShot, project } from "../../lib/world";

const NIGHT = PALETTE["stadium-night"];
const DUSK = PALETTE["rosario-dusk"];
const POSE0 = solvePose(T_FREEZE, ERAS[0]);

/**
 * A stand-in night picture: sky, horizon haze, crowd lights, the line, the
 * rig's near leg as a figure of light, the ball. `ground` is drawn on the
 * grass under the figure and ball (like TheTouch's groundOverlay), `children` above.
 */
const Night: React.FC<{
  camera: Camera;
  t: number;
  id: string;
  jersey?: string;
  year?: string;
  /** Pose the stand-in figure for this look (its scale) instead of ERAS[0]. */
  look?: Look;
  /** A full-height bar of the jersey colour at the left, so composites read at a glance. */
  bar?: boolean;
  ground?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ camera, t, id, jersey = ERAS[0].accent, year, look, bar, ground, children }) => {
  const POSE = look ? solvePose(T_FREEZE, look) : POSE0;
  const lineNear = project(camera, 0, 0, LINE_Z - LINE_WIDTH / 2).y;
  const lineFar = project(camera, 0, 0, LINE_Z + LINE_WIDTH / 2).y;
  const ball = ballAt(t);
  const bp = project(camera, ball.x, ball.y, ball.z);
  const r = BALL.r * bp.k;
  const P = (q: { x: number; y: number }) => project(camera, q.x, q.y);
  const leg = POSE.legs.L;
  const [hip, knee, ankle, heel, toe] = [leg.hip, leg.knee, leg.ankle, leg.heel, leg.toe].map(P);
  const neck = P(POSE.neck);
  const pelvis = P(POSE.pelvis);
  const head = P(POSE.head.center);
  const k = bp.k;
  return (
    <AbsoluteFill style={{ backgroundColor: NIGHT.skyTop }}>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={NIGHT.skyTop} />
            <stop offset={(camera.cy / HEIGHT) * 0.8} stopColor={NIGHT.skyMid} />
            <stop offset={camera.cy / HEIGHT} stopColor={NIGHT.skyHorizon} />
            <stop offset={camera.cy / HEIGHT + 0.001} stopColor={NIGHT.grassFar} />
            <stop offset="1" stopColor={NIGHT.grassB} />
          </linearGradient>
          <linearGradient id={`${id}-shirt`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={jersey} />
            <stop offset="1" stopColor={NIGHT.light.bodyLit} />
          </linearGradient>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill={`url(#${id}-sky)`} />
        {Array.from({ length: 40 }, (_, i) => (
          <circle
            key={i}
            cx={hash(i * 3 + 1) * WIDTH}
            cy={camera.cy - 40 - hash(i * 3 + 2) * 260}
            r={3 + hash(i * 3 + 3) * 12}
            fill={i % 7 === 0 ? NIGHT.bokehWarm : NIGHT.bokehCool}
            opacity={0.12 + 0.2 * hash(i * 5)}
          />
        ))}
        <rect x={0} y={lineFar} width={WIDTH} height={Math.max(1.5, lineNear - lineFar)} fill={NIGHT.line} opacity={0.9} />
        {ground}
        {bar ? <rect x={60} y={0} width={8} height={HEIGHT} fill={jersey} opacity={0.85} /> : null}
        {year ? (
          <text x={WIDTH - 70} y={340} textAnchor="end" fontFamily={FONTS.condensed} fontWeight={700} fontSize={150} fill={jersey} opacity={0.5}>
            {year}
          </text>
        ) : null}
        {/* Figure of light (a stand-in): torso, head, the rig's near leg and boot. */}
        <g stroke={NIGHT.light.contour} strokeWidth={2} strokeLinejoin="round" fill={NIGHT.light.body}>
          <circle cx={head.x} cy={head.y} r={POSE.head.radius * k} />
          <path d={`M${neck.x - 0.1 * k} ${neck.y} L${neck.x + 0.14 * k} ${neck.y} L${pelvis.x + 0.12 * k} ${pelvis.y} L${pelvis.x - 0.12 * k} ${pelvis.y} Z`} fill={`url(#${id}-shirt)`} />
          <path d={`M${hip.x} ${hip.y} L${knee.x} ${knee.y} L${ankle.x} ${ankle.y}`} fill="none" strokeWidth={0.1 * k} stroke={NIGHT.light.contourDim} />
          <path d={`M${hip.x} ${hip.y} L${knee.x} ${knee.y} L${ankle.x} ${ankle.y}`} fill="none" strokeWidth={0.1 * k - 3} stroke={NIGHT.light.body} />
          <path d={`M${heel.x} ${heel.y} L${ankle.x} ${ankle.y - 0.04 * k} L${toe.x} ${toe.y - 0.035 * k} L${toe.x} ${toe.y} Z`} />
        </g>
        <circle cx={bp.x} cy={bp.y} r={r} fill="#DCE6F2" stroke={NIGHT.light.contour} strokeWidth={1.5} />
        {children}
      </svg>
    </AbsoluteFill>
  );
};

const Sunset: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(180deg, ${DUSK.skyTop} 0%, ${DUSK.skyMid} 42%, ${DUSK.skyHorizon} 66%, ${DUSK.dirtFar} 66.2%, ${DUSK.dirtB} 78%, ${DUSK.dirtA} 100%)`,
    }}
  >
    <div style={{ position: "absolute", left: 640, top: 1267 - 170, width: 340, height: 340, borderRadius: "50%", background: DUSK.sun, opacity: 0.9, clipPath: "inset(0 0 170px 0)" }} />
  </AbsoluteFill>
);

const FREEZE_CAM = cameraFromShot(FREEZE_SHOT);
const CLOSE_CAM = cameraFromShot(CLOSEUP_SHOT);
const T0 = T_FREEZE;

const FOOTFALLS: Footfall[] = [
  { n: 1, t: -0.32, side: "L", x: CONTACT_POINT.x - 1.25 },
  { n: 2, t: -0.12, side: "R", x: CONTACT_POINT.x - 0.65 },
  { n: 3, t: 0.12, side: "L", x: CONTACT_POINT.x - 0.05 },
  { n: 4, t: 0.33, side: "R", x: CONTACT_POINT.x + 0.5 },
];

/** Seven stand-in eras of the frozen instant: each posed at its own scale, with its colour and year. */
const shuffleLayers = (prefix: string) =>
  ERAS.map((e, i) => <Night key={i} camera={FREEZE_CAM} t={T0} id={`${prefix}${i}`} jersey={e.accent} year={e.year} look={e} bar />);

/** The deck as the scenes cut it: a sky band, seven bands over the figure's height, a ground band. */
const GROUND_Y = FREEZE_SHOT.screenY + FREEZE_SHOT.lookY * FREEZE_SHOT.pxPerM;
const HEAD_Y = GROUND_Y - 1.7 * FREEZE_SHOT.pxPerM;
const BANDS = [0, ...ERAS.map((_, i) => Math.round(HEAD_Y + ((GROUND_Y - HEAD_Y) * i) / ERAS.length)), Math.round(GROUND_Y), HEIGHT];
const PLATE = [ERAS.length - 1, ...ERAS.map((_, i) => i), ERAS.length - 1];
const LABELS = [null, ...ERAS.map((e) => e.year), null];

const CAPTION_CASES: Record<number, { era: number; age: number }> = {
  170: { era: 0, age: 0 },
  171: { era: 0, age: 6 },
  172: { era: 0, age: 20 },
  173: { era: 0, age: 60 },
  174: { era: 1, age: 6 },
  175: { era: 6, age: 0 },
  176: { era: 6, age: 6 },
  177: { era: 6, age: 20 },
  178: { era: 6, age: 60 },
};

/** The measured gap and the contact point, projected with a camera. */
const gapPoints = (cam: Camera, t: number) => {
  const toe = toeAt(t, TOE_LAND_T_DEFAULT);
  const cp = contactPointAt(Math.min(t, 0));
  const b = ballAt(t);
  return { a: project(cam, toe.x, toe.y), b: project(cam, cp.x, cp.y, b.z), size: BALL.r * project(cam, b.x, b.y, b.z).k, pxPerM: cam.f / D0 };
};

const CLOSE_CASES: Record<number, { gap?: number; pulse?: number }> = { 241: { gap: 0.5 }, 242: { gap: 1 }, 243: { pulse: 0.03 }, 244: { pulse: 0.1 }, 257: { pulse: 0.35 } };

/** What can cross the caption in Scene 1: the roof's hairline arc, floodlight streaks, a glitch's scan flash. */
const BusySky: React.FC = () => (
  <g>
    <path d="M-40 640 Q 540 180 1120 380" fill="none" stroke={NIGHT.light.contour} strokeWidth={2} opacity={0.85} />
    <path d="M-40 600 Q 540 150 1120 340" fill="none" stroke={NIGHT.light.contour} strokeWidth={1} opacity={0.4} />
    {[
      { y: 330, x: 380, w: 900, o: 0.9 },
      { y: 455, x: 160, w: 700, o: 0.7 },
    ].map((st, i) => (
      <g key={i}>
        <rect x={st.x - st.w / 2} y={st.y - 1.5} width={st.w} height={3} fill={NIGHT.light.glow} opacity={st.o * 0.6} />
        <rect x={st.x - st.w / 4} y={st.y - 0.75} width={st.w / 2} height={1.5} fill="#FFFFFF" opacity={st.o} />
        <circle cx={st.x} cy={st.y} r={9} fill="#FFFFFF" opacity={st.o} />
      </g>
    ))}
    <rect x={0} y={402} width={WIDTH} height={1.5} fill="#EAF4FF" opacity={0.75} />
  </g>
);

/** DetailInset's geometry, in stand-ins: the frozen gap at ten times the focal length, in a lens of radius 300 at (560, 640). */
const DetailLens: React.FC<{ progress: number }> = ({ progress }) => {
  const toe = toeAt(T0, TOE_LAND_T_DEFAULT);
  const cp = contactPointAt(T0);
  const mid = { x: (toe.x + cp.x) / 2, y: (toe.y + cp.y) / 2 };
  const shot: Shot = { lookX: mid.x, lookY: mid.y, screenX: 560, screenY: 640, pxPerM: FREEZE_SHOT.pxPerM * 10, height: FREEZE_SHOT.height };
  const cam = cameraFromShot(shot);
  const g = gapPoints(cam, T0);
  return (
    <AbsoluteFill style={{ backgroundColor: NIGHT.skyTop }}>
      <AbsoluteFill style={{ clipPath: "circle(300px at 560px 640px)" }}>
        <Night camera={cam} t={T0} id="lens">
          <GapMeasure a={g.a} b={g.b} label="1 cm" progress={progress} color={NIGHT.light.glow} pxPerM={g.pxPerM} fontSize={40} idPrefix="lab-lens" />
        </Night>
      </AbsoluteFill>
      <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute", inset: 0 }}>
        <circle cx={560} cy={640} r={300} fill="none" stroke={NIGHT.light.glow} strokeWidth={1.6} />
      </svg>
      <Vignette strength={0.55} />
    </AbsoluteFill>
  );
};

export const Lab: React.FC = () => {
  const frame = useCurrentFrame();

  if (frame <= 40) {
    const t = -0.3 + frame * 0.02;
    return (
      <Night
        camera={FREEZE_CAM}
        t={T0}
        id="fp"
        ground={<FootfallPulses camera={FREEZE_CAM} t={t} footfalls={FOOTFALLS} color={ERAS[0].accent} strength={(n) => (n % 2 === 0 ? 1 : 0)} idPrefix="lab-fp" />}
      />
    );
  }
  if (frame >= 50 && frame <= 70) {
    const amount = frame <= 56 ? 0.2 : frame <= 63 ? 0.6 : 1;
    return (
      <Glitch amount={amount} seed={frame}>
        <Night camera={FREEZE_CAM} t={T0} id="gl" year="2022" jersey={ERAS[2].accent} />
      </Glitch>
    );
  }
  if (frame >= 80 && frame <= 114) {
    // Scene 1's end: 34 frames from the frozen boy (the subject) through the plate to white.
    return (
      <FrameShuffle
        direction="out"
        progress={(frame - 80) / 34}
        duration={34}
        seed={7}
        bands={BANDS}
        plate={PLATE}
        subject={ERAS.length - 1}
        labels={LABELS}
        layers={shuffleLayers("sho")}
      />
    );
  }
  if (frame >= 125 && frame <= 151) {
    // Scene 4's start: 26 frames from the plate to the 39-year-old.
    return (
      <FrameShuffle
        direction="in"
        progress={(frame - 125) / 26}
        duration={26}
        seed={7}
        bands={BANDS}
        plate={PLATE}
        subject={0}
        labels={LABELS}
        layers={shuffleLayers("shi")}
      />
    );
  }
  if ((frame >= 161 && frame <= 169) || frame === 259) {
    return (
      <AbsoluteFill>
        <Night camera={FREEZE_CAM} t={T0} id="wo" />
        <WhiteOut amount={frame === 259 ? 0.35 : (frame - 160) / 10} />
      </AbsoluteFill>
    );
  }
  if (frame >= 170 && frame <= 200) {
    const c = CAPTION_CASES[frame] ?? { era: Math.floor((frame - 179) / 3) % ERAS.length, age: ((frame - 179) % 3) * 3 };
    const look = ERAS[c.era];
    return (
      <AbsoluteFill style={{ backgroundColor: NIGHT.skyTop }}>
        <Night camera={cameraFromShot(scene1Shot(300))} t={scene1T(300)} id="cap" jersey={look.accent} />
        <EraCaption look={look} age={c.age} accent={look.accent} />
        <Vignette strength={0.5} />
      </AbsoluteFill>
    );
  }
  if (frame >= 205 && frame <= 235) {
    const sf = frame <= 208 ? [0, 20, 60, 120][frame - 205] : (frame - 205) * 5;
    return (
      <AbsoluteFill>
        <Sunset />
        <Subtitle text="His story is told. The boy is still playing." frame={sf} y={1560} />
        <Vignette strength={0.4} />
      </AbsoluteFill>
    );
  }
  if (frame === 240) {
    const g = gapPoints(FREEZE_CAM, T0);
    return (
      <AbsoluteFill>
        <Night camera={FREEZE_CAM} t={T0} id="gm">
          <GapMeasure a={g.a} b={g.b} label="1 cm" progress={1} color={NIGHT.light.glow} pxPerM={g.pxPerM} idPrefix="lab-gm" />
          <ContactPulse at={g.b} age={0.05} color={NIGHT.light.glow} size={g.size} idPrefix="lab-cp" />
        </Night>
        <Vignette strength={0.55} />
        <Grain frame={frame} opacity={0.07} />
      </AbsoluteFill>
    );
  }
  if (CLOSE_CASES[frame]) {
    const c = CLOSE_CASES[frame];
    const t = c.pulse === undefined ? T0 : 0;
    const g = gapPoints(CLOSE_CAM, t);
    return (
      <AbsoluteFill>
        <Night camera={CLOSE_CAM} t={t} id="cu">
          {c.gap !== undefined ? <GapMeasure a={g.a} b={g.b} label="1.0 cm" progress={c.gap} color={NIGHT.light.glow} pxPerM={g.pxPerM} idPrefix="lab-gm2" /> : null}
          {c.pulse !== undefined ? <ContactPulse at={g.b} age={c.pulse} color={NIGHT.light.glow} size={g.size} idPrefix="lab-cp2" /> : null}
        </Night>
        <Vignette strength={0.55} />
      </AbsoluteFill>
    );
  }
  if (frame >= 245 && frame <= 256) {
    const sf = frame >= 255 ? null : frame < 250 ? 600 + (frame - 245) * 2 : 650 + (frame - 250) * 2;
    const outShot: Shot = { lookX: ballAt(0).x + S_OUT * Math.cos(BALL.heading), lookY: 0.3, screenX: 540, screenY: 1150, pxPerM: 330, height: 0.9 };
    const shot: Shot = sf === null ? (frame === 255 ? FREEZE_SHOT : outShot) : scene1Shot(sf);
    const t = sf === null ? (frame === 255 ? T0 : scene1T(600)) : scene1T(sf);
    const cam = cameraFromShot(shot);
    return <Night camera={cam} t={t} id="bp" ground={<BallPath camera={cam} t={t} color={NIGHT.light.glow} opacity={0.85} idPrefix="lab-bp" />} />;
  }
  if (frame === 258) {
    return (
      <AbsoluteFill>
        <FrameShuffle direction="out" progress={0.75} seed={7} bands={BANDS} plate={PLATE} subject={ERAS.length - 1} layers={shuffleLayers("shv")} />
        <Vignette strength={0.55 * (1 - shuffleWhiteness(0.75, "out"))} />
        <Grain frame={frame} opacity={0.07} />
      </AbsoluteFill>
    );
  }
  if (frame >= 260 && frame <= 275) {
    const i = (frame - 260) % 8;
    const amount = [0.1, 0.14, 0.3, 0.5, 0.7, 0.9, 1, 1][i];
    const G = Glitch;
    return (
      <G amount={amount} seed={240 + i * 3}>
        <Night camera={FREEZE_CAM} t={T0} id="gls" year="2022" jersey={ERAS[2].accent} bar>
          {/* White hairlines across the whole width, so every slit cuts bright light at the frame's edges (like the touchline). */}
          {Array.from({ length: 18 }, (_, k) => (
            <rect key={k} x={0} y={640 + k * 52} width={WIDTH} height={3} fill="#F4F8FF" opacity={0.95} />
          ))}
        </Night>
      </G>
    );
  }
  if (frame >= 276 && frame <= 280) {
    const busy = frame <= 278;
    const era = frame === 278 ? 4 : frame >= 279 ? 3 : 2;
    const look = ERAS[era];
    return (
      <AbsoluteFill style={{ backgroundColor: NIGHT.skyTop }}>
        <Night camera={cameraFromShot(scene1Shot(300))} t={scene1T(300)} id="capb" jersey={look.accent}>
          {busy ? <BusySky /> : null}
        </Night>
        <EraCaption look={look} age={frame === 278 ? 6 : 60} accent={look.accent} knockout={frame === 277 || frame === 280 ? 0 : 1} />
        <Vignette strength={0.5} />
      </AbsoluteFill>
    );
  }
  if (frame >= 281 && frame <= 285) {
    if (frame <= 282) return <DetailLens progress={frame === 281 ? 1 : 0.6} />;
    const cam = frame === 285 ? CLOSE_CAM : FREEZE_CAM;
    const g = gapPoints(cam, T0);
    return (
      <AbsoluteFill>
        <Night camera={cam} t={T0} id="gmx">
          <GapMeasure
            a={g.a}
            b={g.b}
            label={frame === 285 ? "1.0 cm" : "1 cm"}
            progress={1}
            color={NIGHT.light.glow}
            pxPerM={g.pxPerM}
            fontSize={30}
            lineWidth={frame === 284 ? 1.5 : undefined}
            idPrefix="lab-gmx"
          />
        </Night>
        <Vignette strength={0.55} />
      </AbsoluteFill>
    );
  }
  if (frame === 286 || frame === 287) {
    return (
      <AbsoluteFill style={{ backgroundColor: "#6A6F78" }}>
        <Grain frame={frame} opacity={0.07} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ backgroundColor: "#111", color: "#666", fontFamily: FONTS.mono, fontSize: 30, alignItems: "center", justifyContent: "center" }}>
      {`frame ${frame}: gap`}
    </AbsoluteFill>
  );
};

// Lab for the effects and typography, over simple stand-in pictures (no
// athlete, no environment components; the stand-in leg is posed by the rig).
//
//   0-40     FootfallPulses, FREEZE_SHOT camera, fake footfalls at different ages (even steps are strong)
//   50-70    Glitch at 0.2 (50-56), 0.6 (57-63), 1.0 (64-70)
//   80-120   FrameShuffle 'out', progress 0 -> 1, three stand-in eras
//   125-160  FrameShuffle 'in', progress 0 -> 1
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
import { ERAS } from "../../lib/eras";
import { hash } from "../../lib/math";
import { FONTS, PALETTE } from "../../lib/palette";
import { Footfall, solvePose } from "../../lib/rig";
import { CLOSEUP_SHOT, FREEZE_SHOT, scene1Shot } from "../../lib/shots";
import { HEIGHT, WIDTH } from "../../lib/timeline";
import { CONTACT_POINT, T_FREEZE, TOE_LAND_T_DEFAULT, contactPointAt, toeAt } from "../../lib/touch";
import { Camera, D0, LINE_WIDTH, LINE_Z, Shot, cameraFromShot, project } from "../../lib/world";

const NIGHT = PALETTE["stadium-night"];
const DUSK = PALETTE["rosario-dusk"];
const POSE = solvePose(T_FREEZE, ERAS[0]);

/**
 * A stand-in night picture: sky, horizon haze, crowd lights, the line, the
 * rig's near leg as a figure of light, the ball. `ground` is drawn on the
 * grass under the figure and ball (like TheTouch's groundOverlay), `children` above.
 */
const Night: React.FC<{ camera: Camera; t: number; id: string; jersey?: string; year?: string; ground?: React.ReactNode; children?: React.ReactNode }> = ({
  camera,
  t,
  id,
  jersey = ERAS[0].accent,
  year,
  ground,
  children,
}) => {
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

const shuffleLayers = (prefix: string) =>
  [
    { jersey: ERAS[0].accent, year: "2026" },
    { jersey: ERAS[1].accent, year: "2023" },
    { jersey: ERAS[6].accent, year: "1994" },
  ].map((l, i) => <Night key={i} camera={FREEZE_CAM} t={T0} id={`${prefix}${i}`} jersey={l.jersey} year={l.year} />);

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
  if (frame >= 80 && frame <= 120) {
    return <FrameShuffle direction="out" progress={(frame - 80) / 40} seed={7} layers={shuffleLayers("sho")} />;
  }
  if (frame >= 125 && frame <= 160) {
    return <FrameShuffle direction="in" progress={(frame - 125) / 35} seed={7} layers={shuffleLayers("shi")} />;
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
        <FrameShuffle direction="out" progress={0.75} seed={7} layers={shuffleLayers("shv")} />
        <Vignette strength={0.55 * (1 - shuffleWhiteness(0.75, "out"))} />
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

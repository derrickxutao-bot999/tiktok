# Original score for segment 1 v2 ("the same sofa") -> out/score.wav (76 s).
# Real instrument recordings (University of Iowa MIS, via ../banana-39/audio).
# One theme in D major, 8 bars; every cue is placed on the film's cuts.
import os, sys, wave
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "banana-39", "audio"))
from synth import SR, band, reverb_ir, convolve   # noqa: E402
from sampler import play, section, fx             # noqa: E402

D = 76.0
N = int(D * SR)
BUS = {k: np.zeros((2, N)) for k in ("piano", "strings", "low", "brass", "perc", "glock")}

def put(bus, x, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N: return
    x = x[:, : N - i] * gain
    L, R = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
    BUS[bus][0, i:i + x.shape[1]] += x[0] * L; BUS[bus][1, i:i + x.shape[1]] += x[1] * R

def pno(t, note, dur, vel=0.5, soft=0.35, pan=0.0):
    inst = "piano_pp" if vel < 0.55 and 52 <= _m(note) <= 91 else "piano_mf"
    put("piano", play(inst, note, dur, vel=vel, rel=1.2, soft=soft, natural=True), t, 1.0, pan)

def chord(t, notes, dur, vel=0.4, spread=0.0, **kw):
    for i, n in enumerate(notes): pno(t + i * spread, n, dur, vel, **kw)

def strings(t, notes, dur, vel=0.5, att=0.6, rel=1.4, insts=("violin", "viola", "cello"), soft=0.3):
    for n in notes:
        m = _m(n); inst = "cello" if m < 55 else ("viola" if m < 64 and "viola" in insts else "violin")
        if inst not in insts: inst = insts[-1] if m < 60 else insts[0]
        put("strings" if m >= 50 else "low", section(inst, n, dur, n=3, vel=vel, att=att, rel=rel, soft=soft), t, 1.0, -0.3 if m >= 64 else 0.3 if m < 55 else 0.0)

_NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
def _m(n): return 12 * (int(n[-1]) + 1) + _NOTE[n[:-1]]
def up(n, k=12):  # transpose a note name
    m = _m(n) + k; names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    return f"{names[m % 12]}{m // 12 - 1}"

# the theme: (beat, note, beats) over 8 bars of 4
MEL = [(0, "F#5", 2), (2, "E5", 1), (3, "D5", 1), (4, "E5", 3), (7, "A4", 1), (8, "D5", 2), (10, "C#5", 1), (11, "B4", 1), (12, "A4", 4),
       (16, "B4", 2), (18, "C#5", 1), (19, "D5", 1), (20, "E5", 2), (22, "F#5", 1), (23, "G5", 1), (24, "F#5", 2), (26, "E5", 1), (27, "C#5", 1), (28, "D5", 4)]
CH = [["D3", "A3", "F#4"], ["C#3", "A3", "E4"], ["B2", "F#3", "D4"], ["F#2", "C#3", "A3"], ["G2", "D3", "B3"], ["A2", "E3", "C#4"], ["B2", "F#3", "D4"], ["D2", "A2", "F#3"]]

# ---------------------------------------------------------------- A: alone, then the child (solo piano, 70 bpm)
beat = 60 / 70; t0 = 11.6
for b, n, d in MEL:
    t = t0 + b * beat; bar = int(b // 4)
    if bar < 4: pno(t, n, d * beat * 1.05, vel=0.34 + 0.04 * (bar == 0), soft=0.45, pan=0.1)
    else:       # the child: an octave up, a glockenspiel on the melody
        pno(t, up(n), d * beat, vel=0.3, soft=0.35, pan=0.1)
        put("glock", play("glock", up(n), d * beat, vel=0.22, natural=True), t, 1.0, -0.2)
for k, c in enumerate(CH):
    t = t0 + k * 4 * beat
    chord(t, c, 4 * beat, vel=0.24 if k < 4 else 0.22, spread=0.09, soft=0.55, pan=-0.1)
    if k >= 4:  # broken-chord figure under the child
        for j in range(8): pno(t + j * beat / 2, [c[0], c[1], c[2], up(c[1])][j % 4], beat, vel=0.16, soft=0.6, pan=-0.15)
# the TV coming on: a rising line into the old broadcast
for i, n in enumerate(["A3", "D4", "F#4", "A4", "D5", "F#5", "A5"]): pno(32.25 + i * 0.12, n, 1.2, vel=0.22 + 0.03 * i, soft=0.3)
strings(32.4, ["A3", "E4", "C#5"], 3.2, vel=0.28, att=2.4, rel=1.0)

# ---------------------------------------------------------------- B: 1999 (strings, slight accelerando into the goal)
t8 = t0 + 28 * beat                                   # bar 8 (resolution) = 35.6
strings(t8, ["D3", "A3", "F#4", "D5"], 3.3, vel=0.42, att=0.9)
put("low", section("bass", "D2", 3.3, n=2, vel=0.4, att=0.6, rel=1.2), t8, 1.0)
bb = (45.0 - t8) / 3 / 4                               # beat so the goal falls on a downbeat
for k, (ch, mel) in enumerate([(CH[0], [(0, "F#5", 2), (2, "E5", 1), (3, "D5", 1)]), (CH[1], [(0, "E5", 3), (3, "A4", 1)])]):
    t = t8 + (k + 1) * 4 * bb
    strings(t, ch, 4 * bb, vel=0.38 + 0.06 * k, att=0.5)
    put("low", section("bass", ch[0][:-1] + "2", 4 * bb, n=2, vel=0.42, att=0.4, rel=1.0), t, 1.0)
    for b, n, d in mel: put("strings", section("violin", n, d * bb, n=4, vel=0.5 + 0.08 * k, att=0.12, rel=0.6, soft=0.2), t + b * bb, 1.0, -0.2)
    for j in range(8): pno(t + j * bb / 2, [ch[0], ch[1], ch[2], up(ch[1])][j % 4], bb, vel=0.26 + 0.05 * k, soft=0.4, pan=0.2)
put("perc", fx("roll18", 0.55)[:, : int(1.65 * SR)] * np.linspace(0.05, 1, int(1.65 * SR)) ** 2, 43.38)
for i, n in enumerate(["A4", "B4", "C#5", "D5", "E5"]): put("strings", section("violin", n, 0.3, n=4, vel=0.45 + 0.05 * i, att=0.03, rel=0.2), 43.75 + i * 0.25, 1.0, -0.2)
# GOAL (45.0): tutti on D, the melody up high, horns
G0 = 45.0
put("perc", fx("crash_viennese", 0.7), G0); put("perc", fx("roll20", 0.35), G0 + 0.2)
strings(G0, ["D3", "A3", "D4", "F#4", "A4"], 3.4, vel=0.62, att=0.05, rel=1.6)
put("low", section("bass", "D2", 3.4, n=3, vel=0.6, att=0.03, rel=1.4), G0, 1.0)
for n in ["D3", "A3", "F#4"]: put("brass", section("horn", n, 3.0, n=3, vel=0.5, att=0.08, rel=1.2), G0, 1.0, 0.2)
for b, n, d in [(0, "A5", 2), (2, "F#5", 1), (3, "D5", 1), (4, "D5", 2), (6, "C#5", 1), (7, "B4", 1)]:
    put("strings", section("violin", n, d * bb * 1.05, n=4, vel=0.62, att=0.06, rel=0.8, soft=0.15), G0 + b * bb, 1.0, -0.2)
chord(G0, ["D2", "A2", "D3", "F#3", "A3", "D4"], 3.0, vel=0.62, soft=0.1)
strings(G0 + 8 * bb, ["F#3", "C#4", "A4"], 2.6, vel=0.42, att=0.3, rel=1.4)        # A4 held: F#m, the cadence breathes
# up through the sky (48.6-51.2): suspended chord, a glittering arpeggio
strings(48.4, ["G3", "D4", "A4", "E5"], 3.0, vel=0.32, att=0.8, rel=1.6)
for i, n in enumerate(["D5", "E5", "A5", "B5", "D6", "E6", "A6", "B6", "D7"]):
    put("glock", play("glock", n, 0.6, vel=0.18, natural=True), 49.2 + i * 0.13, 1.0, -0.5 + i * 0.12)
    pno(49.2 + i * 0.13, up(n, -12), 0.6, vel=0.16, soft=0.2, pan=0.4 - i * 0.1)

# ---------------------------------------------------------------- C: 2008 (pulse, the penalty, the save)
b8 = 60 / 84; c0 = 51.2
for j in range(int((56.6 - c0) / (b8 / 2))):               # piano ostinato in eighths
    t = c0 + j * b8 / 2; n = ["D3", "A3", "E4", "A3"][j % 4] if t < 54 else ["D3", "A3", "F#4", "A3"][j % 4]
    pno(t, n, b8 / 2, vel=0.2 + (0.08 if j % 4 == 0 else 0), soft=0.45, pan=0.15)
for j in range(int((56.6 - c0) / b8)): put("low", play("cello_pizz", "A2" if c0 + j * b8 < 54 else "D2", 0.4, vel=0.5, natural=True), c0 + j * b8, 1.0, 0.25)
strings(c0, ["A3", "E4", "A4", "C#5"], 54.0 - c0, vel=0.3, att=2.2, rel=0.4)        # held dominant: the penalty
for i, n in enumerate(["E5", "F#5", "G5", "G#5"]): put("strings", section("violin", n, 0.62, n=3, vel=0.3 + 0.06 * i, att=0.15, rel=0.3), 51.8 + i * 0.55, 1.0, -0.2)
put("perc", fx("roll18", 0.5)[:, : int(1.3 * SR)] * np.linspace(0.05, 1, int(1.3 * SR)) ** 2, 52.72)
S0 = 54.0                                                     # THE SAVE
put("perc", fx("crash_viennese", 0.65), S0)
strings(S0, ["D3", "A3", "D4", "F#4", "A4"], 2.6, vel=0.6, att=0.05, rel=1.4)
put("low", section("bass", "D2", 2.6, n=3, vel=0.6, att=0.03, rel=1.2), S0, 1.0)
for n in ["D3", "A3", "F#4"]: put("brass", section("horn", n, 2.4, n=3, vel=0.48, att=0.08, rel=1.0), S0, 1.0, 0.2)
for b, n, d in [(0, "B4", 1), (1, "C#5", 0.5), (1.5, "D5", 0.5), (2, "E5", 1), (3, "F#5", 0.5), (3.5, "G5", 0.5), (4, "A5", 2)]:
    put("strings", section("violin", n, d * b8, n=4, vel=0.58, att=0.05, rel=0.6, soft=0.15), S0 + b * b8, 1.0, -0.2)
chord(S0, ["D2", "A2", "D3", "F#3", "A3"], 2.4, vel=0.55, soft=0.15)
# the others fade away: strings thin out, the piano alone (m7, slowly)
strings(56.3, ["B2", "F#3", "D4"], 3.0, vel=0.3, att=0.4, rel=2.2)
for b, n, d in [(0, "F#5", 1.2), (1.2, "E5", 0.8), (2.0, "C#5", 1.6)]: pno(57.4 + b, n, d, vel=0.3, soft=0.45)
chord(57.4, ["A2", "E3"], 2.0, vel=0.2, soft=0.6)
# the face changes (59.5-62): D, held, dying away
pno(59.9, "D5", 2.2, vel=0.26, soft=0.5); chord(59.9, ["D2", "A2", "F#3"], 2.2, vel=0.18, soft=0.6)

# ---------------------------------------------------------------- D: after the click, the boy in the glass
pno(69.9, "F#5", 1.0, vel=0.24, soft=0.5); pno(70.85, "E5", 1.0, vel=0.22, soft=0.5)
pno(71.8, "D5", 3.4, vel=0.24, soft=0.5); chord(71.8, ["D2", "A2", "F#3"], 3.4, vel=0.16, soft=0.65, spread=0.12)
put("glock", play("glock", "A6", 2.0, vel=0.12, natural=True), 73.3, 1.0, -0.2)
pno(73.3, "A5", 2.5, vel=0.16, soft=0.4)

# ---------------------------------------------------------------- mix: buses, a hall, a soft master
mix = (BUS["piano"] * 0.9 + BUS["strings"] * 0.8 + BUS["low"] * 0.85 + BUS["brass"] * 0.55 + BUS["perc"] * 0.6 + BUS["glock"] * 0.7)
ir = reverb_ir(2.6, 7)
wet = np.stack([convolve(mix[0], ir), convolve(mix[1], np.roll(ir, 240))])
out = mix * 0.82 + wet * 0.34
out = np.stack([band(ch, 35, 16000) for ch in out])
out = np.tanh(out * 1.1) / 1.1
fade = np.ones(N); e = int((D - 0.6) * SR); fade[e:] = np.linspace(1, 0, N - e); out *= fade
out *= 0.85 / (np.abs(out).max() + 1e-9)
os.makedirs("out", exist_ok=True)
w = wave.open("out/score.wav", "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((np.clip(out.T, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
print("ok", round(float(np.abs(out).max()), 3))

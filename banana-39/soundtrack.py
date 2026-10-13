"""Score + sound design for 一根香蕉的39年 (116 s), cued to js/main.js -> out/soundtrack.wav

A five-note "banana" motif travels through the eras: an anxious high piano at Anfield, a lonely piano
in the 1987 rain, a comic bassoon for Frank Newton's entrance, flute and trumpet over a Madchester
acid-house groove (1988), a tape-stop when the era ends, heroic D major brass after Wembley 1999,
a music box in the shoebox, near-silence for the verdict, and an unresolved piano at the end.
Real instruments: University of Iowa MIS (unrestricted use). Drums, 303 bass, choir, SFX: synthesised.
"""
import os
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio"))
from sampler import fx, midi, play, section  # noqa: E402
from synth import SR, adsr, band, boom, choir, convolve, crowd, heartbeat, hz, noise, reverb_ir, riser, rng, timpani, tt  # noqa: E402
from synth2 import (acid, boos, clap, claps, hat, hiss, kick, organ, pad, pulse, rain, rewind, rustle, shaker, snare,  # noqa: E402
                    tamb, tape_clunk, tick, tom, whistle)

DUR = 116.0
N = int(DUR * SR)
BUS = {k: np.zeros((2, N)) for k in ("orch", "groove", "choir", "perc", "sfx")}


def put(y, at, gain=1.0, pan=0.0, bus="orch"):
    if y.ndim == 1:
        y = np.stack([y, y]) * .7071
    i = int(at * SR)
    if i >= N:
        return
    if i < 0:
        y, i = y[:, -i:], 0
    y = y[:, :N - i] * gain
    BUS[bus][0, i:i + y.shape[1]] += y[0] * np.cos((pan + 1) * np.pi / 4) * 1.4142
    BUS[bus][1, i:i + y.shape[1]] += y[1] * np.sin((pan + 1) * np.pi / 4) * 1.4142


SEC = {"violin": (-.35, 1.0), "viola": (.1, .8), "cello": (.32, .95), "bass": (.45, .85), "horn": (-.2, .75), "trombone": (.25, .62), "trumpet": (.05, .55)}
V = {"Dm": {"bass": ["D2"], "cello": ["D3", "A3"], "viola": ["F4"], "violin": ["A4", "D5", "F5"]},
     "Bb": {"bass": ["Bb1"], "cello": ["Bb2", "F3"], "viola": ["D4"], "violin": ["F4", "Bb4", "D5"]},
     "F": {"bass": ["F1"], "cello": ["F2", "C3"], "viola": ["A3"], "violin": ["F4", "A4", "C5"]},
     "C": {"bass": ["C2"], "cello": ["C3", "G3"], "viola": ["E4"], "violin": ["G4", "C5", "E5"]},
     "Gm": {"bass": ["G1"], "cello": ["G2", "D3"], "viola": ["Bb3"], "violin": ["G4", "Bb4", "D5"]},
     "A": {"bass": ["A1"], "cello": ["A2", "E3"], "viola": ["C#4"], "violin": ["E4", "A4", "C#5"]},
     "D": {"bass": ["D2"], "cello": ["D3", "A3"], "viola": ["F#4"], "violin": ["A4", "D5", "F#5"]},
     "G": {"bass": ["G1"], "cello": ["G2", "D3"], "viola": ["B3"], "violin": ["G4", "B4", "D5"]},
     "Bm": {"bass": ["B1"], "cello": ["B2", "F#3"], "viola": ["D4"], "violin": ["F#4", "B4", "D5"]}}
CH = {"Dm": ["D", "F", "A"], "Bb": ["Bb", "D", "F"], "F": ["F", "A", "C"], "C": ["C", "E", "G"]}


def strings(ch, at, dur, vel=.8, soft=.4, att=.25, rel=.6, only=None, bus="orch"):
    for sec, notes in V[ch].items():
        if only and sec not in only:
            continue
        for n in notes:
            put(section(sec, n, dur, n=2 if sec == "bass" else 3, vel=vel, soft=soft, att=att, rel=rel), at, SEC[sec][1], SEC[sec][0], bus)


def brass(sec, notes, at, dur, vel=.8, soft=.15, att=.05, rel=.45, bus="orch"):
    for note in notes:
        put(section(sec, note, dur, n=2, cents=5, vel=vel, soft=soft, att=att, rel=rel), at, SEC[sec][1], SEC[sec][0], bus)


def solo(inst, note, at, dur, vel=.8, pan=0.0, gain=1.0, bus="orch", **kw):
    put(play(inst, note, dur, vel=vel, **kw), at, gain, pan, bus)


def piano(note, at, vel=.6, dur=None, pan=.15, bus="orch"):
    layer = "piano_pp" if vel < .42 and midi(note) >= 52 else "piano_mf"
    put(play(layer, note, dur or 1.0, vel=vel, natural=dur is None, rel=.3), at, 1.0, pan, bus)


def ring(inst, note, at, vel=.5, pan=0.0, gain=1.0, bus="orch"):
    put(play(inst, note, 0, vel=vel, natural=True), at, gain, pan, bus)


def hit(name, at, gain=1.0, pan=0.0, bus="perc", rev=False, length=None):
    x = fx(name)
    if length:
        x = x[:, :int(length * SR)]
    if rev:
        x = x[:, ::-1].copy()
        at -= x.shape[1] / SR
    put(x, at, gain, pan, bus)


def up(n, k):
    return n[:-1] + str(int(n[-1]) + k)


MOTIF = {"maj": [("C5", .5), ("F5", .5), ("E5", 1), ("C5", .5), ("A4", 1.5)],
         "min": [("A4", .5), ("D5", .5), ("C#5", 1), ("A4", .5), ("F4", 1.5)],
         "D": [("A4", .5), ("D5", .5), ("C#5", 1), ("A4", .5), ("F#4", 1.5)]}


def motif(kind, start, beat, fn, octave=0):
    t = start
    for n, b in MOTIF[kind]:
        fn(up(n, octave), t, b * beat)
        t += b * beat


# ======================= 0 – 10.4  Anfield, 2026 =======================
put(crowd(10.8, .9) * adsr(int(10.8 * SR), 1.0, .5, .9, 1.2), 0, 1, 0, "sfx")
put(choir(hz("D3"), 10, "oo", 14, 1.5, 1.5) + choir(hz("A3"), 10, "oo", 14, 1.5, 1.5), 0, .45, -.2, "choir")
b6 = .3
for i in range(34):
    n = ["D2", "D2", "D3", "D2", "D2", "D3", "C3", "D3"][i % 8]
    solo("cello", n, .2 + i * b6, .24, vel=.5 + .4 * i / 34, pan=.3, att=.01, rel=.08)
    if i % 2 == 0:
        put(pulse(hz("D2"), .28, .6 + .3 * i / 34), .2 + i * b6, .9, 0, "orch")
put(timpani(hz("D2"), 2.5, .8), .2, 1, 0, "perc")
put(boom(3, 55, 30, .5), .2, 1, 0, "sfx")
brass("horn", ["D3", "F3", "A3"], 4.25, 3.0, vel=.75, soft=.3, att=.8, rel=1.0)
brass("trombone", ["D2", "A2"], 4.25, 3.0, vel=.6, soft=.35, att=.8, rel=1.0)
motif("min", 7.45, .6, lambda n, t, d: piano(up(n, 1), t, .62, pan=-.1))
put(riser(.9, 300, 8000, .7), 9.5, 1, 0, "sfx")
hit("crash_viennese", 10.4, .35, 0, rev=True, length=1.0)

# ======================= 10.4 – 12.2  rewind ===========================
put(rewind(1.85), 10.4, 1, 0, "sfx")
put(tape_clunk(), 12.18, 1, 0, "sfx")

# ======================= 12.2 – 19.5  Manchester, 1987 =================
put(hiss(45.3, 1.0), 12.2, 1, 0, "sfx")
put(rain(7.6, 1.0) * adsr(int(7.6 * SR), .4, .2, 1, 1.0), 12.2, 1, 0, "sfx")
put(band(noise(7.4), 30, 150) * .05, 12.2, 1, 0, "sfx")
for n in ("D3", "F3", "A3"):
    piano(n, 12.5, .4)
motif("min", 13.0, 1.0, lambda n, t, d: piano(n, t, .55))
put(section("cello", "D2", 7.0, n=2, vel=.45, soft=.7, att=1.2, rel=1.0), 12.4, .95, .3)
brass("trombone", ["D2", "A2"], 15.9, 3.4, vel=.45, soft=.5, att=1.2, rel=.8)
brass("horn", ["Bb2", "D3", "F3"], 15.9, 3.4, vel=.45, soft=.5, att=1.2, rel=.8)
put(whistle(.55, 3100, .6), 17.2, .7, .5, "sfx")
put(whistle(.3, 3100, .5), 17.85, .6, .5, "sfx")

# ======================= 19.5 – 31  Maine Road: a man and a banana ======
B1 = .6
walk = ["F3", "A3", "C4", "A3", "Bb3", "G3", "E3", "C3", "F3", "A3", "C4", "F4"]
for i, n in enumerate(walk):
    solo("bassoon", n, 19.6 + i * B1 / 2 * 1.08, .2, vel=.8, pan=-.15, att=.01, rel=.08)
for k in range(7):
    ring("bass_pizz", ["F2", "C2"][k % 2], 19.6 + k * B1, .85, .4)
    for n in ("F4", "A4", "C5"):
        ring("violin_pizz", n, 19.6 + k * B1 + B1 / 2, .45, -.3)
put(crowd(11.5, .5), 19.5, 1, 0, "sfx")
for i, n in enumerate(("C6", "E6", "G6", "C7")):
    ring("glock", n, 23.55 + i * .07, .5, .2)
ring("crotale", "C7", 23.85, .4, .25)
put(crowd(4.0, .85) * adsr(int(4 * SR), .2, .4, .65, 1.2), 23.7, 1, 0, "sfx")
for k in range(5):
    put(snare(.18 + .05 * k), 26.1 + k * .12, 1, 0, "perc")
for i, n in enumerate(("C6", "A5", "F5", "C5")):
    solo("clarinet", n, 24.4 + i * .16, .12, vel=.75, pan=.2, att=.005, rel=.06)
for i, n in enumerate(("F2", "F2")):
    solo("bassoon", n, 25.2 + i * .3, .18, vel=.8, pan=-.15, att=.005, rel=.06)
put(claps(4.9, 100, .9), 26.1, 1, 0, "sfx")
for i in range(7):
    put(choir(hz(["F4", "A4"][i % 2]), 1.3, "ah", 14, .05, .25), 26.7 + i * 1.2 * .5, .55, 0, "choir")
for k in range(14):
    put(snare(.35 + .04 * k), 26.7 + k * .3, 1, 0, "perc")
motif("maj", 27.0, B1, lambda n, t, d: (solo("bassoon", up(n, -1), t, d * .9, vel=.8, pan=-.1, att=.01, rel=.1), solo("clarinet", n, t, d * .9, vel=.7, pan=.1, att=.01, rel=.1)))
motif("maj", 29.4, B1 * .9, lambda n, t, d: (solo("clarinet", n, t, d * .9, vel=.85, pan=.1, att=.01, rel=.1), solo("trumpet", n, t, d * .9, vel=.6, att=.02, rel=.1)))
for k in range(8):
    put(snare(.25 + .08 * k), 30.5 + k * .06, 1, 0, "perc")

# ======================= 31 – 56.5  the craze: a Madchester groove ======
B = 2.0714 / 4                      # 115.9 bpm, bar lines at 31.0 … 45.5 …
S16 = B / 4
PROG = ["Dm", "Bb", "F", "C"]
for bar in range(13):
    t0 = 31.0 + bar * 4 * B
    if t0 >= 56.5:
        break
    ch = PROG[bar % 4]
    root = {"Dm": "D", "Bb": "Bb", "F": "F", "C": "C"}[ch]
    brk = 42.2 <= t0 + 2 * B < 45.5          # the breakdown: drums out
    full = bar >= 2 and not brk
    sad = t0 >= 53.0
    for b in range(4):
        tb = t0 + b * B
        if tb >= 56.5 or (42.2 <= tb < 45.5):
            continue
        put(kick(1.0 if full else .7), tb, 1.15 if t0 >= 45.5 and not sad else 1, 0, "groove")
        put(hat(.8, True), tb + B / 2, .9, .25, "groove")
        if full and not sad:
            if b % 2:
                put(clap(1.0), tb, 1, -.1, "groove")
                put(snare(.6), tb, .8, .1, "groove")
            for s in range(4):
                put(shaker(.7 + .3 * (s == 2)), tb + s * S16, 1, -.35, "groove")
                put(hat(.45), tb + s * S16, 1, .3, "groove")
            if t0 >= 45.5:
                put(tamb(.8), tb + B / 2, 1, .4, "groove")
        # house piano stabs on the off-beats (resting through the breakdown)
        for nn in CH[ch]:
            if not (42.2 <= tb + B / 2 < 45.4):
                piano(nn + ("5" if nn in ("C", "D") else "4"), tb + B / 2, .42 if not sad else .3, dur=.16, pan=-.2, bus="groove")
        if full and b in (1, 3):
            for nn in CH[ch]:
                put(organ(hz(nn + "4"), .22, .9), tb + B * .75, 1, .2, "groove")
    # bass: funky pizz + sub until the acid line arrives
    if bar < 3:
        for b in range(4):
            ring("bass_pizz", root + "2", t0 + b * B, .95, .35, bus="groove")
            put(pulse(hz(root + "1"), B * .45, .9, .35), t0 + b * B, .8, 0, "groove")
    else:
        r0 = hz(root + "2")
        pat = [(1, 1, 0), (1, 0, 0), (2, 0, 0), (1, 0, 0), (None, 0, 0), (1, 0, 0), (2, 0, 1), (1.5, 1, 0),
               (1, 0, 0), (None, 0, 0), (2, 1, 0), (1, 0, 0), (1.19, 0, 1), (1, 0, 0), (2, 0, 0), (1.5, 0, 1)]
        notes = [(None if m is None else r0 * m, a, s) for m, a, s in pat]
        if t0 + 4 * B > 56.5:
            notes = notes[:int((56.5 - t0) / S16)]
        lo, hi = (180, 900) if brk else (240, 3400) if 39 <= t0 < 45.5 else (220, 1500) if sad else (260, 2200)
        put(acid(notes, S16, (lo, hi), .9 if brk else .86, .9), t0, .55 if brk else 1.15 if t0 >= 45.5 else 1, 0, "groove")
# flute motif over the zoo, organ motif in the club, trumpet in Stoke
motif("maj", 35.14, B, lambda n, t, d: solo("flute", up(n, 1), t, d * .95, vel=.75, pan=.15, bus="groove", att=.02, rel=.15))
motif("maj", 37.21, B, lambda n, t, d: solo("flute", up(n, 1), t, d * .95, vel=.8, pan=.15, bus="groove", att=.02, rel=.15))
motif("maj", 41.36, B, lambda n, t, d: put(organ(hz(n), d * .9, 1.1), t, 1, 0, "groove"))
# breakdown: a city in decline, finding its joy
for i, ch in enumerate(("Dm", "Bb", "F", "C")):
    put(pad([hz(nn + "3") for nn in CH[ch]], 1.0, .9, .3, .4), 42.2 + i * .82, 1, 0, "groove")
motif("min", 42.4, .62, lambda n, t, d: solo("flute", n, t, d, vel=.55, pan=.1, bus="groove", att=.08, rel=.3))
put(riser(1.4, 300, 9000, .9), 44.1, 1, 0, "groove")
for k in range(16):
    put(snare(.2 + .05 * k), 44.5 + k * .0625, 1, 0, "groove")
# Stoke: the party
hit("crash_viennese", 45.5, .8, 0, bus="groove")
put(crowd(11.0, 1.1) * adsr(int(11 * SR), .3, .5, .8, 1.5), 45.5, 1, 0, "groove")
for at in (46.1, 47.4, 48.9, 51.0, 52.2):
    put(whistle(.5 + rng.random() * .3, 2600 + rng.random() * 800, .8), at, .7, (rng.random() - .5) * 1.4, "groove")
for bar_t in (45.5, 49.64):
    motif("maj", bar_t, B, lambda n, t, d: (solo("trumpet", n, t, d * .95, vel=.95, bus="groove", att=.02, rel=.15), solo("trumpet", up(n, -1), t, d * .95, vel=.6, pan=.15, bus="groove", att=.02, rel=.15)))
brass("horn", ["F3", "A3", "C4"], 49.64, .4, vel=.9, att=.01, rel=.2, bus="groove")
hit("crash_heavy", 49.64, .6, 0, bus="groove")
put(crowd(3.5, 1.2) * adsr(int(3.5 * SR), .1, .3, .7, 1.5), 49.64, 1, 0, "groove")
motif("maj", 53.79, B * 1.2, lambda n, t, d: solo("flute", up(n, 1), t, d, vel=.6, pan=.1, bus="groove", att=.05, rel=.3))

# ======================= 57.4 – 64.4  the fall ==========================
put(rain(7.2, .9) * adsr(int(7.2 * SR), .3, .2, 1, 1.0), 57.4, 1, 0, "sfx")
motif("min", 57.6, .9, lambda n, t, d: piano(n, t, .5))
for at, ch in ((57.4, "Dm"), (58.6, "C"), (59.8, "Bb"), (61.0, "A"), (62.2, "Gm"), (63.4, "A")):
    strings(ch, at, 1.2, vel=.5, soft=.55, att=.35, rel=.4)
for at in (61.25, 62.55):
    put(timpani(hz("D2"), 1.6, 1.0), at, 1, 0, "perc")
    put(boom(2, 50, 30, .55), at, 1, 0, "sfx")

# ======================= 64.5 – 74.5  Wembley, 1999 =====================
put(crowd(5.0, .7), 64.5, 1, 0, "sfx")
for k in range(5):
    put(tick(.9), 64.6 + k, 1, -.3, "sfx")
for i in range(38):
    t = 64.5 + i * .125
    solo("viola", ["A3", "A3", "E4", "A3"][i % 4], t, .1, vel=.45 + .45 * i / 38, pan=.1, att=.005, rel=.04)
    if i % 4 == 0:
        solo("cello", "A2", t, .2, vel=.5 + .4 * i / 38, pan=.3, att=.005, rel=.06)
put(crowd(1.4, .8) * adsr(int(1.4 * SR), .05, .3, .5, .8), 66.3, 1, 0, "sfx")
brass("horn", ["A3", "C#4", "E4"], 66.3, .35, vel=.85, att=.01, rel=.2)
for k in range(16):
    put(timpani(hz("A1", 1), .5, .2 + .05 * k), 68.3 + k * .06, 1, 0, "perc")
strings("D", 69.3, 2.0, vel=1.0, soft=0, att=.02, rel=.8)
brass("horn", ["D3", "F#3", "A3", "D4"], 69.3, 1.8, vel=1.0, rel=.8)
brass("trombone", ["D2", "A2"], 69.3, 1.8, vel=.95, rel=.8)
hit("crash_viennese", 69.3, .85)
hit("tamtam40", 69.3, .45)
put(timpani(hz("D2"), 2.2, 1.0), 69.3, 1, 0, "perc")
put(crowd(4.2, 1.5) * adsr(int(4.2 * SR), .05, .5, .7, 2.0), 69.3, 1, 0, "sfx")
for k in range(2):
    put(heartbeat(.7), 71.4 + k * .45, 1, 0, "sfx")
solo("violin", "A5", 71.3, .9, vel=.4, pan=-.3, soft=.3, att=.2, rel=.2)
put(riser(.35, 800, 9000, .8)[::-1].copy(), 72.2, 1, 0, "sfx")
put(crowd(2.8, 1.4) * adsr(int(2.8 * SR), .05, .4, .7, 1.4), 72.25, 1, 0, "sfx")
hit("crash_heavy", 72.3, .6)
motif("D", 72.6, .32, lambda n, t, d: (solo("trumpet", n, t, d * .95, vel=1.0, att=.02, rel=.15), solo("horn", up(n, -1), t, d * .95, vel=.7, pan=-.2, att=.02, rel=.15)))
strings("D", 72.6, 1.6, vel=.85, soft=.1, att=.05, rel=1.0)

# ======================= 74.5 – 84.5  the money era =====================
for i in range(38):
    t = 74.5 + i * .125
    solo("violin", ["D5", "F#5", "A5", "F#5"][i % 4], t, .1, vel=.5 + .2 * (i % 4 == 0), pan=-.3, att=.005, rel=.05)
strings("D", 74.5, 2.3, vel=.6, soft=.3, att=.4, rel=.3, only=("bass", "cello", "viola"))
strings("Bm", 76.8, 2.2, vel=.6, soft=.3, att=.2, rel=.4, only=("bass", "cello", "viola"))
motif("D", 76.0, .5, lambda n, t, d: brass("horn", [n, up(n, -1)], t, d * .95, vel=.85, att=.02, rel=.15))
put(timpani(hz("D2"), 2, .8), 74.5, 1, 0, "perc")
for at, ch in ((79.2, "D"), (80.5, "Bm"), (81.8, "G"), (83.1, "A")):
    strings(ch, at, 1.25, vel=.85 if at in (79.2, 81.8) else .65, soft=.1, att=.03, rel=.35)
    brass("horn", [V[ch]["cello"][0], V[ch]["viola"][0]], at, 1.2, vel=.75, att=.03, rel=.3)
for at in (79.2, 81.8):
    hit("crash_viennese", at, .5)
    put(timpani(hz("D2"), 2, 1.0), at, 1, 0, "perc")
    put(choir(hz("D4"), 1.4, "ah", 10, .05, .8) + choir(hz("A4"), 1.4, "ah", 10, .05, .8), at, .5, 0, "choir")
for at in (79.3, 79.9, 80.5, 82.0, 82.25, 82.5):
    ring("crotale", "A6" if at < 81 else "D7", at, .45, (rng.random() - .5) * .8)
motif("D", 81.8, .45, lambda n, t, d: solo("trumpet", up(n, 0), t, d * .95, vel=.9, att=.02, rel=.15))

# ======================= 84.5 – 87.5  the shoebox =======================
put(hiss(3.2, .8), 84.5, 1, 0, "sfx")
motif("maj", 84.7, .42, lambda n, t, d: ring("glock", up(n, 1), t, .45, .1))
put(pad([hz("F3"), hz("A3"), hz("C4")], 3.2, .8, 1.0, 1.0), 84.5, 1, 0, "orch")

# ======================= 87.5 – 96  the verdict =========================
put(section("cello", "D2", 8.2, n=2, vel=.5, soft=.6, att=.6, rel=.6), 87.5, .95, .3)
put(pulse(hz("D1"), 8.2, .35, .2) * adsr(int(8.2 * SR), 1.0, .2, 1, 1.0), 87.5, 1, 0, "orch")
for k in range(9):
    put(tick(.8), 87.6 + k, 1, (-.3 if k % 2 else .3), "sfx")
for sec, n in (("violin", "Eb5"), ("violin", "D5"), ("viola", "G#4"), ("violin", "A4")):
    put(section(sec, n, 3.6, vel=.4, soft=.4, att=2.0, rel=1.4), 88.4, SEC[sec][1], SEC[sec][0])
put(rustle(8.4, 1.0), 87.6, 1, 0, "sfx")
for n in ("A1", "D2"):
    piano(n, 91.9, .8)
hit("tamtam_bow", 92.0, .3)

# ======================= 96 – 104.5  Anfield again ======================
put(crowd(8.8, .9), 96.0, 1, 0, "sfx")
put(choir(hz("D3"), 8.4, "oo", 14, 1.0, 1.0) + choir(hz("F3"), 8.4, "oo", 14, 1.0, 1.0), 96.0, .5, -.2, "choir")
put(boos(4.0, 1.0), 100.4, 1, .35, "sfx")
for i in range(28):
    t = 96.0 + i * .3
    solo("cello", ["D2", "D2", "D3", "D2"][i % 4], t, .24, vel=.6 + .3 * i / 28, pan=.3, att=.01, rel=.08)
    if i % 2 == 0:
        put(kick(.8 + .2 * (i % 4 == 0)), t, .9, 0, "perc")
for at, ch in ((96.0, "Dm"), (98.4, "Bb"), (100.8, "Gm"), (103.2, "A")):
    brass("horn", V[ch]["cello"] + V[ch]["viola"], at, 2.3, vel=.6, soft=.3, att=.4, rel=.3)
motif("min", 97.3, .6, lambda n, t, d: (solo("trumpet", n, t, d * .95, vel=.9, att=.02, rel=.15), solo("horn", up(n, -1), t, d * .95, vel=.6, pan=-.2, att=.02, rel=.15)))
for k in range(8):
    put(tom(110 - k * 6, .5 + .06 * k), 102.6 + k * .23, 1, (k % 2 - .5) * .6, "perc")
put(riser(1.6, 300, 9000, .7), 102.9, 1, 0, "sfx")

# ======================= 104.5 – 116  the last banana ===================
motif("maj", 104.8, 1.1, lambda n, t, d: piano(n, t, .55, pan=0))
for at, lh in ((104.8, ("F2", "C3")), (107.0, ("Bb1", "F2")), (109.5, ("D2", "A2")), (111.6, ("Bb1", "F2", "C3"))):
    for n in lh:
        piano(n, at, .42)
for at, chord in ((104.6, ["F3", "A3", "C4"]), (107.0, ["Bb2", "D3", "F3"]), (109.5, ["D3", "F3", "A3"]), (111.6, ["Bb2", "D3", "F3", "C4"])):
    put(pad([hz(n) for n in chord], 2.6 if at < 111 else 4.4, .9, 1.0, 1.6), at, 1, 0, "orch")
for sec, n in (("cello", "F2"), ("viola", "C4"), ("violin", "A4")):
    put(section(sec, n, 6.0, vel=.35, soft=.75, att=2.0, rel=2.0), 104.6, SEC[sec][1], SEC[sec][0])
ring("crotale", "E7", 109.6, .35, .2)
piano("E5", 111.6, .45)

# ======================= mix & master ===================================
# 56.5 – 57.4: the tape stops — the whole 1988 groove winds down to nothing
i0, i1 = int(56.5 * SR), int(57.4 * SR)
n = i1 - i0
pos = np.cumsum((1 - np.linspace(0, 1, n)) ** 2)
for name in ("groove", "sfx"):
    b = BUS[name]
    seg = b[:, i0:i0 + int(pos[-1]) + 2].copy()
    b[:, i0:i1] = np.stack([np.interp(pos, np.arange(seg.shape[1]), ch) for ch in seg]) * np.linspace(1, 0, n) ** .5
BUS["groove"][:, i1:] = 0
s_ = BUS["sfx"][:, i1:int(57.45 * SR)]
s_ *= 0
BUS["choir"] *= 5.0
hall, room = (reverb_ir(2.6, 1), reverb_ir(2.6, 2)), (reverb_ir(1.2, 5, 8), reverb_ir(1.2, 6, 8))
SENDS = {"orch": (.8, .34, hall), "groove": (.85, .16, room), "choir": (.6, .55, hall), "perc": (.85, .28, hall), "sfx": (.9, .15, hall)}
mix = np.zeros((2, N))
for name, (dry, wet, ir) in SENDS.items():
    b = BUS[name]
    mix += b * dry + np.stack([convolve(b[0], ir[0]), convolve(b[1], ir[1])]) * wet
mix = np.stack([band(ch, 28) for ch in mix])
blk = 256
env = np.sqrt(np.mean((mix[:, :N // blk * blk] ** 2).reshape(2, -1, blk), axis=(0, 2)) + 1e-12)
ref = np.sqrt(np.mean(mix ** 2)) + 1e-12
lev = 20 * np.log10(env / ref)
gr = np.where(lev > -2, (lev + 2) * (1 / 3 - 1), 0.0)
for i in range(1, len(gr)):
    c = .35 if gr[i] < gr[i - 1] else .02
    gr[i] = gr[i - 1] + (gr[i] - gr[i - 1]) * c
mix *= np.interp(np.arange(N), np.arange(len(gr)) * blk + blk / 2, 10 ** (gr / 20))
fade = np.ones(N)
fade[:int(.3 * SR)] = np.linspace(0, 1, int(.3 * SR))
fade[-int(1.2 * SR):] = np.linspace(1, 0, int(1.2 * SR))
mix *= fade
mix *= .105 / np.sqrt(np.mean(mix ** 2))
mix = np.tanh(mix * 1.15) / np.tanh(1.15) * .93
os.makedirs("out", exist_ok=True)
with wave.open("out/soundtrack.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((np.clip(mix.T, -1, 1) * 32767).astype(np.int16).tobytes())
print("out/soundtrack.wav written · peak %.2f" % np.max(np.abs(mix)))

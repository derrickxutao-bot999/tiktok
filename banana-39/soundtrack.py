"""Score + sound design for 一根香蕉的39年 (122 s), cued to js/main.js -> out/soundtrack.wav

Every cut in the film lands on a downbeat, and every transition has its own musical gesture: the Anfield
score rewinds with the picture, the tape lurches into 1987, camcorder cuts glitch, a bassoon pickup walks
Frank Newton in, whip pans whoosh onto the groove's bar lines, the groove dives into a banana and comes out
in a club, a snare roll strobes into Boxing Day, the tape stops, timpani land with each relegation, a TV
sting wipes to Wembley, a music box winds down and never plays its last note, a clock locks into the tempo
of Anfield, a deceptive cadence opens the montage of the lows, and the five-note banana motif finally
resolves on its missing note under the end card.
Real instruments: University of Iowa MIS (unrestricted use). Drums, 303 bass, choir, SFX: synthesised.
"""
import os
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio"))
from sampler import fx, midi, play, section  # noqa: E402
from synth import SR, adsr, band, boom, choir, convolve, crowd, heartbeat, hz, noise, reverb_ir, riser, rng, timpani, tt  # noqa: E402
from synth2 import (acid, boos, clap, claps, click, crackle, glitch, hat, hiss, kick, organ, pad, pop, pulse, rain,  # noqa: E402
                    rewind, rustle, shaker, shutter, snare, tamb, tape_clunk, tick, whistle, whoosh)

DUR = 122.0
N = int(DUR * SR)
BUS = {k: np.zeros((2, N)) for k in ("orch", "groove", "choir", "perc", "sfx")}
POST = np.zeros((2, N))   # dry sounds added after the rewind / choke edits


def put(y, at, gain=1.0, pan=0.0, bus="orch"):
    if y.ndim == 1:
        y = np.stack([y, y]) * .7071
    i = int(round(at * SR))
    if i >= N:
        return
    if i < 0:
        y, i = y[:, -i:], 0
    y = y[:, :N - i] * gain
    dst = POST if bus == "post" else BUS[bus]
    dst[0, i:i + y.shape[1]] += y[0] * np.cos((pan + 1) * np.pi / 4) * 1.4142
    dst[1, i:i + y.shape[1]] += y[1] * np.sin((pan + 1) * np.pi / 4) * 1.4142


def sweep_pan(y, p0, p1):
    """mono -> stereo with the pan moving from p0 to p1"""
    p = np.linspace(p0, p1, len(y))
    return np.stack([y * np.cos((p + 1) * np.pi / 4), y * np.sin((p + 1) * np.pi / 4)]) * 1.4142


def env_in_out(n, a, r):
    e = np.ones(n)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


SEC = {"violin": (-.35, 1.0), "viola": (.1, .8), "cello": (.32, .95), "bass": (.45, .85), "horn": (-.2, .75), "trombone": (.25, .62), "trumpet": (.05, .55)}
V = {"Dm": {"bass": ["D2"], "cello": ["D3", "A3"], "viola": ["F4"], "violin": ["A4", "D5", "F5"]},
     "Bb": {"bass": ["Bb1"], "cello": ["Bb2", "F3"], "viola": ["D4"], "violin": ["F4", "Bb4", "D5"]},
     "F": {"bass": ["F1"], "cello": ["F2", "C3"], "viola": ["A3"], "violin": ["F4", "A4", "C5"]},
     "C": {"bass": ["C2"], "cello": ["C3", "G3"], "viola": ["E4"], "violin": ["G4", "C5", "E5"]},
     "C/E": {"bass": ["E1"], "cello": ["E2", "G2"], "viola": ["C4"], "violin": ["G4", "C5", "E5"]},
     "Csus4": {"bass": ["C2"], "cello": ["C3", "G3"], "viola": ["F4"], "violin": ["G4", "C5", "F5"]},
     "C7": {"bass": ["C2"], "cello": ["C3", "G3"], "viola": ["Bb3"], "violin": ["E4", "Bb4", "E5"]},
     "Gm": {"bass": ["G1"], "cello": ["G2", "D3"], "viola": ["Bb3"], "violin": ["G4", "Bb4", "D5"]},
     "Gm7": {"bass": ["G1"], "cello": ["G2", "D3"], "viola": ["F4"], "violin": ["Bb4", "D5", "F5"]},
     "A": {"bass": ["A1"], "cello": ["A2", "E3"], "viola": ["C#4"], "violin": ["E4", "A4", "C#5"]},
     "D": {"bass": ["D2"], "cello": ["D3", "A3"], "viola": ["F#4"], "violin": ["A4", "D5", "F#5"]},
     "G": {"bass": ["G1"], "cello": ["G2", "D3"], "viola": ["B3"], "violin": ["G4", "B4", "D5"]},
     "Bm": {"bass": ["B1"], "cello": ["B2", "F#3"], "viola": ["D4"], "violin": ["F#4", "B4", "D5"]}}
CH = {"Dm": ["D", "F", "A"], "Bb": ["Bb", "D", "F"], "F": ["F", "A", "C"], "C": ["C", "E", "G"]}


def strings(ch, at, dur, vel=.8, soft=.4, att=.25, rel=.6, only=None, bus="orch", gain=1.0):
    for sec, notes in V[ch].items():
        if only and sec not in only:
            continue
        for n in notes:
            put(section(sec, n, dur, n=2 if sec == "bass" else 3, vel=vel, soft=soft, att=att, rel=rel), at, SEC[sec][1] * gain, SEC[sec][0], bus)


def brass(sec, notes, at, dur, vel=.8, soft=.15, att=.05, rel=.45, bus="orch", gain=1.0):
    for note in notes:
        put(section(sec, note, dur, n=2, cents=5, vel=vel, soft=soft, att=att, rel=rel), at, SEC[sec][1] * gain, SEC[sec][0], bus)


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
    if rev:   # reversed: swells into `at`
        x = x[:, ::-1].copy()
        at -= x.shape[1] / SR
    put(x, at, gain, pan, bus)


def rev_chord(notes, end, vel=.5, gain=1.0, length=2.0, bus="orch"):
    """a reversed piano chord that swells into `end`"""
    ys = [play("piano_mf", n, 0, vel=vel, natural=True)[:, :int(length * SR)] for n in notes]
    L = max(y.shape[1] for y in ys)
    y = sum(np.pad(v, ((0, 0), (0, L - v.shape[1]))) for v in ys)[:, ::-1].copy()
    put(y, end - L / SR, gain, 0, bus)


def up(n, k):
    return n[:-1] + str(int(n[-1]) + k)


MOTIF = {"maj": [("C5", .5), ("F5", .5), ("E5", 1), ("C5", .5), ("A4", 1.5)],
         "min": [("A4", .5), ("D5", .5), ("C#5", 1), ("A4", .5), ("F4", 1.5)],
         "D": [("A4", .5), ("D5", .5), ("C#5", 1), ("A4", .5), ("F#4", 1.5)],
         "G": [("D5", .5), ("G5", .5), ("F#5", 1), ("D5", .5), ("B4", 1.5)]}


def motif(kind, start, beat, fn, octave=0):
    t = start
    for n, b in MOTIF[kind]:
        fn(up(n, octave), t, b * beat)
        t += b * beat


def amb(y, at, dur, lo, hi, gain=1.0, pan=0.0, bus="sfx", fade=.025):
    """an ambience snapped to a cut: band-limited, hard-edged with tiny fades"""
    y = band(y[:int(dur * SR)], lo, hi)
    put(y * env_in_out(len(y), fade, fade), at, gain, pan, bus)


# the cuts of js/main.js
CUT = dict(rew=10.4, play=12.2, fence=15.8, maine=19.4, count=31.0, zoo=35.14, club=39.29, brk=43.43, stoke=45.5,
           stop=56.375, seats=57.2, ladder=60.8, wem=64.4, sky=74.4, troph=78.4, shoe=84.4, lamp=87.15, verd=87.4,
           anf=95.85, fans=104.6, m87=109.6, m98=110.85, m99=112.1, m23=113.35, home=114.6, card=117.725)

# ======================= 0 – 10.4  Anfield, 2026 (beat .6) ======================
put(crowd(10.8, .9) * adsr(int(10.8 * SR), 1.0, .5, .9, 1.2), 0, 1, 0, "sfx")
put(choir(hz("D3"), 10.6, "oo", 14, 1.5, 1.5) + choir(hz("A3"), 10.6, "oo", 14, 1.5, 1.5), 0, .45, -.2, "choir")
for i in range(34):
    n = ["D2", "D2", "D3", "D2", "D2", "D3", "C3", "D3"][i % 8]
    solo("cello", n, .2 + i * .3, .24, vel=.5 + .4 * i / 34, pan=.3, att=.01, rel=.08)
    if i % 2 == 0:
        put(pulse(hz("D2"), .28, .6 + .3 * i / 34), .2 + i * .3, .9, 0, "orch")
put(timpani(hz("D2"), 2.5, .8), .2, 1, 0, "perc")
put(boom(3, 55, 30, .5), .2, 1, 0, "sfx")
brass("horn", ["D3", "F3", "A3"], 4.4, 2.9, vel=.75, soft=.3, att=.8, rel=1.0)
brass("trombone", ["D2", "A2"], 4.4, 2.9, vel=.6, soft=.35, att=.8, rel=1.0)
motif("min", 7.4, .6, lambda n, t, d: piano(up(n, 1), t, .62, pan=-.1))
put(riser(1.2, 300, 8000, .7), 9.2, 1, 0, "sfx")

# ======================= 10.4 – 12.2  the rewind (built in the mixdown) ======================
put(tape_clunk(), CUT["rew"], .9, 0, "post")                            # REW
put(rewind(1.72) * .8, 10.45, 1, 0, "post")
put(tape_clunk(), CUT["play"] - .02, 1, 0, "post")                      # PLAY

# ======================= 12.2 – 19.4  Manchester, 1987 (beat 1.2) ======================
put(hiss(45.0, 1.0), 12.2, 1, 0, "sfx")                                 # the tape era: until the tape stops at 57.2
put(rain(7.8, 1.0) * adsr(int(7.8 * SR), .25, .2, 1, 1.4), 12.2, 1, 0, "sfx")
put(band(noise(7.2), 30, 150) * .05, 12.2, 1, 0, "sfx")
piano("D2", 12.2, .5)
piano("D3", 12.2, .4)
for i, n in enumerate(("F3", "A3")):
    piano(n, 12.8 + i * .05, .34)
motif("min", 13.4, 1.2, lambda n, t, d: piano(n, t, .55))               # 13.4 … 18.2: lonely, one note per beat
put(section("cello", "D2", 3.7, n=2, vel=.45, soft=.7, att=.9, rel=.5), 12.2, .95, .3)
# 15.8: the camcorder cut to the fences — darker: Bb under the piano's A (a major seventh)
put(glitch(.18), CUT["fence"] - .05, .9, 0, "sfx")
put(timpani(hz("Bb1"), 1.8, .45), CUT["fence"], 1, 0, "perc")
brass("trombone", ["Bb1", "F2"], 15.8, 2.5, vel=.5, soft=.5, att=.9, rel=.6)
brass("horn", ["Bb2", "D3", "F3"], 15.8, 2.5, vel=.45, soft=.5, att=.9, rel=.6)
put(section("cello", "Bb1", 2.5, n=2, vel=.45, soft=.7, att=.4, rel=.5), 15.8, .9, .3)
put(whistle(.55, 3100, .6), 17.0, .7, .5, "sfx")
put(whistle(.3, 3100, .5), 17.62, .6, .5, "sfx")
# 18.2: C7, the dominant of F — something silly is about to walk in
brass("horn", ["C3", "E3", "Bb3"], 18.2, 1.15, vel=.42, soft=.5, att=.4, rel=.25)
put(section("cello", "C2", 1.15, n=2, vel=.45, soft=.6, att=.2, rel=.2), 18.2, .9, .3)
B1 = .58                                                                 # Maine Road: 103 bpm, 20 beats to the groove
for i, n in enumerate(("C3", "E3")):                                     # bassoon pickup before the cut
    solo("bassoon", n, CUT["maine"] - (2 - i) * B1 / 2, .2, vel=.75, pan=-.15, att=.01, rel=.08)

# ======================= 19.4 – 31.0  Maine Road (beat .58) ======================
put(glitch(.16), CUT["maine"] - .05, .7, 0, "sfx")
walk = ["F3", "A3", "C4", "A3", "Bb3", "G3", "E3", "C3", "F3", "A3", "C4", "F4"]
for i, n in enumerate(walk):
    solo("bassoon", n, 19.4 + i * B1 / 2, .2, vel=.8, pan=-.15, att=.01, rel=.08)
for k in range(7):
    ring("bass_pizz", ["F2", "C2"][k % 2], 19.4 + k * B1, .85, .4)
    for n in ("F4", "A4", "C5"):
        ring("violin_pizz", n, 19.4 + k * B1 + B1 / 2, .45, -.3)
put(crowd(11.6, .5), 19.4, 1, 0, "sfx")
for i, n in enumerate(("C6", "E6", "G6", "C7")):                         # beat 7: the banana goes up
    ring("glock", n, 19.4 + 7 * B1 + i * .07, .5, .2)
ring("crotale", "C7", 19.4 + 8 * B1, .4, .25)
put(crowd(4.0, .85) * adsr(int(4 * SR), .2, .4, .65, 1.2), 19.4 + 8 * B1 - .1, 1, 0, "sfx")   # and everybody laughs
for i, n in enumerate(("C6", "A5", "F5", "C5")):
    solo("clarinet", n, 19.4 + 8.5 * B1 + i * B1 / 4, .12, vel=.75, pan=.2, att=.005, rel=.06)
for i in range(2):
    solo("bassoon", "F2", 19.4 + (10 + i * .5) * B1, .18, vel=.8, pan=-.15, att=.005, rel=.06)
T12 = 19.4 + 12 * B1                                                     # beat 12: "Imre Banana"
put(claps(31.0 - T12, 60 / B1, .9), T12, 1, 0, "sfx")
for i in range(8):
    put(choir(hz(["F4", "A4"][i % 2]), 1.2, "ah", 14, .05, .25), T12 + i * B1, .55, 0, "choir")
for k in range(16):
    put(snare(.35 + .04 * k), T12 + k * B1 / 2, 1, 0, "perc")
for i in range(8):
    ring("bass_pizz", ["F2", "C2", "D2", "C2"][i % 4], T12 + i * B1, .9, .4)
motif("maj", 19.4 + 13 * B1, B1, lambda n, t, d: (solo("bassoon", up(n, -1), t, d * .9, vel=.8, pan=-.1, att=.01, rel=.1), solo("clarinet", n, t, d * .9, vel=.7, pan=.1, att=.01, rel=.1)))
motif("maj", 19.4 + 17 * B1, B1, lambda n, t, d: (solo("clarinet", n, t, d * .9, vel=.85, pan=.1, att=.01, rel=.1), solo("trumpet", n, t, d * (1.25 if n == "A4" else .9), vel=.6, att=.02, rel=.2)))
# the whip pan onto the groove: a snare pickup in the new tempo, air rushing right to left
B = 2.0714 / 4                                                           # the groove: 115.9 bpm, bar lines from 31.0
S16 = B / 4
for k in range(4):
    put(snare(.45 + .15 * k), CUT["count"] - (4 - k) * S16, 1, 0, "perc")
put(sweep_pan(whoosh(.42, 300, 6000, 1.0, .55), .7, -.7), CUT["count"] - .42 * .55, .9, 0, "sfx")

# ======================= 31 – 56.4  the craze: a Madchester groove ======================
PROG = ["Dm", "Bb", "F", "C"]
for bar in range(13):
    t0 = 31.0 + bar * 4 * B
    ch = PROG[bar % 4]
    root = {"Dm": "D", "Bb": "Bb", "F": "F", "C": "C"}[ch]
    brk = bar == 6                    # the breakdown in the club: drums out
    full = bar >= 2 and not brk
    sad = bar >= 11
    for b in range(4):
        tb = t0 + b * B
        if tb > 56.9:
            break
        if not brk:
            put(kick(1.0 if full else .75), tb, 1.15 if bar >= 7 and not sad else 1, 0, "groove")
            put(hat(.8, True), tb + B / 2, .9, .25, "groove")
            if bar == 1:
                for s in range(4):
                    put(hat(.3 + .1 * (s == 2)), tb + s * S16, 1, .3, "groove")
            if full and not sad:
                if b % 2:
                    put(clap(1.0), tb, 1, -.1, "groove")
                    put(snare(.6), tb, .8, .1, "groove")
                for s in range(4):
                    put(shaker(.7 + .3 * (s == 2)), tb + s * S16, 1, -.35, "groove")
                    put(hat(.45), tb + s * S16, 1, .3, "groove")
                if bar >= 7:
                    put(tamb(.8), tb + B / 2, 1, .4, "groove")
            for nn in CH[ch]:                                            # house piano stabs on the off-beats
                piano(nn + ("5" if nn in ("C", "D") else "4"), tb + B / 2, .42 if not sad else .3, dur=.16, pan=-.2, bus="groove")
        if full and b in (1, 3):
            for nn in CH[ch]:
                put(organ(hz(nn + "4"), .22, .9), tb + B * .75, 1, .2, "groove")
    if bar < 3:                                                          # funky pizz bass + sub until the acid line arrives
        for b in range(4):
            ring("bass_pizz", root + "2", t0 + b * B, .95, .35, bus="groove")
            put(pulse(hz(root + "1"), B * .45, .9, .35), t0 + b * B, .8, 0, "groove")
    else:
        r0 = hz(root + "2")
        pat = [(1, 1, 0), (1, 0, 0), (2, 0, 0), (1, 0, 0), (None, 0, 0), (1, 0, 0), (2, 0, 1), (1.5, 1, 0),
               (1, 0, 0), (None, 0, 0), (2, 1, 0), (1, 0, 0), (1.19, 0, 1), (1, 0, 0), (2, 0, 0), (1.5, 0, 1)]
        notes = [(None if m is None else r0 * m, a, s) for m, a, s in pat]
        if t0 + 4 * B > 56.9:
            notes = notes[:int((56.9 - t0) / S16)]
        lo, hi = (180, 900) if brk else (240, 3400) if bar in (4, 5) else (220, 1500) if sad else (260, 2200)
        put(acid(notes, S16, (lo, hi), .9 if brk else .86, .9), t0, .55 if brk else 1.15 if bar >= 7 else 1, 0, "groove")
hit("crash_viennese", CUT["count"], .55, 0, bus="groove")                # the whip lands
# 35.14: whip to the inflatable zoo
put(sweep_pan(whoosh(.42, 300, 6000, 1.0, .55), .7, -.7), CUT["zoo"] - .42 * .55, .9, 0, "sfx")
hit("crash_viennese", CUT["zoo"], .6, 0, bus="groove")
motif("maj", CUT["zoo"], B, lambda n, t, d: solo("flute", up(n, 1), t, d * .95, vel=.75, pan=.15, bus="groove", att=.02, rel=.15))
motif("maj", 37.21, B, lambda n, t, d: solo("flute", up(n, 1), t, d * .95, vel=.8, pan=.15, bus="groove", att=.02, rel=.15))
# 39.29: dive into the banana (the groove closes into a low-pass, see mixdown), come out in the club
hit("crash_viennese", CUT["club"], .55, 0, bus="sfx", rev=True, length=1.3)
put(boom(1.6, 70, 34, .8), CUT["club"], 1, 0, "groove")
hit("crash_heavy", CUT["club"], .45, 0, bus="groove")
motif("maj", 41.36, B, lambda n, t, d: put(organ(hz(n), d * .9, 1.1), t, 1, 0, "groove"))
# 43.43: the breakdown — a city in decline, finding its joy
put(pad([hz(nn + "3") for nn in CH["Dm"]], 1.15, .9, .3, .4), CUT["brk"], 1, 0, "groove")
put(pad([hz(nn + "3") for nn in CH["Bb"]], .6, .9, .1, .3), CUT["brk"] + 2 * B, 1, 0, "groove")
put(pad([hz(nn + "3") for nn in CH["C"]], .6, .9, .1, .3), CUT["brk"] + 3 * B, 1, 0, "groove")
motif("min", CUT["brk"] + .1, .45, lambda n, t, d: solo("flute", n, t, d, vel=.55, pan=.1, bus="groove", att=.06, rel=.25))
put(riser(1.4, 300, 9000, .9), CUT["stoke"] - 1.4, 1, 0, "groove")
for i, at in enumerate([44.466 + i * S16 for i in range(4)] + [44.984 + i * S16 / 2 for i in range(8)]):   # = CLUB_BUILD in scenesB.js
    put(snare(.25 + .06 * i), at, 1, 0, "groove")
# 45.5: Stoke — the party
hit("crash_viennese", CUT["stoke"], .8, 0, bus="groove")
put(crowd(11.0, 1.1) * adsr(int(11 * SR), .05, .5, .8, 1.5), CUT["stoke"], 1, 0, "groove")
for at in (46.1, 47.4, 48.9, 51.0, 52.2):
    put(whistle(.5 + rng.random() * .3, 2600 + rng.random() * 800, .8), at, .7, (rng.random() - .5) * 1.4, "groove")
for bar_t in (CUT["stoke"], 49.64):
    motif("maj", bar_t, B, lambda n, t, d: (solo("trumpet", n, t, d * .95, vel=.95, bus="groove", att=.02, rel=.15), solo("trumpet", up(n, -1), t, d * .95, vel=.6, pan=.15, bus="groove", att=.02, rel=.15)))
brass("horn", ["F3", "A3", "C4"], 49.64, .4, vel=.9, att=.01, rel=.2, bus="groove")
hit("crash_heavy", 49.64, .6, 0, bus="groove")
put(crowd(3.5, 1.2) * adsr(int(3.5 * SR), .1, .3, .7, 1.5), 49.64, 1, 0, "groove")
motif("maj", 53.79, B * 1.2, lambda n, t, d: solo("flute", up(n, 1), t, d, vel=.6, pan=.1, bus="groove", att=.05, rel=.3))

# ======================= 57.2 – 64.4  the fall (beat 1.2) ======================
put(rain(7.6, .9) * adsr(int(7.6 * SR), .45, .2, 1, 1.0), CUT["seats"] + .05, 1, 0, "sfx")
for at, ch in ((57.2, "Dm"), (58.4, "C"), (59.6, "Bb"), (60.8, "A"), (62.0, "Gm"), (63.2, "A")):
    strings(ch, at, 1.2, vel=.5, soft=.55, att=.35, rel=.4)
motif("min", 57.8, .6, lambda n, t, d: piano(n, t, .5))
# 60.8: the picture tilts down — everything drops with it
t_ = tt(.7)
fall = np.sin(2 * np.pi * np.cumsum(90 * np.exp(-t_ * 2.2) + 30) / SR) * np.exp(-t_ * 3) * .5 + band(noise(.7), 150, 2500) * np.exp(-((t_ - .3) / .18) ** 2) * .25
put(fall, CUT["ladder"] - .3, .9, 0, "sfx")
for at in (62.0, 63.2):                                                   # the CITY disc lands, twice
    put(timpani(hz("D2"), 1.6, 1.0), at, 1, 0, "perc")
    put(boom(2, 50, 30, .55), at, 1, 0, "sfx")

# ======================= 64.4 – 74.4  Wembley, 1999 (beat .5) ======================
put(crowd(10.4, .7) * adsr(int(10.4 * SR), .5, .3, 1, .4), CUT["wem"] - .5, 1, 0, "sfx")   # pre-lap under the wipe
put(sweep_pan(whoosh(.5, 700, 9000, .9, .6), -.6, .6), CUT["wem"] - .3, .8, 0, "sfx")          # the TV sting
ring("crotale", "E7", CUT["wem"], .35, .3)
for k in range(5):
    put(tick(.9), 64.4 + k, 1, -.3, "sfx")
for i in range(40):
    t = 64.4 + i * .125
    solo("viola", ["A3", "A3", "E4", "A3"][i % 4], t, .1, vel=.45 + .45 * i / 40, pan=.1, att=.005, rel=.04)
    if i % 4 == 0:
        solo("cello", "A2", t, .2, vel=.5 + .4 * i / 40, pan=.3, att=.005, rel=.06)
put(crowd(1.4, .8) * adsr(int(1.4 * SR), .05, .3, .5, .8), 66.4, 1, 0, "sfx")                  # Horlock, 2-1
brass("horn", ["A3", "C#4", "E4"], 66.4, .35, vel=.85, att=.01, rel=.2)
for k in range(16):
    put(timpani(hz("A1"), .5, .2 + .05 * k), 68.4 + k * .0625, 1, 0, "perc")
strings("D", 69.4, 2.0, vel=1.0, soft=0, att=.02, rel=.8)                                       # Dickov, 2-2
brass("horn", ["D3", "F#3", "A3", "D4"], 69.4, 1.8, vel=1.0, rel=.8)
brass("trombone", ["D2", "A2"], 69.4, 1.8, vel=.95, rel=.8)
hit("crash_viennese", 69.4, .85)
hit("tamtam40", 69.4, .45)
put(timpani(hz("D2"), 2.2, 1.0), 69.4, 1, 0, "perc")
put(crowd(4.2, 1.5) * adsr(int(4.2 * SR), .05, .5, .7, 2.0), 69.4, 1, 0, "sfx")
for k in range(2):                                                                               # penalties
    put(heartbeat(.7), 71.4 + k * .5, 1, 0, "sfx")
solo("violin", "A5", 71.4, .9, vel=.4, pan=-.3, soft=.3, att=.2, rel=.2)
put(riser(.35, 800, 9000, .8)[::-1].copy(), 72.05, 1, 0, "sfx")
put(crowd(2.8, 1.4) * adsr(int(2.8 * SR), .05, .4, .7, 1.4), 72.4, 1, 0, "sfx")                 # the save
hit("crash_heavy", 72.4, .6)
motif("D", 72.4, .5, lambda n, t, d: (solo("trumpet", n, t, d * .95, vel=1.0, att=.02, rel=.15), solo("horn", up(n, -1), t, d * .95, vel=.7, pan=-.2, att=.02, rel=.15)))
strings("D", 72.4, 1.9, vel=.85, soft=.1, att=.05, rel=1.0)
for at in (72.95, 73.3, 73.6, 73.8, 74.0, 74.15, 74.27):                                         # photographers
    put(shutter(.8), at, 1, (rng.random() - .5) * 1.2, "sfx")

# ======================= 74.4 – 84.4  the money era (beat .5) ======================
hit("cym_stick", CUT["sky"], .35)                                                                # the flash
for i in range(32):
    solo("violin", ["D5", "F#5", "A5", "F#5"][i % 4], 74.4 + i * .125, .1, vel=.5 + .2 * (i % 4 == 0), pan=-.3, att=.005, rel=.05)
strings("D", 74.4, 2.0, vel=.6, soft=.3, att=.2, rel=.3, only=("bass", "cello", "viola"))
strings("Bm", 76.4, 2.0, vel=.6, soft=.3, att=.2, rel=.4, only=("bass", "cello", "viola"))
motif("D", 76.4, .5, lambda n, t, d: brass("horn", [n, up(n, -1)], t, d * .95, vel=.85, att=.02, rel=.15))
put(timpani(hz("D2"), 2, .8), CUT["sky"], 1, 0, "perc")
for i, n in enumerate(("A5", "B5", "C#6", "D6", "E6", "F#6", "G#6", "A6")):                      # the gold sweep
    ring("glock", n, 78.0 + i * .05, .3 + .05 * i, -.4 + .1 * i)
hit("crash_viennese", CUT["troph"], .4, 0, rev=True, length=1.0)
for at, ch in ((78.4, "D"), (79.9, "Bm"), (81.4, "G"), (82.9, "A")):
    strings(ch, at, 1.55, vel=.85 if at in (78.4, 81.4) else .65, soft=.1, att=.03, rel=.35 if at < 82 else 1.3)
    brass("horn", [V[ch]["cello"][0], V[ch]["viola"][0]], at, 1.5, vel=.75, att=.03, rel=.3 if at < 82 else 1.0)
for at in (78.4, 81.4):
    hit("crash_viennese", at, .5)
    put(timpani(hz("D2"), 2, 1.0), at, 1, 0, "perc")
    put(choir(hz("D4"), 1.4, "ah", 10, .05, .8) + choir(hz("A4"), 1.4, "ah", 10, .05, .8), at, .5, 0, "choir")
for at, n in ((78.7, "A6"), (79.3, "A6"), (79.9, "A6"), (81.4, "D7"), (81.65, "D7"), (81.9, "D7")):   # trophies appear
    ring("crotale", n, at, .45, (rng.random() - .5) * .8)
motif("G", 81.4, .5, lambda n, t, d: solo("trumpet", n, t, d * .95, vel=.9, att=.02, rel=.15))

# ======================= 84.4 – 87.4  the shoebox ======================
put(pad([hz("F3"), hz("A3"), hz("C4")], CUT["lamp"] - 84.0, .8, 1.0, .03), 84.0, 1, 0, "orch")  # fades in under the dissolve
put(hiss(2.75, .45), CUT["shoe"], 1, 0, "sfx")
for at, n in ((84.75, "C6"), (85.1, "F6"), (85.525, "E6"), (86.525, "C6")):                     # a music box winding down…
    ring("glock", n, at, .45, .1)
put(click(1.0), CUT["lamp"], 1, .3, "post")                                                       # …and the lamp goes off before its last note

# ======================= 87.4 – 95.85  the verdict ======================
put(section("cello", "D2", 8.45, n=2, vel=.5, soft=.6, att=.6, rel=.6), CUT["verd"], .95, .3)
put(pulse(hz("D1"), 8.45, .35, .2) * adsr(int(8.45 * SR), 1.0, .2, 1, 1.0), CUT["verd"], 1, 0, "orch")
ticks = [88.35 + 1.25 * k for k in range(6)] + [95.225]                                          # a slow clock that locks into Anfield's tempo
for i, at in enumerate(ticks):
    put(tick(.8 + .15 * (at > 94)), at, 1, (-.3 if i % 2 else .3), "sfx")
for sec, n in (("violin", "Eb5"), ("violin", "D5"), ("viola", "G#4"), ("violin", "A4")):
    put(section(sec, n, 3.6, vel=.4, soft=.4, att=2.0, rel=1.4), 88.2, SEC[sec][1], SEC[sec][0])
put(rustle(8.4, 1.0), CUT["verd"], 1, 0, "sfx")
for n in ("A1", "D2"):
    piano(n, 91.8, .8)
hit("tamtam_bow", 91.85, .3)
put(crowd(1.0, .8) * np.linspace(0, 1, int(1.0 * SR)) ** 2, CUT["anf"] - 1.0, 1, 0, "sfx")
hit("crash_viennese", CUT["anf"], .5, 0, rev=True, length=1.2)

# ======================= 95.85 – 104.6  Anfield again (beat .625) ======================
put(crowd(8.9, .9) * env_in_out(int(8.9 * SR), .02, .35), CUT["anf"], 1, 0, "sfx")
put(choir(hz("D3"), 8.5, "oo", 14, 1.0, .8) + choir(hz("F3"), 8.5, "oo", 14, 1.0, .8), CUT["anf"], .5, -.2, "choir")
put(boos(4.0, 1.0), 100.35, 1, .35, "sfx")
for i in range(28):
    t = CUT["anf"] + i * .3125
    solo("cello", ["D2", "D2", "D3", "D2"][i % 4], t, .24, vel=.6 + .3 * i / 28, pan=.3, att=.01, rel=.08)
    if i % 2 == 0:
        put(kick(.8 + .2 * (i % 4 == 0)), t, .9, 0, "perc")
for at, ch in ((95.85, "Dm"), (98.35, "Bb"), (100.85, "Gm"), (103.35, "A")):
    brass("horn", V[ch]["cello"] + V[ch]["viola"], at, 2.3 if at < 103 else 1.2, vel=.6, soft=.3, att=.4, rel=.3 if at < 103 else .1)
motif("min", 97.1, .625, lambda n, t, d: (solo("trumpet", n, t, d * .95, vel=.9, att=.02, rel=.15), solo("horn", up(n, -1), t, d * .95, vel=.6, pan=-.2, att=.02, rel=.15)))
rev_chord(["F3", "A3", "C4", "F4"], CUT["fans"], vel=.55, gain=.9)                                 # sucked into the reverse angle

# ======================= 104.6 – 109.6  two fans (beat .625, F major) ======================
put(band(crowd(5.2, .9), 150, 900) * env_in_out(int(5.2 * SR), .3, .6), CUT["fans"], .55, 0, "sfx")   # the stadium, far away
for n in ("F2", "C3"):
    piano(n, CUT["fans"], .45)
for i, n in enumerate(("A3", "C4", "F4")):
    piano(n, CUT["fans"] + .03 * i, .36)
for at, ch, d in ((104.6, "F", 1.25), (105.85, "C/E", 1.25), (107.1, "Dm", 1.25), (108.35, "Bb", .625), (108.975, "C", .625)):
    strings(ch, at, d, vel=.42, soft=.6, att=.25, rel=.3, only=("bass", "cello", "viola"))
motif("maj", 105.225, .625, lambda n, t, d: piano(n, t, .55, pan=0))
solo("cello", "C4", 107.725, .6, vel=.5, pan=.3, soft=.3, att=.08, rel=.2)
solo("cello", "D4", 108.35, .6, vel=.55, pan=.3, soft=.3, att=.08, rel=.2)
solo("cello", "E4", 108.975, .6, vel=.6, pan=.3, soft=.3, att=.08, rel=.2)

# ======================= 109.6 – 114.6  the same fan, 1987 → 2023 ======================
# vi – IV – ii7 – V: the deceptive cadence drops into the lows, then climbs; a rising line on top
MONT = ((CUT["m87"], "Dm", "A4"), (CUT["m98"], "Bb", "D5"), (CUT["m99"], "Gm7", "F5"), (CUT["m23"], "Csus4", "F5"))
for k, (at, ch, top) in enumerate(MONT):
    strings(ch, at, 1.25 if k < 3 else .625, vel=.55 + .12 * k, soft=.35 - .08 * k, att=.06, rel=.25)
    solo("violin", top, at, 1.2 if k < 3 else .6, vel=.6 + .1 * k, pan=-.3, soft=.1, att=.04, rel=.2)
    solo("violin", up(top, 1), at, 1.2 if k < 3 else .6, vel=.45 + .1 * k, pan=-.4, soft=.1, att=.04, rel=.2)
    put(timpani(hz({"Dm": "D2", "Bb": "Bb1", "Gm7": "G1", "Csus4": "C2"}[ch]), 1.4, .55 + .15 * k), at, 1, 0, "perc")
strings("C", 113.975, .625, vel=.95, soft=0, att=.04, rel=.2)
solo("violin", "E5", 113.975, .6, vel=.9, pan=-.3, att=.03, rel=.2)
solo("violin", "E6", 113.975, .6, vel=.75, pan=-.4, att=.03, rel=.2)
for i in range(16):                                                       # viola eighths, growing
    t = CUT["m87"] + i * .3125
    root = "D3" if i < 12 else "C3"
    solo("viola", [root, up(root, 1)][i % 2], t, .2, vel=.45 + .4 * i / 16, pan=.1, att=.005, rel=.05)
brass("horn", ["Bb3", "D4", "F4"], CUT["m99"], 1.2, vel=.7, soft=.2, att=.15, rel=.2)
brass("horn", ["C4", "F4", "G4"], CUT["m23"], .6, vel=.85, soft=.1, att=.05, rel=.1)
brass("horn", ["C4", "E4", "G4"], 113.975, .6, vel=.95, att=.03, rel=.15)
put(choir(hz("D4"), 1.25, "ah", 12, .05, .3) + choir(hz("F4"), 1.25, "ah", 12, .05, .3), CUT["m99"], .45, 0, "choir")
put(choir(hz("C4"), 1.25, "ah", 12, .05, .3) + choir(hz("G4"), 1.25, "ah", 12, .05, .3), CUT["m23"], .55, 0, "choir")
for k in range(20):                                                       # timpani roll into the arrival
    put(timpani(hz("C2"), .5, .15 + .04 * k), CUT["m23"] + k * .0625, 1, 0, "perc")
hit("crash_viennese", CUT["home"], .6, 0, rev=True, length=1.25)
# each era sounds for exactly as long as it is on screen
amb(hiss(1.25, 1.6) + rain(1.25, .9) + crowd(1.25, .45), CUT["m87"], 1.25, 300, 6000, .9)
amb(rain(1.25, 1.5) + crowd(1.25, .4) + hiss(1.25, .5), CUT["m98"], 1.25, 400, 7000, .9)
amb(crowd(1.25, 1.5), CUT["m99"], 1.25, 200, 6000, 1.0)
amb(crowd(1.25, 1.6) + crackle(1.25, .8), CUT["m23"], 1.25, 120, 12000, 1.0)
for at in (113.42, 113.85, 114.2):                                        # the fireworks on screen
    put(pop(.8), at, 1, (rng.random() - .5), "sfx")
    put(crackle(.9, .6), at + .25, 1, (rng.random() - .5), "sfx")

# ======================= 114.6 – 122  the whole away end: the motif resolves ======================
H2 = 1.25                                                                 # maestoso: half the tempo of the montage
put(crowd(7.4, 1.2) * env_in_out(int(7.4 * SR), .05, 3.0), CUT["home"], 1, 0, "sfx")
for at, ch, d in ((114.6, "F", .625), (115.225, "Bb", .625), (115.85, "C", 1.25), (117.1, "C7", .625)):
    strings(ch, at, d, vel=.9, soft=.05, att=.04, rel=.25)
    brass("horn", V[ch]["cello"][:1] + V[ch]["viola"], at, d, vel=.8, att=.04, rel=.2)
    brass("trombone", V[ch]["bass"] + V[ch]["cello"][:1], at, d, vel=.7, att=.04, rel=.2)
put(timpani(hz("F2"), 2.2, 1.0), CUT["home"], 1, 0, "perc")
hit("crash_viennese", CUT["home"], .65)
put(choir(hz("F3"), 3.2, "ah", 16, .05, .6) + choir(hz("A3"), 3.2, "ah", 16, .05, .6) + choir(hz("C4"), 3.2, "ah", 16, .05, .6), CUT["home"], .55, 0, "choir")


def maestoso(n, t, d):
    last = n == "A4"
    dd, rr = (3.2, 1.4) if last else (d * .97, .3)
    solo("trumpet", n, t, dd, vel=.85, att=.03, rel=rr)
    solo("violin", up(n, 1), t, dd, vel=.8, pan=-.35, att=.03, rel=rr)
    solo("horn", up(n, -1), t, dd, vel=.7, pan=-.2, att=.03, rel=rr)


motif("maj", CUT["home"], H2, maestoso)
# 117.725: the note the music box never played, on F major — with everyone
strings("F", CUT["card"], 3.3, vel=.85, soft=.15, att=.06, rel=1.4)
brass("horn", ["F3", "A3", "C4"], CUT["card"], 3.0, vel=.7, att=.06, rel=1.4)
brass("trombone", ["F2", "C3"], CUT["card"], 3.0, vel=.6, att=.06, rel=1.4)
put(choir(hz("F3"), 4.2, "ah", 16, .1, 1.8) + choir(hz("A3"), 4.2, "ah", 16, .1, 1.8) + choir(hz("C4"), 4.2, "ah", 16, .1, 1.8), CUT["card"], .55, 0, "choir")
for n in ("F2", "C3", "F3", "A3", "C4"):
    piano(n, CUT["card"], .5, pan=0)
ring("glock", "A5", CUT["card"] + .02, .5, .1)
ring("crotale", "A6", CUT["card"] + .3, .3, .25)
put(timpani(hz("F2"), 2.4, .7), CUT["card"], 1, 0, "perc")
for k in range(36):                                                       # a soft timpani roll holds the last chord, dying away
    put(timpani(hz("F2"), .5, .16 * (1 - k / 36) ** 1.5), CUT["card"] + 1.2 + k * .07, 1, 0, "perc")


# ======================= mix & master ======================
def stft_lowpass(x, a, b, fc_of, nfft=2048, hop=512):
    """time-varying low-pass on x[:, a:b] (seconds), in place; fc_of(t) must be wide open at both ends"""
    i0, i1 = int(a * SR), int(b * SR)
    seg = x[:, i0 - nfft:i1 + nfft].copy()
    win = np.hanning(nfft)
    f = np.fft.rfftfreq(nfft, 1 / SR)
    out, norm = np.zeros_like(seg), np.zeros(seg.shape[1])
    for s in range(0, seg.shape[1] - nfft, hop):
        H = 1 / (1 + (f / fc_of((i0 - nfft + s + nfft / 2) / SR)) ** 4)
        for c in range(2):
            out[c, s:s + nfft] += np.fft.irfft(np.fft.rfft(seg[c, s:s + nfft] * win) * H, nfft) * win
        norm[s:s + nfft] += win ** 2
    out /= np.maximum(norm, 1e-6)
    x[:, i0:i1] = out[:, nfft:nfft + i1 - i0]


# 38.79 – 39.29: the zoom dives into the banana — the groove closes to a thud, then the club opens at full width
stft_lowpass(BUS["groove"], 38.6, 39.45, lambda t: 20000.0 if t >= CUT["club"] - .01 else 16000 * (300 / 16000) ** (np.clip((t - 38.79) / .49, 0, 1) ** 2))
# 56.375 – 57.2: the tape stops — the whole 1988 groove winds down to nothing
i0, i1 = int(CUT["stop"] * SR), int(CUT["seats"] * SR)
n = i1 - i0
pos = np.cumsum((1 - np.linspace(0, 1, n)) ** 2)
for name in ("groove", "sfx"):
    b = BUS[name]
    seg = b[:, i0:i0 + int(pos[-1]) + 2].copy()
    b[:, i0:i1] = np.stack([np.interp(pos, np.arange(seg.shape[1]), ch) for ch in seg]) * np.linspace(1, 0, n) ** .5
BUS["groove"][:, i1:] = 0
BUS["choir"] *= 5.0
hall, room = (reverb_ir(2.6, 1), reverb_ir(2.6, 2)), (reverb_ir(1.2, 5, 8), reverb_ir(1.2, 6, 8))
SENDS = {"orch": (.8, .34, hall), "groove": (.85, .16, room), "choir": (.6, .55, hall), "perc": (.85, .28, hall), "sfx": (.9, .15, hall)}
mix = np.zeros((2, N))
for name, (dry, wet, ir) in SENDS.items():
    b = BUS[name]
    mix += b * dry + np.stack([convolve(b[0], ir[0]), convolve(b[1], ir[1])]) * wet
# 10.4 – 12.2: the score rewinds with the picture (same curve as rewSrc() in scenesA.js), thin and fluttering
i0, i1 = int(CUT["rew"] * SR), int(CUT["play"] * SR)
lt = np.arange(i1 - i0) / SR
src = CUT["rew"] * (1 - np.clip(lt / 1.35, 0, 1) ** 1.7) * SR
rew = np.stack([np.interp(src, np.arange(i0), ch[:i0]) for ch in mix])
rew = np.stack([band(ch, 250, 6500) for ch in rew]) * (.6 + .2 * np.sin(2 * np.pi * 23 * lt)) * np.clip(1 - (lt - 1.2) / .2, 0, 1)
mix[:, i0:i1] = rew * .75
# 12.2: PLAY — the tape lurches up to speed (a wow that ends exactly in sync)
T = .45
tau = np.arange(int(T * SR)) / SR
p = (tau - .4 * tau * (1 - tau / T) ** 2) * SR
i0 = int(CUT["play"] * SR)
seg = mix[:, i0:i0 + len(tau) + 8].copy()
mix[:, i0:i0 + len(tau)] = np.stack([np.interp(p, np.arange(seg.shape[1]), ch) for ch in seg])
# 87.15: the lamp clicks off and takes the room with it
g = np.ones(N)
for a, b, v0, v1 in ((CUT["lamp"], CUT["lamp"] + .025, 1, .03), (CUT["lamp"] + .025, CUT["verd"] - .02, .03, .03), (CUT["verd"] - .02, CUT["verd"] + .02, .03, 1)):
    g[int(a * SR):int(b * SR)] = np.linspace(v0, v1, int(b * SR) - int(a * SR))
mix *= g
mix += POST
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
fade[-int(1.4 * SR):] = np.cos(np.linspace(0, np.pi / 2, int(1.4 * SR)))
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

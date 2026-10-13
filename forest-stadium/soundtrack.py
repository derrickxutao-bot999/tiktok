"""Orchestral score + sound design for 森林里的球场 (59 s), cued to js/main.js -> out/soundtrack.wav

Instruments are real recordings (University of Iowa MIS, unrestricted use; fetch with
`python3 audio/fetch_samples.py`): string sections built from solo recordings, horns, trombones,
trumpet, piano, glockenspiel, vibraphone, crotales, cymbals, tam-tams. The choir, sub-booms,
timpani and sound effects are synthesised (audio/synth.py).
Theme: "Stille Nacht" (Gruber, 1818, public domain), the carol Union fans sing every 23 December.
"""
import os
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio"))
from sampler import fx, midi, play, section  # noqa: E402
from synth import (SR, adsr, band, bell, boom, choir, clink, convolve, crowd, heartbeat, hum, hz, noise,  # noqa: E402
                   plip, reverb_ir, riser, rng, scrape, spark, timpani, tt, wind)

DUR = 59.0
N = int(DUR * SR)
BUS = {k: np.zeros((2, N)) for k in ("orch", "choir", "perc", "sfx")}


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
V = {"C": {"bass": ["C2"], "cello": ["C3", "G3"], "viola": ["E4"], "violin": ["G4", "C5", "E5"]},
     "Am": {"bass": ["A1"], "cello": ["A2", "E3"], "viola": ["C4"], "violin": ["E4", "A4", "C5"]},
     "F": {"bass": ["F1"], "cello": ["F2", "C3"], "viola": ["A3"], "violin": ["F4", "A4", "C5"]},
     "G": {"bass": ["G1"], "cello": ["G2", "D3"], "viola": ["B3"], "violin": ["G4", "B4", "D5"]},
     "G7": {"bass": ["G1"], "cello": ["G2", "D3"], "viola": ["F4"], "violin": ["B4", "D5", "G5"]},
     "Dm": {"bass": ["D2"], "cello": ["D3", "A3"], "viola": ["F4"], "violin": ["A4", "D5", "F5"]},
     "Bb": {"bass": ["Bb1"], "cello": ["Bb2", "F3"], "viola": ["D4"], "violin": ["F4", "Bb4", "D5"]},
     "E": {"bass": ["E2"], "cello": ["E3", "B3"], "viola": ["G#4"], "violin": ["B4", "E5", "G#5"]}}


def strings(ch, at, dur, vel=.8, soft=.4, att=.25, rel=.6, only=None, extra=()):
    for sec, notes in list(V[ch].items()) + list(extra):
        if only and sec not in only:
            continue
        for n in notes:
            put(section(sec, n, dur, n=2 if sec == "bass" else 3, vel=vel, soft=soft, att=att, rel=rel), at, SEC[sec][1], SEC[sec][0])


def brass(sec, notes, at, dur, vel=.8, soft=.15, att=.05, rel=.45, n=2):
    for note in notes:
        put(section(sec, note, dur, n=n, cents=5, vel=vel, soft=soft, att=att, rel=rel), at, SEC[sec][1], SEC[sec][0])


def solo(inst, note, at, dur, vel=.8, pan=0.0, gain=1.0, **kw):
    put(play(inst, note, dur, vel=vel, **kw), at, gain, pan)


def piano(note, at, vel=.6, dur=None, pan=.15):
    layer = "piano_pp" if vel < .42 and midi(note) >= 52 else "piano_mf"
    put(play(layer, note, dur or 1.0, vel=vel, natural=dur is None, rel=.35), at, 1.0, pan)


def ring(inst, note, at, vel=.5, pan=0.0, gain=1.0):
    put(play(inst, note, 0, vel=vel, natural=True), at, gain, pan)


def swell(name, end, length, gain=1.0):
    x = fx(name)[:, int(.25 * SR):int((.25 + length) * SR)].copy()
    env = np.linspace(0, 1, x.shape[1]) ** 2.3
    env[-int(.05 * SR):] *= np.linspace(1, 0, int(.05 * SR))
    put(x * env, end - length, gain, 0, "perc")


def hit(name, at, gain=1.0, pan=0.0):
    put(fx(name), at, gain, pan, "perc")


def up(n, k):
    return n[:-1] + str(int(n[-1]) + k)


MEL = {1: [("G4", 3), ("A4", 1), ("G4", 2), ("E4", 6)], 2: [("G4", 3), ("A4", 1), ("G4", 2), ("E4", 6)],
       3: [("D5", 4), ("D5", 2), ("B4", 6)], 4: [("C5", 4), ("C5", 2), ("G4", 6)],
       5: [("A4", 4), ("A4", 2), ("C5", 3), ("B4", 1), ("A4", 2)],
       11: [("C5", 3), ("G4", 1), ("E4", 2), ("G4", 3), ("F4", 1), ("D4", 2)], 12: [("C4", 12)]}


def melody(bars, start, bar_len, fn):
    t = start
    for b in bars:
        for n, u in MEL[b]:
            d = u / 12 * bar_len
            fn(n, t, d)
            t += d


# =============== 0 – 4.6  a single candle: a music box in the dark ===============
put(wind(12, .8), 0, .8, 0, "sfx")
put(spark(), .33, 1, .1, "sfx")
ring("crotale", "C7", .45, .22, .25)
for sec, n in (("cello", "C3"), ("viola", "G3"), ("violin", "E4")):
    put(section(sec, n, 5.0, vel=.42, soft=.85, att=2.2, rel=1.4), .5, SEC[sec][1], SEC[sec][0])
for n in ("C4", "E4", "G4"):
    ring("vibes", n, .9, .16, -.2)
melody([1, 2], .9, 2.0, lambda n, t, d: ring("glock", up(n, 1), t, .5, .15))

# =============== 4.6 – 9.6  the stadium in the forest ===============
swell("roll18", 5.0, 1.7, .55)
put(riser(1.0, 300, 4000, .4), 4.0, .7, 0, "sfx")
put(choir(hz("C4"), 3.4, "oo", 5, .8, 1.3) + choir(hz("E4"), 3.4, "oo", 5, .8, 1.3) + choir(hz("G4"), 3.4, "oo", 5, .8, 1.3), 5.0, .9, 0, "choir")
for i, n in enumerate(("C6", "E6", "G6", "C7")):
    ring("glock", n, 5.0 + i * .11, .28, .3)
for at, ch, arp in ((5.0, "C", ("C3", "G3", "E4", "G4", "C5")), (6.2, "Am", ("A2", "E3", "C4", "E4", "A4")), (7.4, "F", ("F2", "C3", "A3", "C4", "F4"))):
    strings(ch, at, 1.25 if ch != "F" else 1.0, vel=.75, soft=.35, att=.3, rel=.5 if ch != "F" else 1.3)
    for i, n in enumerate(arp):
        piano(n, at + i * .2, .5 - i * .03)
brass("horn", ["F3", "A3"], 7.4, 1.1, vel=.6, soft=.35, att=.2, rel=1.2)
for sec, n in (("bass", "A1"), ("cello", "E2")):
    put(section(sec, n, 11.6, n=2, vel=.55, soft=.75, att=1.6, rel=2.0), 8.3, SEC[sec][1], SEC[sec][0])
hit("cym_bow", 8.4, .35)
solo("violin", "E6", 8.6, 1.4, vel=.28, pan=-.3, soft=.55, att=.9, rel=.6)

# =============== 9.6 – 20.3  Act I · blood ===============
put(riser(.65, 200, 2500, .6), 9.2, 1, 0, "sfx")
rev = fx("cym_stick")[:, :int(.6 * SR)][:, ::-1].copy()
put(rev * np.linspace(.2, 1, rev.shape[1]), 9.25, .45, 0, "perc")
hit("tamtam40", 9.85, .9)
put(boom(3.5, 58, 30, 1.0), 9.85, .9, 0, "sfx")
for n in ("A1", "E2", "A2"):
    piano(n, 9.85, .9)
brass("trombone", ["A2"], 9.85, 1.2, vel=.7, att=.02, rel=.9)
t_ = tt(9.5)
put((np.sin(2 * np.pi * 1318.5 * t_) + np.sin(2 * np.pi * 1323.5 * t_)) * .005 * adsr(len(t_), 2, .1, 1, 2), 10.2, 1, .3, "sfx")
hit("tamtam_bow", 10.4, .3)
for k in range(5):
    put(heartbeat(.55), 11.7 + k * .95, 1, 0, "sfx")
put(band(noise(4.6), 35, 160) * .05, 11.4, 1, 0, "sfx")
for at, n, d in ((12.0, "A3", 1.25), (13.2, "C4", .62), (13.8, "B3", .62), (14.4, "A3", .62), (15.0, "E3", 1.5)):
    solo("cello", n, at, d, vel=.85, pan=.15, soft=.2, att=.12, rel=.45)       # a lament for the queue
for at, n in ((12.0, "A2"), (13.9, "F2"), (15.1, "E2")):
    piano(n, at, .5)
DROP_T = [15.75, 16.6, 17.25, 17.7, 18.05, 18.33, 18.56, 18.76, 18.93, 19.07, 19.19, 19.3, 19.4, 19.49, 19.57, 19.64, 19.71]
DROP_N = ["E6", "C6", "A5", "E6", "C6", "A5", "E6", "B5", "G#5", "E5", "B5", "G#5", "E5", "G#5", "B5", "E6", "G#6"]
for i, (d, n) in enumerate(zip(DROP_T, DROP_N)):
    piano(n, d, .62 if i == 0 else .4 + .02 * i, pan=(rng.random() - .5) * .5)    # every drop is a note
    put(plip(.8 if i == 0 else .55), d, 1, (rng.random() - .5) * .4, "sfx")
    if i == 0 or DROP_T[i] - DROP_T[i - 1] > .3:
        put(heartbeat(.45 + .04 * i), d - .02, 1, 0, "sfx")
strings("E", 17.4, 2.62, vel=.95, soft=.25, att=2.4, rel=.06)
swell("roll20", 20.05, 1.5, .8)
for k in range(14):
    put(timpani(hz("E2"), .5, .2 + k * .05), 19.25 + k * .055, 1, 0, "perc")
put(riser(1.4, 300, 8000, .7), 18.65, 1, 0, "sfx")

# =============== 20.05  the red becomes the sun · Act II · sweat ===============
strings("F", 20.05, 2.6, vel=1.0, soft=0, att=.02, rel=1.6, extra=[("violin", ["F5"])])
brass("horn", ["F3", "A3", "C4", "F4"], 20.05, 2.4, vel=1.0, rel=1.2)
brass("trombone", ["F2", "C3"], 20.05, 2.4, vel=.9, rel=1.0)
hit("crash_viennese", 20.05, .85)
hit("tamtam40", 20.05, .5)
put(timpani(hz("F2"), 2.5, 1.0), 20.05, 1, 0, "perc")
put(boom(3, 50, 30, .6), 20.05, 1, 0, "sfx")
put(sum(choir(hz(n), 2.6, "ah", 5, .1, 1.2) for n in ("F3", "A3", "C4", "F4")), 20.05, .7, 0, "choir")
put(wind(5, .45), 21.5, .7, 0, "sfx")
for at, ch, lh, hn in ((21.9, "F", "F3", "F3"), (23.0, "Dm", "D3", "A3"), (24.1, "Bb", "Bb2", "Bb3"), (25.15, "C", "C3", "G3")):
    strings(ch, at, 1.15, vel=.5, soft=.55, att=.35, rel=.5, only=("bass", "cello", "viola"))
    piano(lh, at, .45)
    brass("horn", [hn], at, 1.05, vel=.5, soft=.4, att=.2, rel=.5)
for at, n in ((21.9, "A4"), (22.45, "C5"), (23.0, "D5"), (23.8, "C5"), (24.1, "Bb4"), (24.65, "D5"), (25.15, "C5"), (25.65, "E5")):
    piano(n, at, .62, pan=.05)                                                     # a hopeful theme
B = 60 / 138
for k in range(5):
    piano("C5", 25.15 + k * B / 2 + .02, .32 + .06 * k, dur=.2)

# time-lapse work song, 138 bpm, three bars
LAPSE = [("F", "F2", ["C5", "F5", "A5", "F5", "C5", "F5", "A5", "C6"], ["F3", "A3", "C4"], [("A5", 2), ("G5", 1), ("F5", 1)], "C6"),
         ("C", "C2", ["G4", "C5", "E5", "C5", "G4", "C5", "E5", "G5"], ["E3", "G3", "C4"], [("G5", 3), ("E5", 1)], "G5"),
         ("Dm", "D2", ["A4", "D5", "F5", "D5", "A4", "D5", "F5", "A5"], ["F3", "A3", "D4"], [("F5", 1), ("A5", 1), ("D6", 2)], "A5")]
for bar, (ch, root, arp, hrn, mel, glk) in enumerate(LAPSE):
    t0, lv = 26.2 + bar * 4 * B, .86 + .12 * bar
    brass("horn", hrn, t0, 4 * B, vel=.66 + .15 * bar, soft=.2, att=.08, rel=.2)
    if bar:
        hit("cym_stick", t0, .22 + .1 * bar)
    strings(ch, t0, 4 * B, vel=.5 + .1 * bar, soft=.35, att=.06, rel=.15, only=("viola",))
    t = t0
    for n, beats in mel:
        put(section("violin", n, beats * B, vel=lv, soft=.2, att=.05, rel=.25), t, SEC["violin"][1], SEC["violin"][0])
        t += beats * B
    for k in range(8):
        ring("violin_pizz", arp[k], t0 + k * B / 2, lv, -.25 + .1 * (k % 2))
        piano(up(arp[k], -1), t0 + k * B / 2, .4 + .1 * bar, dur=.18, pan=.2)
    for k in range(4):
        ring("bass_pizz", root, t0 + k * B, 1.0, .4)
        if k % 2 == 0:
            solo("cello", up(root, 1), t0 + k * B, .3, vel=.7, pan=.3, att=.01, rel=.12)
        if k % 2:
            put(clink(.9), t0 + k * B, 1, (rng.random() - .5) * 1.2, "sfx")
        put(scrape(.2, .8), t0 + k * B + B / 2, 1, (rng.random() - .5) * 1.2, "sfx")
    put(timpani(hz(root, 1), 1.6, .85 + .1 * bar), t0, 1, 0, "perc")
    ring("glock", glk, t0, .32, .3)
for k in range(14):
    put(timpani(hz("C2"), .6, .25 + k * .05), 31.0 + k * .057, 1, 0, "perc")
swell("roll18", 31.8, 1.2, .8)
put(riser(1.0, 400, 7000, .6), 30.8, 1, 0, "sfx")

# 31.8 the new terrace: a proud F major, IV, I
strings("F", 31.8, 1.6, vel=1.0, soft=0, att=.02, rel=.4, extra=[("violin", ["F5", "A5"])])
brass("horn", ["F3", "A3", "C4", "F4"], 31.8, 1.6, vel=1.0, rel=.4)
brass("trombone", ["F2", "C3", "F3"], 31.8, 1.6, vel=.95, rel=.4)
solo("trumpet", "C5", 31.8, .5, vel=.9, pan=.05, att=.02, rel=.1)
solo("trumpet", "F5", 32.32, 1.1, vel=.95, pan=.05, att=.02, rel=.5)
hit("crash_heavy", 31.8, .8)
hit("tamtam28", 31.8, .45)
put(timpani(hz("F2"), 2.5, 1.0), 31.8, 1, 0, "perc")
put(sum(choir(hz(n), 3.0, "ah", 5, .12, 1.3) for n in ("F3", "A3", "C4", "F4")), 31.8, .7, 0, "choir")
put(crowd(3.4, .45) * adsr(int(3.4 * SR), .3, .5, .7, 1.5), 31.8, 1, 0, "sfx")
strings("Bb", 33.45, 1.0, vel=.8, soft=.2, att=.08, rel=.3)
brass("horn", ["Bb2", "D3", "F3", "Bb3"], 33.45, 1.0, vel=.75, rel=.3)
strings("F", 34.45, .8, vel=.6, soft=.5, att=.1, rel=1.5)

# =============== 34.9 – 47.2  Act III · song ===============
put(wind(7, .7), 34.6, .8, 0, "sfx")
hit("tamtam28", 35.15, .35)
put(bell(hz("G2"), 7, .8), 35.15, .8, 0, "perc")
ring("crotale", "G6", 35.15, .3, .3)
for sec, n in (("cello", "C3"), ("viola", "G3"), ("violin", "E4")):
    put(section(sec, n, 5.6, vel=.38, soft=.85, att=1.5, rel=1.6), 35.3, SEC[sec][1], SEC[sec][0])
melody([1, 2], 37.0, 2.0, lambda n, t, d: put(choir(hz(n), d + .5, "ah", 3, .12, .45), t, .9, -.1, "choir"))   # 89 voices, 2003
put(choir(hz("C3"), 4.0, "oo", 3, .6, .8) + choir(hz("G3"), 4.0, "oo", 3, .6, .8), 37.0, .4, 0, "choir")
for at in (37.0, 39.0):
    for n in ("C4", "E4", "G4"):
        ring("vibes", n, at, .2, -.25)
melody([3, 4, 5], 41.0, 2.0, lambda n, t, d: put(choir(hz(n), d + .55, "ah", 12, .08, .5), t, 1.6, 0, "choir"))   # 28,500 today
CAROL = [(41.0, "G7", ["G2", "D3"], ["F3", "B3"], ["D4"]), (43.0, "C", ["C3", "G3"], ["E3", "C4"], ["G4"]), (45.0, "F", ["F2", "C3"], ["F3", "A3"], ["C5"])]
for k, (at, ch, tb, hn, tp) in enumerate(CAROL):
    put(sum(choir(hz(n), 2.05, "ah", 6, .2, .4) for n in V[ch]["cello"] + V[ch]["viola"]), at, .8, 0, "choir")
    strings(ch, at, 2.0, vel=.6 + .08 * k, soft=.4 - .1 * k, att=.2, rel=.3)
    brass("trombone", tb, at, 1.95, vel=.55 + .12 * k, soft=.3 - .1 * k, att=.08, rel=.3)
    brass("horn", hn, at, 1.95, vel=.55 + .12 * k, soft=.3 - .1 * k, att=.08, rel=.3)
    brass("trumpet", tp, at, 1.95, vel=.5 + .12 * k, soft=.3 - .1 * k, att=.08, rel=.3)
melody([5], 45.0, 2.0, lambda n, t, d: ring("glock", up(n, 1), t, .3, .2))
melody([3, 4, 5], 41.0, 2.0, lambda n, t, d: put(section("violin", n, d, vel=.55, soft=.35, att=.06, rel=.3), t, SEC["violin"][1], SEC["violin"][0]))
for k in range(16):
    put(timpani(hz("C2"), .5, .15 + k * .03), 46.1 + k * .055, 1, 0, "perc")
swell("roll20", 47.0, 1.0, .7)

# =============== 47.25  floodlights · an anthem ===============
for at, pan in ((47.25, -.5), (47.42, .5)):
    put(boom(3.0, 75, 34, 1.0), at, 1, pan, "sfx")
    put(band(noise(.25), 120, 1800) * np.exp(-tt(.25) * 30) * .5, at, 1, pan, "sfx")
hit("tamtam40", 47.25, .35)
put(hum(4.5, 1.0), 47.3, 1, 0, "sfx")
put(crowd(4.8, 1.0) * adsr(int(4.8 * SR), .6, .8, .6, 2.0), 47.5, 1, 0, "sfx")
ANTHEM = [(47.6, "C", "C2", ["E3", "G3", "C4", "E4"], ["C3", "G3"], ("E5", "C5"), 1.15),
          (48.8, "G", "G1", ["D3", "G3", "B3", "D4"], ["G2", "D3"], ("D5", "B4"), 1.15),
          (50.0, "Am", "A1", ["E3", "A3", "C4", "E4"], ["A2", "E3"], ("E5", "C5"), .58),
          (51.2, "F", "F1", ["F3", "A3", "C4", "F4"], ["F2", "C3"], ("C5", "A4"), 1.6)]
for at, ch, bassn, hn, tb, (t1, t2), d in ANTHEM:
    last = ch == "F"
    strings(ch, at, 1.6 if last else 1.22, vel=1.0, soft=0, att=.03, rel=1.4 if last else .3, extra=[("violin", [t1])])
    brass("horn", hn, at, 1.6 if last else 1.2, vel=.95, rel=1.2 if last else .3)
    brass("trombone", tb, at, 1.6 if last else 1.2, vel=.9, rel=1.0 if last else .3)
    solo("trumpet", t1, at, d, vel=1.0, pan=.0, att=.02, rel=.25)
    solo("trumpet", t2, at, d, vel=.8, pan=.12, att=.02, rel=.25)
    put(timpani(hz(bassn, 1), 1.6, 1.0), at, 1, 0, "perc")
    put(sum(choir(hz(n), 1.6 if last else 1.25, "ah", 6, .06, 1.0 if last else .3) for n in hn), at, .55, 0, "choir")
    for k in range(4):
        solo("cello", up(bassn, 1), at + k * .3, .2, vel=.75, pan=.3, att=.01, rel=.1)
solo("trumpet", "C5", 50.6, .55, vel=1.0, att=.02, rel=.2)
solo("trumpet", "A4", 50.6, .55, vel=.8, pan=.12, att=.02, rel=.2)
hit("crash_viennese", 47.6, .75)
hit("crash_heavy", 50.0, .6)

# =============== 51.6 – 59  the forest · the last phrase of Stille Nacht ===============
put(wind(7.5, .5), 51.5, .7, 0, "sfx")
for at, ch, d in ((51.9, "F", 1.5), (53.4, "G", 1.2), (54.6, "Am", 1.2)):
    strings(ch, at, d, vel=.5, soft=.55, att=.5, rel=.9)
for at, n in ((52.0, "A4"), (52.5, "C5"), (53.0, "F5"), (53.4, "D5"), (53.9, "B4"), (54.6, "C5"), (55.1, "E5")):
    piano(n, at, .55)
melody([11, 12], 55.8, 1.6, lambda n, t, d: ring("glock", up(n, 1), t, .5, .15))
for sec, n in (("bass", "C2"), ("cello", "G2"), ("viola", "E4"), ("violin", "C5")):
    put(section(sec, n, 2.9, vel=.45, soft=.7, att=1.0, rel=1.4), 55.8, SEC[sec][1], SEC[sec][0])
for n in ("C4", "E4", "G4"):
    ring("vibes", n, 55.8, .18, -.2)
put(choir(hz("C4"), 2.8, "oo", 4, 1.0, 1.4) + choir(hz("E4"), 2.8, "oo", 4, 1.0, 1.4) + choir(hz("G4"), 2.8, "oo", 4, 1.0, 1.4), 56.2, .35, 0, "choir")

# =============== mix & master ===============
hall = (reverb_ir(2.8, 1), reverb_ir(2.8, 2))
church = (reverb_ir(4.2, 3, 5.5), reverb_ir(4.2, 4, 5.5))
SENDS = {"orch": (.8, .36, hall), "choir": (.6, .6, church), "perc": (.85, .3, hall), "sfx": (.9, .18, hall)}
BUS["choir"] *= 5.0                 # the formant choir is generated quiet; bring it up to the orchestra
mix = np.zeros((2, N))
for name, (dry, wet, ir) in SENDS.items():
    b = BUS[name]
    mix += b * dry + np.stack([convolve(b[0], ir[0]), convolve(b[1], ir[1])]) * wet
mix = np.stack([band(ch, 28) for ch in mix])
# gentle bus compression (block envelope, 3:1 above -22 dB) so the quiet candle and the tutti both read on a phone
blk = 256
env = np.sqrt(np.mean((mix[:, :N // blk * blk] ** 2).reshape(2, -1, blk), axis=(0, 2)) + 1e-12)
ref = np.sqrt(np.mean(mix ** 2)) + 1e-12
lev = 20 * np.log10(env / ref)
gr = np.where(lev > -2, (lev + 2) * (1 / 3 - 1), 0.0)
for i in range(1, len(gr)):
    c = .35 if gr[i] < gr[i - 1] else .02
    gr[i] = gr[i - 1] + (gr[i] - gr[i - 1]) * c
g = np.interp(np.arange(N), np.arange(len(gr)) * blk + blk / 2, 10 ** (gr / 20))
mix *= g
fade = np.ones(N)
fade[:int(.3 * SR)] = np.linspace(0, 1, int(.3 * SR))
fade[-int(.9 * SR):] = np.linspace(1, 0, int(.9 * SR))
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

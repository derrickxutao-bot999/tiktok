"""Cut 2 score: the whole soundtrack. 96 BPM, D major / B minor.

The five-note motif for "再等一会儿" (A B D E C#) hangs on C# and resolves to D
only at the 1999 winner, the 2024 final whistle, and the closing line.
Every hit is written against edit2's cut list.

Outputs build/music2/<stem>.wav and score2.mid
"""
import os
import numpy as np
import mido
import tinysoundfont
from scipy.io import wavfile
import music as M
from music import N, SR, reverb
from edit2 import BEAT, BAR, TOTAL
from style import BUILD

PERC = "/opt/assets/FreePatsGM-Percussion-SF2-20200822/FreePatsGM-Percussion-20200822.sf2"
INSTR = dict(M.INSTR)
INSTR.update({"bass": (M.GM, 33), "kit": (PERC, 0)})
STEMS = {"piano": ["piano"], "winds": ["clarinet", "harp", "bells"], "strings": ["strings", "pad"],
         "perc": ["timp", "kit"], "bass": ["bass"]}

EV = []
def note(t, ins, n, vel, dur):
    EV.append((t, ins, N[n] if isinstance(n, str) else n, int(max(1, min(127, vel))), dur))

def chord(t, ins, ns, vel, dur, spread=0.0):
    for i, n in enumerate(ns):
        note(t + i * spread, ins, n, vel, dur)

def b(n):   # bar start time
    return n * BAR

KICK, SIDE, SNARE, CLAP, HH, PHH, OHH, CRASH, RIDE, TOML, TOMM, TOMH, TAMB, SHAK = 36, 37, 38, 39, 42, 44, 46, 49, 51, 45, 47, 50, 54, 70

def drum(t, n, v):
    note(t, "kit", n, v, 0.3)

MOTIF = ["A4", "B4", "D5", "E5", "C#5"]

def motif(t, ins, step, vel, resolve=False, oct=0, last=2.0):
    for i, n in enumerate(MOTIF):
        note(t + i * step, ins, N[n] + 12 * oct, vel, step * 1.5 if i < 4 else last)
    if resolve:
        note(t + 5 * step, ins, N["D5"] + 12 * oct, vel + 8, last + 1.0)

# ------------------------------------------------------------------ patterns
def groove_light(t0, bars, v=1.0):
    for k in range(bars * 8):
        t = t0 + k * BEAT / 2
        drum(t, SHAK, (40 if k % 2 == 0 else 28) * v)
        if k % 4 == 0:
            drum(t, KICK, 70 * v)
        if k % 4 == 2:
            drum(t, SIDE, 52 * v)

def groove_full(t0, bars, v=1.0, crash_first=True):
    for k in range(bars * 8):
        t = t0 + k * BEAT / 2
        drum(t, HH, (64 if k % 2 == 0 else 44) * v)
        if k % 8 in (0, 3, 4):
            drum(t, KICK, (96 if k % 8 == 0 else 80) * v)
        if k % 4 == 2:
            drum(t, SNARE, 92 * v)
    if crash_first:
        drum(t0, CRASH, 90 * v)

def halftime(t0, bars, v=1.0):
    for k in range(bars * 8):
        t = t0 + k * BEAT / 2
        drum(t, HH, (50 if k % 2 == 0 else 34) * v)
        if k % 8 == 0:
            drum(t, KICK, 88 * v)
        if k % 8 == 4:
            drum(t, SNARE, 80 * v)

def march(t0, bars, v=1.0):
    pat = [(0, 90), (1, 30), (2, 60), (3, 40), (4, 85), (6, 60), (7, 45), (8, 88), (10, 58), (11, 40), (12, 84), (13, 34), (14, 62), (15, 66)]
    for bb in range(bars):
        for st, vv in pat:
            drum(t0 + bb * BAR + st * BEAT / 4, SNARE, vv * v)
        for q in (0, 2):
            drum(t0 + bb * BAR + q * BEAT, KICK, 86 * v)
        drum(t0 + bb * BAR, CRASH if bb % 4 == 0 else RIDE, 70 * v)

def heartbeat(t0, beats, v=1.0):
    for k in range(beats):
        drum(t0 + k * BEAT, KICK, 62 * v)

def roll(t0, dur, v0, v1, n=SNARE, rate=16):
    k = 0
    step = BEAT * 4 / rate
    while k * step < dur:
        x = k * step / dur
        drum(t0 + k * step, n, v0 + (v1 - v0) * x)
        k += 1

def fill(t0, beats=2):
    toms = [TOMH, TOMH, TOMM, TOMM, TOML, TOML, TOML, KICK]
    for i in range(beats * 4):
        drum(t0 + i * BEAT / 4, toms[int(i / (beats * 4) * 8)], 80 + i * 2)

def bass_line(t0, roots, per=BAR, eighths=True, v=78):
    for i, r in enumerate(roots):
        t = t0 + i * per
        if eighths:
            for k in range(int(per / (BEAT / 2))):
                note(t + k * BEAT / 2, "bass", r, v - (k % 2) * 10, BEAT / 2 * 0.9)
        else:
            note(t, "bass", r, v, per * 0.95)

def arps(t0, chords, per=BAR, v=46, rate=2):
    pat = [0, 1, 2, 3, 2, 1, 2, 3]
    for i, ns in enumerate(chords):
        t = t0 + i * per
        steps = int(per / (BEAT / rate))
        for k in range(steps):
            note(t + k * BEAT / rate, "piano", ns[pat[k % 8]], v - (k % 2) * 6, BEAT / rate * 1.6)

def pads(t0, chords, per=BAR, v=40, ins="strings"):
    for i, ns in enumerate(chords):
        chord(t0 + i * per, ins, ns, v, per * 0.98)

D_ = ["D3", "A3", "F#4", "A4"]; A_C = ["C#3", "A3", "E4", "A4"]; Bm = ["B2", "F#3", "D4", "F#4"]
G_ = ["G2", "D3", "B3", "D4"]; A_ = ["A2", "E3", "C#4", "E4"]; Em = ["E3", "B3", "E4", "G4"]; DF = ["F#2", "D3", "A3", "D4"]

def compose():
    # ---- 0-12.5 Martinez: a low bed that stays out of his way
    chord(0.4, "pad", ["D2", "A2"], 26, 12.0)
    for k in range(4, 20):
        note(k * BEAT, "piano", "D2", 20 + k, 0.5)
    chord(b(4), "strings", ["D3", "A3", "D4"], 20, 2.4)
    roll(b(4) + BAR / 2, BAR / 2, 10, 48, TOML, rate=8)
    # click (12.5): dead stop on a low hit
    chord(b(5), "piano", ["D1", "D2"], 64, 2.4)
    note(b(5), "timp", "D2", 70, 1.5)
    # ---- 12.5-17.5 he leaves: sparse B minor, clock-like side stick
    for i, n in enumerate(["B3", "F#3", "D4", "B3"]):
        note(b(5) + 0.4 + i * BEAT * 2, "piano", n, 34, 1.3)
    for k in range(8):
        drum(b(5) + BAR / 2 + k * BEAT, SIDE, 26)
    note(17.45, "timp", "B1", 64, 1.5)          # the door closes
    # ---- 17.5-20 the empty room: one high note
    note(17.6, "bells", "B5", 26, 2.3)
    # ---- 20-25 the door opens on 1999
    for i, n in enumerate(["D4", "F#4", "A4", "D5", "F#5", "A5", "D6"]):
        note(20.0 + i * 0.07, "harp", n, 52, 2.2)
    arps(b(8) + BEAT, [D_], per=BAR - BEAT, v=38)
    arps(b(9), [A_C], v=42)
    groove_light(b(9), 1, 0.8)
    bass_line(b(9), ["C#2"], eighths=False, v=66)
    # ---- 25-35 orbit: the same seat, four eras, one bar each
    arps(b(10), [D_, A_C, Bm], v=48)
    pads(b(10), [["D3", "A3", "F#4"], ["C#3", "A3", "E4"], ["B2", "F#3", "D4"]], v=40)
    bass_line(b(10), ["D2", "C#2", "B1"], v=74)
    groove_light(b(10), 1)
    groove_full(b(11), 2, 0.85)
    motif(b(10) + 0.3, "clarinet", BEAT, 64)
    # 2026: the band drops away, piano alone under "Really poor"
    chord(b(13), "piano", ["G1", "D3", "G3", "B3"], 44, 2.4)
    chord(b(13), "strings", ["G2", "D3", "B3"], 30, 2.4)
    roll(b(13) + BEAT * 2.5, BEAT * 1.5, 20, 96)
    # ---- 35 title hit
    drum(b(14), CRASH, 110); drum(b(14), KICK, 110); note(b(14), "timp", "D2", 110, 2.0)
    chord(b(14), "strings", ["D2", "A2", "D3", "F#3", "A3", "D4"], 78, 2.4)
    chord(b(14), "piano", ["D1", "D2"], 90, 2.4)
    motif(b(14) + 0.05, "piano", BEAT / 2, 80, oct=0, last=1.4)
    motif(b(14) + 0.05, "piano", BEAT / 2, 66, oct=1, last=1.4)
    # ---- 37.5-42.5 1999 card + Basler: the clock starts
    for k in range(16):
        drum(b(15) + k * BEAT / 2, SIDE, 40 if k % 2 == 0 else 26)
        drum(b(15) + k * BEAT / 2, PHH, 30)
    bass_line(b(15), ["B1", "B1"], v=64)
    pads(b(15), [Bm, Bm], v=34)
    note(42.05, "timp", "B1", 96, 1.5); drum(42.05, KICK, 100)
    chord(42.05, "piano", ["B0", "B1", "F#2"], 80, 2.0)
    # ---- 42.5-47.5 sleepy; father: "再等一会儿"
    chord(b(17), "piano", ["B2", "F#3", "D4"], 36, 2.4)
    chord(b(18), "piano", ["G2", "D3", "B3"], 36, 2.4)
    for k in range(8):
        drum(b(17) + k * BEAT, SIDE, 30)
    motif(45.6, "clarinet", 0.34, 60, last=1.6)
    chord(46.3, "strings", ["A2", "E3", "A3"], 20, 1.2)
    chord(46.9, "strings", ["A2", "E3", "A3", "C#4"], 46, 0.6)
    # ---- 47.5-50 90:00, +3: timpani roll, hats tighten
    roll(b(19), BAR, 30, 100, n=TOML, rate=16)
    note(b(19), "timp", "A1", 50, 2.5)
    for k in range(16):
        drum(b(19) + k * BEAT / 4 * 2, HH, 40 + k * 2)
    chord(b(19), "strings", ["A2", "E3", "A3"], 50, 2.4)
    # ---- 50-55 first corner, 1-1 at 52.5
    groove_full(b(20), 2, 0.95)
    bass_line(b(20), ["A1", "A1"], v=82)
    pads(b(20), [["B2", "F#3", "D4"], ["A2", "E3", "C#4"]], v=52)
    arps(b(20), [Bm], v=50)
    note(52.5, "timp", "D2", 104, 1.5); drum(52.5, CRASH, 112)
    chord(52.5, "strings", ["D3", "A3", "D4", "F#4"], 80, 1.2)
    for i, n in enumerate(["D4", "F#4", "A4", "D5", "F#5", "A5"]):
        note(52.5 + i * 0.04, "harp", n, 62, 1.4)
    arps(b(21), [A_], v=52)
    # ---- 55-60 second corner: the long build
    for k in range(8):
        drum(b(22) + k * BEAT / 2, KICK, 70 + k * 2)
        drum(b(22) + k * BEAT / 2, HH, 50)
    bass_line(b(22), ["A1", "A1"], v=84)
    for i, n in enumerate(["A2", "B2", "C#3", "D3", "E3", "F#3", "G3", "G#3"]):
        note(b(22) + i * BEAT, "piano", n, 52 + i * 5, BEAT * .9)
        note(b(22) + i * BEAT, "piano", N[n] + 12, 48 + i * 5, BEAT * .9)
    chord(b(22), "strings", ["A2", "E3", "A3"], 50, 2.4)
    chord(b(23), "strings", ["A2", "E3", "A3", "C#4", "E4"], 64, 2.4)
    roll(b(23), BAR - BEAT, 40, 118)
    fill(b(23) + BAR - BEAT, 1)
    # ---- 60 THE WINNER: everything resolves
    drum(b(24), CRASH, 127); drum(b(24), KICK, 127); note(b(24), "timp", "D2", 120, 2.5)
    groove_full(b(24), 1, 1.0)
    halftime(b(25), 1, 0.8)
    chord(b(24), "piano", ["D1", "D2", "A2", "F#3", "A3", "D4"], 100, 2.4)
    pads(b(24), [["D2", "A2", "D3", "F#3", "A3", "D4"], ["G2", "D3", "G3", "B3", "D4"]], v=84)
    bass_line(b(24), ["D2", "G1"], v=90)
    motif(b(24) + 0.02, "clarinet", BEAT / 2, 92, resolve=True, last=1.2)
    for i, n in enumerate(["D4", "F#4", "A4", "D5", "F#5", "A5", "D6"]):
        note(b(24) + i * 0.04, "harp", n, 74, 2.0)
    arps(b(25), [G_], v=54)
    # ---- 65-67.5 "Football. Bloody hell." breakdown
    chord(b(26), "strings", ["D3", "A3", "D4"], 44, 2.4)
    note(b(26) + 0.3, "piano", "F#5", 40, 2.0)
    # ---- 67.5-72.5 2013: alone with the piano
    for tt, n in ((67.8, "F#4"), (69.4, "D4"), (71.0, "B3")):
        note(tt, "piano", n, 40, 1.8)
    chord(67.6, "pad", ["B1", "F#2"], 28, 4.8)
    # ---- 72.5-82.5 seasons on the beat
    heartbeat(b(29), 16, 0.9)
    for k in range(32):
        t = b(29) + k * BEAT / 2
        note(t, "piano", ["B2", "D3", "F#3", "D3"][k % 4], 34 + k // 2, BEAT / 2 * .8)
        drum(t, SHAK, 30)
    for i in (2, 3, 9, 10):
        tt = b(29) + i * BEAT
        chord(tt, "bells", ["D5", "A5"], 44, 1.0)
        chord(tt, "harp", ["D4", "F#4", "A4", "D5"], 50, 1.0, spread=0.03)
    motif(77.8, "piano", 0.3, 60, last=1.8)
    groove_light(b(31), 2, 0.8)
    pads(b(31), [G_, A_], v=46)
    bass_line(b(31), ["G1", "A1"], v=70)
    roll(b(32) + BEAT * 2, BEAT * 2, 20, 90)
    # ---- 82.5-90 FA Cup final 2024
    groove_full(b(33), 3, 0.9)
    bass_line(b(33), ["D2", "G1", "A1"], v=80)
    pads(b(33), [D_, G_, A_], v=50)
    arps(b(33), [D_, G_, A_], v=50)
    for g in (84.75,):
        note(g, "timp", "D2", 92, 1.0); drum(g, CRASH, 100)
        chord(g, "harp", ["D4", "F#4", "A4", "D5", "F#5"], 58, 1.0, spread=0.03)
    motif(87.55, "clarinet", 0.25, 80, resolve=True, last=1.6)
    drum(88.8, CRASH, 112); note(88.8, "timp", "D2", 100, 1.2)
    chord(88.8, "strings", ["D3", "A3", "D4", "F#4", "A4"], 74, 1.6)
    # ---- 90-100 the phone call, then morning
    for i, (bb, ns) in enumerate([("F#2", ["D3", "A3", "D4"]), ("G2", ["D3", "G3", "B3"]), ("A2", ["E3", "A3", "C#4"])]):
        note(b(36) + i * BAR, "piano", bb, 42, 2.4)
        chord(b(36) + i * BAR + 0.3, "piano", ns, 34, 2.1, spread=0.1)
    chord(b(36), "strings", ["D3", "A3"], 26, 7.4)
    motif(93.3, "clarinet", 0.36, 54, resolve=True, last=1.2)
    note(97.6, "piano", "B0", 48, 2.4); chord(97.6, "pad", ["B1", "F#2"], 30, 2.3)
    # ---- 100-105 2005: the debt lands
    for k in range(16):
        t = b(40) + k * BEAT / 2
        note(t, "piano", "B1", 40, BEAT / 2 * .8); note(t, "piano", "B0", 34, BEAT / 2 * .8)
    heartbeat(b(40), 8, 1.0)
    chord(b(40), "pad", ["B1", "F#2"], 34, 4.9)
    for g in (101.875, 102.44, 103.0):
        note(g, "timp", "B1", 96, 1.0); drum(g, KICK, 110)
    # ---- 105-117.5 green and gold: a march that gathers people
    march(b(42), 1, 0.6)
    march(b(43), 2, 0.75)
    march(b(45), 2, 0.95)
    walk = ["D2", "C#2", "B1", "A1", "G1", "A1", "B1", "C#2"]
    for k in range(40):
        t = b(42) + k * BEAT / 2 * 2 / 2
        if t >= b(47):
            break
        note(t, "bass", walk[(k // 2) % 8], 80, BEAT / 2 * .9)
    pads(b(43), [D_, Bm, G_, A_], v=52)
    arps(b(43), [D_, Bm, G_, A_], v=50)
    motif(110.0, "clarinet", BEAT, 70, last=1.5)
    motif(115.0, "clarinet", BEAT / 2, 82, resolve=True, last=1.0)
    for i in range(4):
        chord(b(45) + i * BEAT, "piano", ["D2", "D3"], 70, BEAT * .8)
    # ---- 117.5-125 protest; stop dead at the stamp (122.5)
    for k in range(16):
        t = b(47) + k * BEAT / 2
        drum(t, TOML if k % 4 == 0 else TOMM, 70 + (k % 4 == 0) * 20)
        if k % 4 == 0:
            drum(t, KICK, 100)
        if k % 8 == 4:
            drum(t, SNARE, 96)
        note(t, "bass", "B1", 84, BEAT / 2 * .9)
    pads(b(47), [Bm, G_], v=60)
    roll(b(48) + BAR / 2, BAR / 2, 40, 110)
    drum(b(49), CRASH, 127); drum(b(49), KICK, 127); note(b(49), "timp", "D2", 127, 2.5)
    chord(b(49), "piano", ["B0", "F#1", "B1", "D2"], 96, 2.0)
    heartbeat(b(49) + 2 * BEAT, 2, 0.6)
    # ---- 125-132.5 red shirt, green-and-gold scarf
    groove_light(b(50), 3, 0.7)
    pads(b(50), [G_, DF, Em], v=46)
    bass_line(b(50), ["G1", "F#1", "E1"], eighths=False, v=66)
    arps(b(50), [G_, DF, Em], v=44)
    motif(128.8, "clarinet", 0.4, 64, resolve=True, last=1.6)
    # ---- 132.5-147.5 he comes back; it builds and cuts to silence
    motif(133.2, "piano", 0.6, 44, last=2.5)
    chord(b(55), "strings", ["G2", "D3", "B3"], 34, 2.4)
    chord(b(56), "strings", ["B2", "F#3", "D4"], 40, 2.4)
    heartbeat(b(56), 4, 0.7)
    chord(b(57), "strings", ["G2", "D3", "B3", "D4"], 54, 2.4)
    groove_light(b(57), 1, 0.9)
    arps(b(57), [G_, A_], v=52)
    groove_full(b(58), 1, 1.0)
    pads(b(58), [A_], v=66)
    bass_line(b(57), ["G1", "A1"], v=80)
    roll(b(58) + BAR / 2, BAR / 2 - 0.05, 40, 115)
    # ---- 147.5-153.5 final words: silence, motif, resolution at 150.0
    motif(148.1, "piano", 0.38, 64, last=2.0)
    note(150.0, "piano", "D1", 70, 3.5); note(150.0, "piano", "D5", 72, 3.5)
    chord(150.0, "strings", ["D2", "A2", "E3", "F#3", "A3", "D4"], 62, 3.5)
    note(150.0, "timp", "D2", 70, 2.0)
    for i, n in enumerate(["D4", "F#4", "A4", "D5", "E5", "A5"]):
        note(150.0 + i * 0.06, "harp", n, 54, 2.5)
    # ---- 153.5-160 end card
    chord(153.6, "pad", ["D2", "A2"], 26, 6.2)
    for tt, n in ((154.0, "F#4"), (155.9, "E4"), (157.6, "D4")):
        note(tt, "piano", n, 32, 2.0)

def render_stem(stem, total):
    syn = tinysoundfont.Synth(samplerate=SR, gain=-3)
    sf_ids, chans = {}, {}
    for ch, ins in enumerate(STEMS[stem]):
        sf, pr = INSTR[ins]
        if sf not in sf_ids:
            sf_ids[sf] = syn.sfload(sf)
        c = 9 if ins == "kit" else ch
        syn.program_select(c, sf_ids[sf], 0, pr, ins == "kit")
        chans[ins] = c
    msgs = []
    for t, ins, n, v, d in EV:
        if ins in chans:
            msgs.append((t, 1, chans[ins], n, v)); msgs.append((t + d, 0, chans[ins], n, 0))
    msgs.sort(key=lambda m: (m[0], m[1]))
    out = np.zeros((int(total * SR), 2), np.float32)
    pos = 0
    for t, on, ch, n, v in msgs:
        s = min(int(t * SR), len(out))
        if s > pos:
            out[pos:s] = np.frombuffer(syn.generate(s - pos), dtype=np.float32).reshape(-1, 2)
            pos = s
        (syn.noteon(ch, n, v) if on else syn.noteoff(ch, n))
    if pos < len(out):
        out[pos:] = np.frombuffer(syn.generate(len(out) - pos), dtype=np.float32).reshape(-1, 2)
    return out

def write_midi(path):
    mid = mido.MidiFile(ticks_per_beat=480)
    names = list(dict.fromkeys(e[1] for e in EV))
    for ci, ins in enumerate(names):
        tr = mido.MidiTrack(); mid.tracks.append(tr)
        tr.append(mido.MetaMessage("track_name", name=ins, time=0))
        if ci == 0:
            tr.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(96), time=0))
        ch = 9 if ins == "kit" else (ci if ci < 9 else ci + 1)
        if ins != "kit":
            sf, pr = INSTR[ins]
            tr.append(mido.Message("program_change", channel=ch, program=pr if sf == M.GM else (0 if ins == "piano" else 48), time=0))
        ev = []
        for t, i2, n, v, d in EV:
            if i2 == ins:
                ev.append((t, 1, n, v)); ev.append((t + d, 0, n, 0))
        ev.sort(key=lambda e: (e[0], e[1]))
        last = 0
        for t, on, n, v in ev:
            tick = int(round(t / BEAT * 480))
            tr.append(mido.Message("note_on" if on else "note_off", channel=ch, note=n, velocity=v, time=max(0, tick - last)))
            last = tick
    mid.save(path)

if __name__ == "__main__":
    compose()
    out = os.path.join(BUILD, "music2"); os.makedirs(out, exist_ok=True)
    wet = {"piano": .2, "winds": .28, "strings": .3, "perc": .12, "bass": .06}
    for st in STEMS:
        x = render_stem(st, TOTAL)
        x = reverb(x, wet=wet[st]) if wet[st] > .1 else x
        wavfile.write(os.path.join(out, f"{st}.wav"), SR, x.astype(np.float32))
        print(st, round(float(np.abs(x).max()), 3))
    write_midi(os.path.join(out, "score2.mid"))

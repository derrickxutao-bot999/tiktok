"""Original score, written note by note against the picture (absolute seconds).

The motif is five notes for the five syllables of "再等一会儿": A B D E C#.
It hangs on C# (the leading tone) and only resolves to D when the waiting
pays off: the 1999 winner, the 2024 final whistle, and the closing line.

Outputs: build/music/<stem>.wav (piano, winds, strings, perc), score.mid
"""
import os
import numpy as np
import mido
import tinysoundfont
from scipy.signal import fftconvolve
from style import BUILD, ROOT

SR = 48000
GM = "/opt/assets/FreePatsGM-SF2-20221026/FreePatsGM-20221026.sf2"
PIANO = "/opt/assets/UprightPianoKW-SF2-20220221/UprightPianoKW-20220221.sf2"
BOWED = "/opt/assets/SynthPadBowed SF2-20190719/SynthPadBowed 20190719.sf2"

# stem -> (soundfont, preset)
INSTR = {
    "piano": (PIANO, 0),
    "clarinet": (GM, 71),
    "harp": (GM, 46),
    "strings": (GM, 50),
    "pad": (BOWED, 0),
    "timp": (GM, 47),
    "bells": (GM, 14),
}
STEMS = {"piano": ["piano"], "winds": ["clarinet", "harp", "bells"], "strings": ["strings", "pad"], "perc": ["timp"]}

N = {}
for o in range(0, 7):
    for i, nm in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]):
        N[f"{nm}{o}"] = 12 * (o + 1) + i

EV = []  # (t, instr, midi, vel, dur)

def note(t, ins, n, vel, dur):
    EV.append((t, ins, N[n] if isinstance(n, str) else n, vel, dur))

def chord(t, ins, ns, vel, dur, spread=0.0):
    for i, n in enumerate(ns):
        note(t + i * spread, ins, n, vel, dur)

MOTIF = ["A4", "B4", "D5", "E5", "C#5"]

def motif(t, ins="piano", step=0.42, vel=70, resolve=False, oct=0, last=2.4):
    for i, n in enumerate(MOTIF):
        m = N[n] + 12 * oct
        note(t + i * step, ins, m, vel - (i == 4) * 6, step * 1.6 if i < 4 else last)
    if resolve:
        note(t + 5 * step + 0.35, ins, N["D5"] + 12 * oct, vel + 6, last + 1.5)
        return t + 5 * step + 0.35
    return t + 4 * step

D_PROG = [("D2", ["D3", "A3", "F#4", "A4"]), ("C#2", ["E3", "A3", "E4", "A4"]),
          ("B1", ["F#3", "B3", "D4", "F#4"]), ("G1", ["D3", "G3", "B3", "D4"])]

def arp_bar(t, bass, notes, beat, vel=46, bars=1):
    note(t, "piano", bass, vel + 8, beat * 4)
    pat = [0, 1, 2, 3, 2, 1, 2, 3]
    for i in range(8 * bars):
        note(t + i * beat / 2, "piano", notes[pat[i % 8]], vel - (i % 2) * 6, beat * 0.9)

def compose():
    # A. opening: low pad under the pull-back; cut dead at the TV click (17.25)
    chord(9.0, "pad", ["D2", "A2"], 38, 8.3)
    note(13.6, "piano", "F#4", 40, 2.5)
    note(15.2, "piano", "A3", 34, 2.0)

    # B. door opens: time runs back. harp glimmer, then the warm room
    for i, n in enumerate(["D4", "F#4", "A4", "D5", "F#5", "A5"]):
        note(26.9 + i * 0.09, "harp", n, 44, 2.5)
    beat = 0.833
    t = 28.0
    for k, (b, ns) in enumerate(D_PROG + [("F#1", ["D3", "A3", "D4", "F#4"]), ("E2", ["D3", "G3", "B3", "E4"])]):
        arp_bar(t, b, ns, beat, vel=44 - (k >= 4) * 6)
        if 1 <= k <= 3:
            chord(t, "strings", [N[ns[0]] - 12, N[ns[1]]], 30, beat * 4)
        t += beat * 4
    chord(t, "piano", ["A1", "E3", "A3", "D4"], 38, 3.0)  # A sus4 at the loop's end: unresolved
    motif(34.2, "clarinet", step=0.5, vel=60)
    motif(41.0, "clarinet", step=0.5, vel=48)

    # C. title
    chord(49.4, "piano", ["G1", "D3", "F#3"], 40, 5.0)
    motif(49.7, "piano", step=0.5, vel=62, last=3.2)

    # D. 1999 card + Basler
    chord(55.2, "pad", ["B1", "F#2"], 30, 9.8)
    for i, n in enumerate(["F#5", "D5", "B4"]):
        note(56.0 + i * 2.4, "piano", n, 34, 2.2)
    note(62.0, "timp", "D2", 60, 2.0)
    chord(62.0, "piano", ["B0", "B1", "F#2"], 50, 3.0)

    # E. waiting: soft Bm / G, then the father's line answered by the clarinet
    for i in range(3):
        chord(65.4 + i * 3.33, "piano", (["B2", "F#3", "D4"] if i % 2 == 0 else ["G2", "D3", "B3"]), 32, 3.2)
    motif(72.4, "clarinet", step=0.48, vel=52, last=2.4)

    # F. 90:00 and the board: almost silence, a pedal and three heartbeats
    chord(76.6, "pad", ["A1", "E2"], 34, 3.5)
    for i in range(3):
        note(78.0 + i * 0.8, "timp", "A1", 48 + i * 6, 0.7)

    # G. first corner: rising strings, release at 1-1 (83.95), tension again
    chord(80.0, "strings", ["B2", "F#3", "D4"], 40, 1.8)
    chord(81.7, "strings", ["G2", "D3", "B3"], 46, 1.3)
    chord(83.0, "strings", ["A2", "E3", "C#4"], 52, 0.95)
    note(83.95, "timp", "D2", 92, 2.0)
    chord(83.95, "strings", ["D3", "A3", "D4", "F#4"], 70, 2.6)
    chord(83.95, "piano", ["D2", "D3", "A3", "F#4", "A4"], 74, 2.6)
    for i, n in enumerate(["D4", "F#4", "A4", "D5", "F#5", "A5", "D6"]):
        note(83.95 + i * 0.05, "harp", n, 58, 2.0)
    chord(86.4, "pad", ["A1", "E2"], 40, 7.2)

    # H. second corner: piano octaves climbing, then the winner (93.5)
    for i, n in enumerate(["A2", "B2", "C#3", "D3", "E3", "F#3", "G3", "G#3"]):
        note(88.0 + i * 0.68, "piano", n, 44 + i * 4, 0.6)
        note(88.0 + i * 0.68, "piano", N[n] + 12, 40 + i * 4, 0.6)
    note(93.5, "timp", "D2", 110, 2.5)
    chord(93.5, "strings", ["D2", "A2", "D3", "F#3", "A3", "D4"], 84, 6.0)
    chord(93.5, "piano", ["D1", "D2", "A2", "F#3", "A3", "D4"], 90, 4.0)
    for i, n in enumerate(["D4", "F#4", "A4", "D5", "F#5", "A5", "D6"]):
        note(93.5 + i * 0.045, "harp", n, 70, 2.5)
    # joy: the motif finally resolves
    motif(95.8, "clarinet", step=0.4, vel=82, resolve=True, last=1.6)
    chord(99.4, "strings", ["D3", "A3", "F#4"], 44, 3.3)
    t = 99.4
    for b, ns in D_PROG:
        arp_bar(t, b, ns, 0.833, vel=40)
        t += 0.833 * 4
    chord(t, "strings", ["D3", "A3", "D4"], 30, 5.0)

    # J. 2013: grief, sparse
    chord(113.0, "pad", ["B1", "F#2"], 30, 8.0)
    for tt, n in ((113.4, "F#4"), (116.2, "D4"), (119.0, "B3")):
        note(tt, "piano", n, 38, 2.6)

    # K. seasons: one low note per season, a bright chord for each trophy
    trophy = {2, 3, 9, 10}
    for i in range(13):
        tt = 121.0 + i * 1.05
        note(tt, "piano", ["B1", "G1", "D2", "A1"][i % 4], 36, 1.0)
        if i in trophy:
            chord(tt + 0.5, "bells", ["D5", "A5"], 34, 1.6)
            chord(tt + 0.5, "harp", ["D4", "F#4", "A4", "D5"], 40, 1.4, spread=0.04)
    motif(129.5, "piano", step=0.48, vel=56, last=2.6)
    chord(132.9, "strings", ["B2", "F#3", "D4"], 34, 2.6)
    chord(135.5, "strings", ["G2", "D3", "B3"], 34, 2.8)
    chord(135.5, "piano", ["A1", "E3", "A3", "D4"], 34, 3.0)

    # L. FA Cup 2024: ostinato, small lifts at the goals, resolution at the whistle
    t = 139.0
    while t < 148.0:
        note(t, "piano", "D3", 36, 0.4); note(t + 0.415, "piano", "A3", 30, 0.4)
        t += 0.83
    chord(139.0, "strings", ["D3", "A3"], 30, 4.6)
    for g in (143.67, 144.3):
        note(g, "timp", "D2", 62, 1.2)
        chord(g, "harp", ["D4", "F#4", "A4", "D5"], 48, 1.2, spread=0.04)
    chord(143.7, "strings", ["D3", "F#3", "A3", "D4"], 46, 4.0)
    chord(147.8, "strings", ["B2", "D3", "F#3"], 40, 0.6)
    motif(147.2, "clarinet", step=0.36, vel=66, resolve=True, last=1.4)
    chord(149.6, "strings", ["D3", "A3", "D4", "F#4"], 48, 2.0)

    # M. phone call: warm, then the old problems
    for tt, (b, ns) in zip((151.6, 154.9, 158.2), [("F#2", ["D3", "A3", "D4"]), ("G2", ["D3", "G3", "B3"]), ("A2", ["E3", "A3", "C#4"])]):
        note(tt, "piano", b, 40, 3.2); chord(tt + 0.3, "piano", ns, 32, 2.9, spread=0.12)
    motif(155.6, "clarinet", step=0.44, vel=50, resolve=True, last=1.2)
    note(160.2, "piano", "B0", 46, 3.5)

    # N. takeover: a clock-like low pulse, thuds as the debt lands
    t = 163.4
    while t < 172.8:
        note(t, "piano", "B1", 34, 0.5); note(t, "piano", "B0", 30, 0.5)
        t += 0.83
    chord(163.4, "pad", ["B1", "F#2"], 30, 9.4)
    for g in (166.0, 166.9, 167.8):
        note(g, "timp", "B1", 70, 1.2)

    # O. green and gold: steady, walking bass, conviction building
    t = 173.6
    walk = ["D2", "C#2", "B1", "A1", "G1", "A1", "B1", "C#2"]
    i = 0
    while t < 190.3:
        b = walk[i % 8]
        note(t, "piano", b, 44 + min(16, i), 0.8); note(t, "piano", N[b] + 12, 38 + min(16, i), 0.8)
        t += 0.83; i += 1
    chord(177.8, "strings", ["D3", "A3", "D4"], 36, 6.6)
    chord(184.4, "strings", ["G2", "D3", "B3", "D4"], 44, 6.0)
    motif(178.2, "clarinet", step=0.55, vel=58, last=2.0)
    motif(186.4, "clarinet", step=0.5, vel=64, resolve=True, last=1.6)

    # P. protest: low pulse; silence after the stamp
    t = 190.6
    while t < 200.8:
        if not (196.9 <= t < 197.6):
            note(t, "timp", "B1", 46, 0.8)
            chord(t, "strings", ["B1", "F#2"], 34, 1.6)
        t += 1.66
    note(196.9, "timp", "D2", 96, 2.0)
    chord(196.9, "piano", ["B0", "F#1", "B1"], 70, 2.6)

    # Q. scarf: hopeful
    for tt, (b, ns) in zip((201.4, 204.7), [("G2", ["D3", "G3", "B3", "D4"]), ("D2", ["D3", "F#3", "A3", "D4"])]):
        note(tt, "piano", b, 44, 3.3); chord(tt, "strings", ns, 36, 3.3)
        for k in range(6):
            note(tt + k * 0.55, "piano", ns[[0, 2, 1, 3, 2, 1][k]] if isinstance(ns[0], int) else N[ns[[0, 2, 1, 3, 2, 1][k]]] + 12, 40, 0.5)
    motif(202.4, "clarinet", step=0.5, vel=56, resolve=True, last=2.0)

    # R. return: solo piano, strings rise under the last lines
    motif(212.2, "piano", step=0.6, vel=46, last=3.5)
    chord(214.0, "piano", ["G1", "D3"], 32, 3.6)
    chord(218.2, "piano", ["B1", "F#3"], 32, 2.8)
    chord(220.6, "strings", ["G2", "D3", "B3"], 34, 3.2)
    chord(223.8, "strings", ["A2", "E3", "C#4"], 40, 2.7)

    # S. final words: silence, the motif, and resolution under "但不是永远"
    motif(227.3, "piano", step=0.42, vel=58, last=2.4)
    note(229.3, "piano", "D1", 60, 4.0)
    chord(229.3, "strings", ["D2", "A2", "E3", "F#3", "A3"], 52, 4.2)
    note(229.9, "piano", "D5", 66, 4.0)
    # T. end card
    chord(233.2, "pad", ["D2", "A2"], 28, 6.8)
    for tt, n in ((233.6, "F#4"), (235.8, "E4"), (237.6, "D4")):
        note(tt, "piano", n, 30, 2.4)

# ---------------------------------------------------------------- render
def render_stem(stem, total):
    syn = tinysoundfont.Synth(samplerate=SR, gain=-3)
    sf_ids = {}
    chans = {}
    for ch, ins in enumerate(STEMS[stem]):
        sf, pr = INSTR[ins]
        if sf not in sf_ids:
            sf_ids[sf] = syn.sfload(sf)
        syn.program_select(ch, sf_ids[sf], 0, pr)
        chans[ins] = ch
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
        if on:
            syn.noteon(ch, n, v)
        else:
            syn.noteoff(ch, n)
    if pos < len(out):
        out[pos:] = np.frombuffer(syn.generate(len(out) - pos), dtype=np.float32).reshape(-1, 2)
    return out

def reverb(x, secs=2.4, wet=0.22, seed=1):
    rng = np.random.default_rng(seed)
    n = int(secs * SR)
    env = np.exp(-np.linspace(0, 7, n))
    ir = np.stack([rng.standard_normal(n) * env, rng.standard_normal(n) * env], 1).astype(np.float32)
    ir[: int(0.012 * SR)] = 0
    ir /= np.sqrt((ir ** 2).sum(0))
    y = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)
    return x * (1 - wet) + y * wet * 1.2

def write_midi(path):
    mid = mido.MidiFile(ticks_per_beat=480)
    tempo = mido.bpm2tempo(60)  # 1 beat = 1 second, so ticks map to seconds
    names = list(INSTR)
    for ci, ins in enumerate(names):
        tr = mido.MidiTrack(); mid.tracks.append(tr)
        tr.append(mido.MetaMessage("track_name", name=ins, time=0))
        if ci == 0:
            tr.append(mido.MetaMessage("set_tempo", tempo=tempo, time=0))
        ch = 9 if False else ci
        tr.append(mido.Message("program_change", channel=ch, program=INSTR[ins][1] if INSTR[ins][0] == GM else (0 if ins == "piano" else 48), time=0))
        ev = []
        for t, i2, n, v, d in EV:
            if i2 == ins:
                ev.append((t, "on", n, v)); ev.append((t + d, "off", n, 0))
        ev.sort(key=lambda e: (e[0], e[1] == "on"))
        last = 0
        for t, kind, n, v in ev:
            tick = int(round(t * 480))
            tr.append(mido.Message("note_on" if kind == "on" else "note_off", channel=ch, note=n, velocity=v, time=tick - last))
            last = tick
    mid.save(path)

if __name__ == "__main__":
    from scipy.io import wavfile
    from timeline import TOTAL
    compose()
    out = os.path.join(BUILD, "music"); os.makedirs(out, exist_ok=True)
    wet = {"piano": .2, "winds": .28, "strings": .3, "perc": .22}
    for st in STEMS:
        x = reverb(render_stem(st, TOTAL), wet=wet[st])
        wavfile.write(os.path.join(out, f"{st}.wav"), SR, x.astype(np.float32))
        print(st, float(np.abs(x).max()))
    write_midi(os.path.join(out, "score.mid"))

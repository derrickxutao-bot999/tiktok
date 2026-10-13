"""Sample playback for the University of Iowa MIS recordings (see fetch_samples.py).

play()    one note: nearest recorded pitch, resampled; long notes are extended with overlapping
          grains from the steady part of the recording; `soft` darkens and slows the attack.
section() an ensemble: neighbouring recordings (different notes, re-pitched) layered with tiny
          detune, delay and stereo spread, so a solo violin becomes a violin section.
fx()      unpitched one-shots (cymbals, tam-tams).
"""
import glob
import os

import numpy as np

from synth import SR, band, rng

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "samples")
SUSTAINED = {"violin", "viola", "cello", "bass", "horn", "trombone", "trumpet", "bassoon", "clarinet", "flute"}
_NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8,
         "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
_banks, _fx = {}, {}


def midi(n):
    return n if isinstance(n, (int, float)) else 12 * (int(n[-1]) + 1) + _NOTE[n[:-1]]


def bank(inst):
    if inst not in _banks:
        d = {}
        for f in glob.glob(os.path.join(ROOT, inst, "*.npy")):
            x = np.load(f).astype(np.float64)
            if inst in SUSTAINED:
                g = .12 / (np.sqrt(np.mean(x[:, :int(min(x.shape[1], 1.5 * SR))] ** 2)) + 1e-9)
            else:
                g = .5 / (np.max(np.abs(x[:, :int(.5 * SR)])) + 1e-9)
            d[int(os.path.basename(f)[:-4])] = x * g
        if not d:
            raise SystemExit(f"no samples for {inst}: run python3 audio/fetch_samples.py")
        _banks[inst] = d
    return _banks[inst]


def fx(name, gain=1.0):
    if name not in _fx:
        x = np.load(os.path.join(ROOT, "fx", name + ".npy")).astype(np.float64)
        _fx[name] = x / (np.max(np.abs(x)) + 1e-9)
    return _fx[name] * gain


def _shift(x, ratio):
    if abs(ratio - 1) < 1e-5:
        return x
    idx = np.arange(int(x.shape[1] / ratio)) * ratio
    src = np.arange(x.shape[1])
    return np.stack([np.interp(idx, src, ch) for ch in x])


def _extend(x, need, head_s=.45):
    n = x.shape[1]
    if need <= n - int(.05 * SR):
        return x[:, :need]
    G = int(min(.5 * SR, (n * .85 - head_s * SR) * .9))
    G -= G % 2
    if G < 2000:                                   # recording too short to loop: hold the last part
        return np.pad(x, ((0, 0), (0, need - n)), mode="edge")
    H = G // 2
    a, b = int(head_s * SR * .7), int(n * .9) - G
    w = np.hanning(G)
    keep = int(head_s * SR) + H
    out = np.zeros((2, need + G))
    out[:, :keep] = x[:, :keep]
    out[:, keep - H:keep] *= w[H:]                 # the head fades out under the first grain
    p = keep - H
    while p < need:
        s = int(a + rng.random() * max(1, b - a))
        out[:, p:p + G] += x[:, s:s + G] * w
        p += H
    return out[:, :need]


def play(inst, note, dur, vel=1.0, rel=.4, soft=0.0, att=0.0, cents=0.0, natural=False, src=None):
    B = bank(inst)
    m = midi(note) + cents / 100
    k = src if src in B else min(B, key=lambda q: abs(q - m))
    x = _shift(B[k], 2 ** ((m - k) / 12))
    need = x.shape[1] if natural else int((dur + rel) * SR)
    x = _extend(x, need) if inst in SUSTAINED else np.pad(x, ((0, 0), (0, max(0, need - x.shape[1]))))[:, :need]
    env = np.ones(x.shape[1])
    na = int(att * SR)
    if na:
        env[:na] = np.linspace(0, 1, na) ** 1.6
    if not natural:
        nd, nr = int(dur * SR), int(rel * SR)
        if nr and nd < len(env):
            env[nd:nd + nr] *= .5 + .5 * np.cos(np.linspace(0, np.pi, len(env[nd:nd + nr])))
    y = x * env
    if soft > 0:
        y = np.stack([band(ch, 0, 16000 * (1 - soft) + 1800 * soft) for ch in y])
    return y * vel


def section(inst, note, dur, n=3, cents=7.0, spread=.6, **kw):
    B = bank(inst)
    m = midi(note)
    keys = sorted(B, key=lambda q: abs(q - m))[:n]
    out = None
    for i, k in enumerate(keys):
        c = ((i - (n - 1) / 2) * 2 * cents / max(1, n - 1)) + rng.normal(0, 1.5)
        y = play(inst, note, dur, cents=c, src=k, **kw)
        y = np.pad(y, ((0, 0), (int(rng.random() * .028 * SR), 0)))
        pan = (i / (n - 1) - .5) * spread if n > 1 else 0.0
        y = y * np.array([[np.cos((pan + 1) * np.pi / 4) * 1.414], [np.sin((pan + 1) * np.pi / 4) * 1.414]])
        if out is None:
            out = y
        else:
            L = max(out.shape[1], y.shape[1])
            out = np.pad(out, ((0, 0), (0, L - out.shape[1]))) + np.pad(y, ((0, 0), (0, L - y.shape[1])))
    return out / np.sqrt(n)

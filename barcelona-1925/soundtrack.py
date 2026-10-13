"""Synthesizes the 28.5 s soundtrack (score + sound design) to out/soundtrack.wav.

Everything is generated from scratch with numpy, so there are no licensing issues.
Cue times match the scene timeline in index.html.
"""
import os
import wave

import numpy as np

SR = 48000
DUR = 28.5
N = int(SR * DUR)
rng = np.random.default_rng(1925)
L = np.zeros(N)
R = np.zeros(N)


def t_axis(d):
    return np.arange(int(d * SR)) / SR


def add(sig, at, pan=0.0, gain=1.0):
    i = int(at * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    L[i : i + len(sig)] += sig * np.sqrt((1 - pan) / 2)
    R[i : i + len(sig)] += sig * np.sqrt((1 + pan) / 2)


def env(n, a, r, sustain=1.0):
    e = np.ones(n) * sustain
    na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, sustain, na) if na else e[:na]
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def fft_filter(x, lo=0, hi=SR / 2):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def hz(note):
    names = {"C": -9, "C#": -8, "D": -7, "Eb": -6, "E": -5, "F": -4, "F#": -3, "G": -2, "Ab": -1, "A": 0, "Bb": 1, "B": 2}
    n, o = note[:-1], int(note[-1])
    return 440 * 2 ** ((names[n] + (o - 4) * 12) / 12)


def pad(notes, d, a=1.2, r=1.5, bright=0.5):
    t = t_axis(d)
    s = np.zeros(len(t))
    for nt in notes:
        f = hz(nt)
        for det in (-0.12, 0.0, 0.12):
            ff = f * 2 ** (det / 12)
            for h in range(1, 6):
                s += np.sin(2 * np.pi * ff * h * t + rng.random() * 6.28) * (bright ** (h - 1)) / h
    s *= 0.5 + 0.5 * np.sin(2 * np.pi * 0.23 * t) * 0.3 + 0.35
    return s / (len(notes) * 9) * env(len(t), a, r)


def piano(note, d=2.4, vel=1.0):
    t = t_axis(d)
    f = hz(note)
    s = sum(np.sin(2 * np.pi * f * h * t * (1 + 0.0004 * h * h)) * np.exp(-t * (1.6 + h * 0.9)) / h for h in range(1, 8))
    return s * env(len(t), 0.004, 0.3) * vel * 0.35


def chime(f, d=1.6):
    t = t_axis(d)
    s = sum(np.sin(2 * np.pi * f * m * t) * np.exp(-t * (3 + m)) * g for m, g in ((1, 1), (2.76, 0.5), (5.4, 0.25), (8.9, 0.12)))
    return s * env(len(t), 0.002, 0.2) * 0.12


def noise(d):
    return rng.standard_normal(int(d * SR))


# ---------------- score ----------------
# S0/S1: warm A minor, period-feel
add(pad(["A2", "E3", "A3", "C4"], 8.6, a=0.8, r=1.2, bright=0.45), 0.0, gain=0.9)
add(piano("A4", 3), 0.2, -0.2, 0.6)
add(piano("E5", 3), 0.8, 0.2, 0.45)
# year lands at ~1.45s: low "bong"
add(piano("A2", 4, 1.2) + piano("A3", 4, 0.6), 1.45, 0, 1.0)
add(piano("C5", 2.5), 2.1, -0.3, 0.4)
add(piano("B4", 2.5), 2.6, 0.3, 0.35)

# S1: crowd murmur builds under the stadium shot
murmur = fft_filter(noise(5.4), 180, 1400)
murmur *= env(len(murmur), 1.4, 0.6) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * t_axis(5.4)) ** 2)
add(murmur * 0.10, 3.2, -0.3)
add(fft_filter(noise(5.4), 200, 1300) * env(int(5.4 * SR), 1.6, 0.6) * 0.10, 3.25, 0.3)

# anthem: brief, formal brass-like phrase (5.6s) that is drowned out
mel = [("A4", 0.30), ("A4", 0.15), ("C#5", 0.30), ("E5", 0.45), ("D5", 0.3)]
at = 5.6
for nt, d in mel:
    tt = t_axis(d + 0.1)
    f = hz(nt)
    saw = sum(np.sin(2 * np.pi * f * h * tt) / h for h in range(1, 10))
    add(saw * env(len(tt), 0.03, 0.08) * 0.07, at, 0.1)
    at += d

# whistles: dozens of piercing sweeps 6.0 - 8.3s
for _ in range(46):
    st = 5.95 + rng.random() * 2.2
    d = 0.25 + rng.random() * 0.6
    tt = t_axis(d)
    f0 = 2200 + rng.random() * 1600
    sweep = f0 * (1 + 0.08 * np.sin(2 * np.pi * (5 + rng.random() * 6) * tt)) * (1 - 0.15 * tt / d * rng.choice([-1, 1]))
    ph = 2 * np.pi * np.cumsum(sweep) / SR
    w = (np.sin(ph) + 0.15 * fft_filter(noise(d), 1500, 6000)) * env(len(tt), 0.03, 0.12)
    add(w * 0.035, st, rng.uniform(-0.8, 0.8))
roar = fft_filter(noise(2.6), 250, 3000) * env(int(2.6 * SR), 0.2, 0.5)
add(roar * 0.22, 5.95, 0)

# S2: seal slams (8.62)
tt = t_axis(1.8)
boom = np.sin(2 * np.pi * np.cumsum(38 + 90 * np.exp(-tt * 9)) / SR) * np.exp(-tt * 2.6)
add(boom * 0.9 + fft_filter(noise(1.8), 30, 900) * np.exp(-tt * 14) * 0.5, 8.62, 0)
# gate clang (9.42) & padlock click (9.7)
tt = t_axis(2.2)
clang = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * k) * g for f, k, g in ((187, 2.0, 1), (431, 2.6, .7), (742, 3.4, .5), (1213, 4.2, .35), (1889, 6, .2)))
add(clang * 0.16, 9.08, -0.3)
add(clang * 0.22, 9.42, 0.2)
tt = t_axis(0.12)
add(fft_filter(noise(0.12), 2000, 9000) * np.exp(-tt * 60) * 0.25, 9.72, 0)
# dark drone through the ban
drone = pad(["D2", "A2", "D3", "F3"], 10.6, a=0.6, r=2.5, bright=0.35)
add(drone * 1.1, 8.65, 0)

# S3: tick of the calendar, a sparse piano line, and coins (members' dues)
for i in range(6):
    tf = 13.6 + i * 0.82
    tt = t_axis(0.18)
    add(fft_filter(noise(0.18), 1500, 8000) * np.exp(-tt * 28) * 0.12, tf, -0.4)
line = ["D4", "F4", "A4", "G4", "F4", "E4", "F4", "A4"]
for i, nt in enumerate(line):
    add(piano(nt, 2.4, 0.8), 13.05 + i * 0.75, 0.15 * (-1) ** i, 0.8)
gold_times = np.sort(13.5 + 5.3 * np.sqrt(rng.random(70)))
for g in gold_times:
    add(chime(rng.choice([1568, 1760, 2093, 2349, 2637])), g, rng.uniform(-0.7, 0.7), 0.6)

# S4: rising warmth as the city lights up
add(pad(["F2", "C3", "F3", "A3", "C4"], 2.4, a=0.6, r=0.6, bright=0.5), 19.0, 0, 0.95)
add(pad(["C3", "G3", "C4", "E4"], 2.2, a=0.5, r=0.4, bright=0.55), 21.3, 0, 0.95)
for i in range(16):
    add(chime([2093, 2349, 2637, 3136][i % 4], 1.2), 19.7 + i * 0.2, (-1) ** i * 0.5, 0.5)
riser = fft_filter(noise(1.6), 600, 7000) * np.linspace(0, 1, int(1.6 * SR)) ** 2
add(riser * 0.12, 21.8, 0)

# S5: resolution - full C major with crowd cheer
add(pad(["C2", "G2", "C3", "E3", "G3", "C4", "E4"], 5.2, a=0.08, r=2.4, bright=0.6), 23.4, 0, 1.25)
for nt, dt in (("C5", 0.0), ("E5", 0.25), ("G5", 0.5), ("C6", 0.9), ("G5", 2.0), ("E5", 2.4), ("C5", 3.0)):
    add(piano(nt, 3, 0.9), 23.45 + dt, 0.2, 0.75)
cheer = fft_filter(noise(5.0), 300, 4000) * env(int(5.0 * SR), 0.25, 2.5)
add(cheer * 0.16, 23.5, -0.2)
add(fft_filter(noise(5.0), 280, 3800) * env(int(5.0 * SR), 0.3, 2.5) * 0.16, 23.55, 0.2)

# ---------------- mix: reverb + master ----------------
def reverb(x, secs=2.2, wet=0.28):
    ir = rng.standard_normal(int(secs * SR)) * np.exp(-np.linspace(0, 7, int(secs * SR)))
    ir = fft_filter(ir, 150, 7000)
    ir /= np.sqrt(np.sum(ir ** 2))
    n = len(x) + len(ir)
    y = np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)[: len(x)]
    return x * (1 - wet) + y * wet


L, R = reverb(L), reverb(R)
st = np.stack([L, R])
fade = np.ones(N)
fade[-int(0.6 * SR):] = np.linspace(1, 0, int(0.6 * SR))
st *= fade
st = np.tanh(st / np.max(np.abs(st)) * 1.6) / np.tanh(1.6) * 0.89  # soft limiter
os.makedirs("out", exist_ok=True)
with wave.open("out/soundtrack.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((st.T * 32767).astype(np.int16).tobytes())
print("out/soundtrack.wav written")

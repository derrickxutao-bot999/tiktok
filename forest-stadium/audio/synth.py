"""Additive-synthesis instrument kit for soundtrack.py (numpy only, everything generated from scratch)."""
import numpy as np

SR = 48000
rng = np.random.default_rng(23)
_NOTE = {"C": -9, "C#": -8, "Db": -8, "D": -7, "D#": -6, "Eb": -6, "E": -5, "F": -4, "F#": -3,
         "Gb": -3, "G": -2, "G#": -1, "Ab": -1, "A": 0, "A#": 1, "Bb": 1, "B": 2}


def hz(n, shift=0):
    return 440.0 * 2 ** ((_NOTE[n[:-1]] + (int(n[-1]) - 4 + shift) * 12) / 12)


def tt(d):
    return np.arange(int(d * SR)) / SR


def adsr(n, a, d, s, r):
    e = np.full(n, float(s))
    na = min(int(a * SR), n)
    if na:
        e[:na] = np.linspace(0, 1, na, endpoint=False)
    nd = min(int(d * SR), n - na)
    if nd:
        e[na:na + nd] = np.linspace(1, s, nd, endpoint=False)
    nr = min(int(r * SR), n)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def band(x, lo=0.0, hi=SR / 2):
    """Smooth 4th-order-ish band filter in the frequency domain (no ringing)."""
    X = np.fft.rfft(x)
    f = np.maximum(np.fft.rfftfreq(len(x), 1 / SR), 1.0)
    g = np.ones_like(f)
    if lo > 0:
        g /= 1 + (lo / f) ** 4
    if hi < SR / 2:
        g /= 1 + (f / hi) ** 4
    return np.fft.irfft(X * g, len(x))


def noise(d):
    return rng.standard_normal(int(d * SR))


def _vib_phase(f, t, depth, rate=5.2, delay=0.5):
    inst = f * (1 + depth * np.sin(2 * np.pi * rate * t + rng.random() * 6.28) * np.minimum(1, t / delay))
    return 2 * np.pi * np.cumsum(inst) / SR


# ---------------- pitched instruments ----------------
def celesta(f, d=2.6, vel=1.0):
    t = tt(d)
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t * 2.0) + .45 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 3.6)
         + .16 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t * 6) + .07 * np.sin(2 * np.pi * f * 4.2 * t) * np.exp(-t * 9))
    return s * np.minimum(1, t / .004) * vel * .28


def piano(f, d=3.0, vel=1.0):
    t = tt(d)
    s = np.zeros_like(t)
    for h in range(1, 10):
        fh = f * h * np.sqrt(1 + .0004 * h * h)
        if fh > 9000:
            break
        s += np.sin(2 * np.pi * fh * t + rng.random() * .3) * np.exp(-t * (.8 + .5 * h)) / h ** 1.15
    s *= np.minimum(1, t / .003) * (1 - np.clip((t - (d - .3)) / .3, 0, 1))
    return s * vel * .3


def strings(f, d, a=.9, r=1.2, bright=.55, voices=3, vel=1.0):
    t = tt(d)
    s = np.zeros_like(t)
    for v in range(voices):
        ff = f * 2 ** ((v - (voices - 1) / 2) * .09 / 12)
        ph = _vib_phase(ff, t, .0035)
        for h in range(1, 14):
            if ff * h > 7000:
                break
            s += np.sin(h * ph + rng.random() * 6.28) * bright ** (h - 1) / h
    return s / voices * adsr(len(t), a, .2, .9, r) * vel * .2


FORMANTS = {"ah": [(800, 140, 1.0), (1150, 170, .55), (2800, 260, .2), (3500, 320, .1)],
            "oo": [(360, 110, 1.0), (750, 150, .3), (2400, 260, .05)]}


def choir(f, d, vowel="ah", voices=6, a=.35, r=.8, vel=1.0):
    t = tt(d)
    out = np.zeros_like(t)
    for _ in range(voices):
        ff = f * 2 ** ((rng.random() * 2 - 1) * 9 / 1200)
        ph = _vib_phase(ff, t, .006, 4.6 + rng.random() * 1.4, .6)
        for h in range(1, 48):
            fh = ff * h
            if fh > 5200:
                break
            amp = sum(g * np.exp(-((fh - F) / bw) ** 2) for F, bw, g in FORMANTS[vowel]) + .015 / h
            if amp > .004:
                out += amp * np.sin(h * ph + rng.random() * 6.28) / h ** .3
    breath = band(noise(d), 900, 5000) * .012
    return (out / voices * .16 + breath) * adsr(len(t), a, .25, .85, r) * vel


def brass(f, d, a=.06, r=.45, vel=1.0):
    t = tt(d)
    bright = np.minimum(1, t / .14) * .55 + .2
    s = np.zeros_like(t)
    for h in range(1, 22):
        if f * h > 6500:
            break
        s += np.sin(2 * np.pi * f * h * t + rng.random() * 6) * bright ** (h - 1) / h ** .75
    return s * adsr(len(t), a, .2, .8, r) * vel * .09


def bell(f, d=6.0, vel=1.0):
    t = tt(d)
    s = sum(np.sin(2 * np.pi * f * m * t + rng.random() * 6) * np.exp(-t * k) * g
            for m, k, g in ((.5, .35, .6), (1, .5, 1), (1.19, .9, .5), (1.5, .8, .4), (2, 1.1, .35), (2.52, 1.6, .2), (3.0, 2.2, .15)))
    return s * np.minimum(1, t / .002) * vel * .18


# ---------------- percussion & sound design ----------------
def boom(d=3.0, f0=60, f1=32, vel=1.0):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t * 5)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    s += band(noise(d), 20, 380) * np.exp(-t * 9) * .45
    return s * vel * .85


def timpani(f=98, d=2.2, vel=1.0):
    t = tt(d)
    s = sum(np.sin(2 * np.pi * f * m * t) * np.exp(-t * (1.5 + m)) * g for m, g in ((1, 1), (1.5, .5), (1.98, .32), (2.44, .18)))
    s += band(noise(d), 60, 1200) * np.exp(-t * 26) * .3
    return s * vel * .45


def cymbal(d=3.0, vel=1.0, swell=False):
    t = tt(d)
    n = band(noise(d), 3500, 16000)
    env = (t / d) ** 2 if swell else np.exp(-t * 1.4)
    return n * env * vel * .07


def clink(vel=1.0):
    t = tt(.7)
    s = sum(np.sin(2 * np.pi * f * t + rng.random() * 6) * np.exp(-t * k) * g for f, k, g in ((2400, 12, 1), (3710, 16, .6), (5230, 22, .4), (6900, 30, .25)))
    s += band(noise(.7), 3000, 12000) * np.exp(-t * 80) * .5
    return s * vel * .1


def scrape(d=.22, vel=1.0):
    t = tt(d)
    return band(noise(d), 900, 6000) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** .7 * vel * .07


def heartbeat(vel=1.0):
    out = np.zeros(int(.7 * SR))
    for off, g in ((0, 1.0), (.27, .65)):
        t = tt(.32)
        f = 36 + 32 * np.exp(-t * 30)
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 13) * g
        i = int(off * SR)
        out[i:i + len(s)] += s
    return out * vel * .8


def plip(vel=1.0):
    t = tt(.6)
    f = 480 + 950 * np.exp(-t * 55)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 10)
    s += band(noise(.6), 1500, 9000) * np.exp(-t * 90) * .3
    return s * vel * .32


def spark(vel=1.0):
    t = tt(.9)
    s = band(noise(.9), 2000, 9000) * np.exp(-t * 9) * .5 + band(noise(.9), 60, 500) * np.minimum(1, t / .08) * np.exp(-t * 4) * .5
    return s * vel * .3


def riser(d, lo=250, hi=6500, vel=1.0):
    t = tt(d)
    n = noise(d)
    out = np.zeros_like(t)
    for i, fc in enumerate(np.geomspace(lo, hi, 8)):
        out += band(n, fc * .7, fc * 1.4) * np.exp(-((t / d * 7 - i) ** 2) / 1.4)
    return out * (t / d) ** 1.6 * vel * .45


def wind(d, vel=1.0):
    t = tt(d)
    mod = .6 + .4 * np.sin(2 * np.pi * .13 * t + 1) * np.sin(2 * np.pi * .071 * t + .4)
    return band(noise(d), 70, 650) * mod * vel * .05


def crowd(d, vel=1.0):
    t = tt(d)
    mod = .75 + .25 * np.sin(2 * np.pi * .45 * t) * np.sin(2 * np.pi * .17 * t + 1)
    return (band(noise(d), 260, 3200) + .5 * band(noise(d), 120, 600)) * mod * vel * .1


def hum(d, vel=1.0):
    t = tt(d)
    return sum(np.sin(2 * np.pi * 50 * k * t) / k for k in (1, 2, 3, 4, 6)) * vel * .008


# ---------------- space ----------------
def reverb_ir(secs, seed, damp=6.5):
    r = np.random.default_rng(seed)
    n = int(secs * SR)
    ir = r.standard_normal(n) * np.exp(-np.linspace(0, damp, n))
    ir = band(ir, 140, 7500)
    ir[:int(.012 * SR)] *= np.linspace(0, 1, int(.012 * SR))
    return ir / np.sqrt(np.sum(ir ** 2))


def convolve(x, ir):
    n = len(x) + len(ir)
    N = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, N) * np.fft.rfft(ir, N), N)[:len(x)]

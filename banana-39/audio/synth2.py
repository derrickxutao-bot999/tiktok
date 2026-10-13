"""Extra synthesis for 一根香蕉的39年: house drums, a TB-303 style acid bass, organ, pulse, and period sound design."""
import numpy as np

from synth import SR, adsr, band, noise, rng, tt


# ---------------- drums ----------------
def kick(vel=1.0, punch=1.0):
    t = tt(.5)
    f = 46 + 110 * np.exp(-t * 32 * punch)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)
    s += band(noise(.5), 1500, 9000) * np.exp(-t * 220) * .35
    return np.tanh(s * 1.6) * vel * .55


def snare(vel=1.0):
    t = tt(.4)
    tone = (np.sin(2 * np.pi * 185 * t) + .6 * np.sin(2 * np.pi * 330 * t)) * np.exp(-t * 26)
    nz = band(noise(.4), 1200, 9000) * np.exp(-t * 17)
    return (tone * .5 + nz) * vel * .3


def clap(vel=1.0):
    t = tt(.45)
    env = np.zeros_like(t)
    for d in (0, .011, .023):
        env += np.exp(-np.clip(t - d, 0, None) * 160) * (t >= d)
    env += np.exp(-t * 14) * .35
    return band(noise(.45), 900, 6000) * env * vel * .28


def hat(vel=1.0, open_=False):
    d = .35 if open_ else .06
    t = tt(d)
    return band(noise(d), 7000, 16000) * np.exp(-t * (11 if open_ else 70)) * vel * .16


def shaker(vel=1.0):
    t = tt(.09)
    return band(noise(.09), 4000, 11000) * np.sin(np.pi * np.clip(t / .09, 0, 1)) ** 2 * vel * .09


def tamb(vel=1.0):
    t = tt(.3)
    s = band(noise(.3), 6000, 14000) * np.exp(-t * 14)
    s += sum(np.sin(2 * np.pi * f * t + rng.random() * 6) * np.exp(-t * 18) for f in (5800, 7300, 8900)) * .1
    return s * vel * .14


def tom(f=110, vel=1.0):
    t = tt(.8)
    ff = f * (1 + .6 * np.exp(-t * 18))
    return np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t * 5) * vel * .5


# ---------------- tonal synths ----------------
def acid(notes, step, cutoff=(300, 2600), reso=.88, vel=1.0):
    """TB-303 style line. notes: list of (freq or None, accent, slide) per 16th step."""
    n = int(len(notes) * step * SR)
    out = np.zeros(n)
    phase, f_cur = 0.0, 110.0
    lp = bp = 0.0
    seg = int(step * SR)
    for i, (f, acc, slide) in enumerate(notes):
        if f is None:
            continue
        a, b = i * seg, min(n, (i + 1) * seg + int(.02 * SR))
        f0 = f_cur
        for j in range(a, b):
            k = (j - a) / SR
            f_cur = f0 + (f - f0) * min(1, k / .06) if slide else f
            phase += f_cur / SR
            x = 2 * (phase - np.floor(phase)) - 1                       # saw
            env = np.exp(-k * (9 if acc else 14))
            fc = cutoff[0] + (cutoff[1] - cutoff[0]) * env * (1.3 if acc else .8)
            g = 2 * np.sin(np.pi * min(fc, 9000) / SR)
            hp = x - lp - (1 - reso) * 2 * bp
            bp += g * hp
            lp += g * bp
            out[j] += np.tanh(lp * 1.8) * (1.0 if acc else .7) * min(1, k / .003) * (1 - max(0, (k - step * .85) / (step * .3)) if not slide else 1)
    return out * vel * .3


def organ(f, d, vel=1.0):
    t = tt(d)
    s = sum(a * np.sin(2 * np.pi * f * m * t + rng.random() * 6) for m, a in ((.5, .5), (1, 1), (1.5, .55), (2, .7), (3, .3), (4, .25)))
    s *= 1 + .12 * np.sin(2 * np.pi * 6.2 * t)
    return s * adsr(len(t), .005, .1, .8, .08) * vel * .06


def pulse(f, d, vel=1.0, bright=.5):
    t = tt(d)
    s = np.zeros_like(t)
    for det in (-.08, 0, .08):
        ff = f * 2 ** (det / 12)
        for h in range(1, 18):
            if ff * h > 8000:
                break
            s += np.sin(2 * np.pi * ff * h * t + rng.random() * 6) * bright ** (h - 1) / h
    return s * adsr(len(t), .01, .15, .6, .12) * vel * .07


def pad(fs, d, vel=1.0, a=1.2, r=1.5):
    t = tt(d)
    s = np.zeros_like(t)
    for f in fs:
        for det in (-.12, -.04, .04, .12):
            ff = f * 2 ** (det / 12)
            for h in range(1, 8):
                s += np.sin(2 * np.pi * ff * h * t + rng.random() * 6) * .5 ** (h - 1) / h
    return s / (len(fs) * 4) * adsr(len(t), a, .3, .9, r) * vel * .2


# ---------------- sound design ----------------
def rewind(d):
    t = tt(d)
    s = np.zeros_like(t)
    for k in range(6):
        f = 1800 + 1400 * np.sin(2 * np.pi * (3 + k * 1.7) * t + k) + 400 * k
        s += np.sin(2 * np.pi * np.cumsum(f) / SR) * (.4 + .6 * rng.random())
    s = s * .05 + band(noise(d), 1500, 9000) * .12 * (.6 + .4 * np.sin(2 * np.pi * 23 * t))
    return s * adsr(len(t), .05, .1, 1, .15)


def tape_clunk():
    t = tt(.35)
    return (np.sin(2 * np.pi * 90 * t) * np.exp(-t * 30) + band(noise(.35), 300, 4000) * np.exp(-t * 60) * .6) * .6


def hiss(d, vel=1.0):
    return band(noise(d), 3000, 14000) * .025 * vel


def rain(d, vel=1.0):
    t = tt(d)
    s = band(noise(d), 400, 9000) * .05
    drops = np.zeros(len(t))
    for _ in range(int(d * 40)):
        i = int(rng.random() * (len(t) - 2000))
        drops[i:i + 2000] += np.exp(-np.arange(2000) / 120) * (rng.random() - .5) * .4
    return (s + band(drops, 1500, 9000)) * vel


def tick(vel=1.0):
    t = tt(.08)
    return (band(noise(.08), 2500, 8000) * np.exp(-t * 300) + np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 120) * .3) * vel * .35


def rustle(d, vel=1.0):
    t = tt(d)
    env = np.abs(band(noise(d), 0.5, 18)) * 6
    return band(noise(d), 1200, 9000) * np.clip(env, 0, 1) * .08 * vel


def whistle(d=.6, f=2900, vel=1.0, trill=True):
    t = tt(d)
    fm = f * (1 + (.03 * np.sign(np.sin(2 * np.pi * 34 * t)) if trill else .004 * np.sin(2 * np.pi * 6 * t)))
    s = np.sin(2 * np.pi * np.cumsum(fm) / SR) + band(noise(d), 2000, 6000) * .2
    return s * adsr(len(t), .01, .05, .9, .08) * vel * .12


def claps(d, bpm, vel=1.0, people=40):
    """a crowd clapping on the beat"""
    out = np.zeros(int(d * SR))
    beat = 60 / bpm
    for b in np.arange(0, d, beat):
        for _ in range(people):
            i = int((b + rng.normal(0, .018)) * SR)
            if 0 <= i < len(out) - 3000:
                out[i:i + 3000] += band(noise(3000 / SR), 900, 5000) * np.exp(-np.arange(3000) / 220) * (.5 + rng.random())
    return out / np.sqrt(people) * .1 * vel


def boos(d, vel=1.0):
    t = tt(d)
    s = np.zeros_like(t)
    for _ in range(18):
        f0 = 140 + rng.random() * 120
        f = f0 * (1 - .18 * np.clip(t / d, 0, 1)) * (1 + .01 * np.sin(2 * np.pi * (4 + rng.random() * 3) * t))
        ph = 2 * np.pi * np.cumsum(f) / SR
        s += sum(np.sin(h * ph) * np.exp(-((f0 * h - 380) / 220) ** 2) for h in range(1, 8))
    return band(s, 80, 1500) * adsr(len(t), .4, .2, .9, .8) * .02 * vel

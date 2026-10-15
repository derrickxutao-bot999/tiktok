# Segment 1 v2 soundtrack -> out/film.wav (76 s): the interview, rain, foley,
# the TV crowd through each era's speaker, crickets / wind, and the score
# (out/score.wav from score.py). Times match film.js.
import subprocess, wave, numpy as np
SR, D = 48000, 76.0
rng = np.random.default_rng(7)
n = int(D * SR); t = np.arange(n) / SR; out = np.zeros((n, 2), np.float32)

def load(p, start=0.0, dur=None):
    cmd = ["ffmpeg", "-v", "error", "-ss", str(start), "-i", p] + (["-t", str(dur)] if dur else []) + ["-f", "s16le", "-ac", "2", "-ar", str(SR), "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.int16).reshape(-1, 2).astype(np.float32) / 32768
def filt(x, lo=0, hi=None, order=4):
    X = np.fft.rfft(x, axis=0); f = np.fft.rfftfreq(len(x), 1 / SR); g = np.ones_like(f)
    if hi: g *= 1 / (1 + (f / hi) ** order)
    if lo: g *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** order)
    return np.fft.irfft(X * g[:, None], n=len(x), axis=0).astype(np.float32)
def ease(u): u = np.clip(u, 0, 1); return u * u * (3 - 2 * u)
def env(a, b, c, d): return ease((t - a) / max(b - a, 1e-3)) * (1 - ease((t - c) / max(d - c, 1e-3)))
def rms(x): return float(np.sqrt((x ** 2).mean()) + 1e-9)
def place(x, at, gain=1.0, pan=0.0):
    i = int(at * SR); x = x[: max(0, n - i)]
    out[i:i + len(x), 0] += x[:, 0] * gain * (1 - max(0, pan)); out[i:i + len(x), 1] += x[:, 1] * gain * (1 + min(0, pan))
def looped(x, need, xf=1.0):
    k = int(xf * SR); fade = np.sqrt(np.linspace(0, 1, k))[:, None]; y = x.copy()
    while len(y) < need: y = np.concatenate([y[:-k], y[-k:] * fade[::-1] + x[:k] * fade, x[k:]])
    return y[:need]
def room(x):
    r = filt(x, 120, 3200)
    ir = np.exp(-np.arange(int(0.35 * SR)) / (0.07 * SR)) * rng.standard_normal(int(0.35 * SR)) * 0.05
    return (r + np.stack([np.convolve(r[:, c], ir)[:len(r)] for c in range(2)], 1)) * 0.62

# ---------------------------------------------------------------- the interview, twice
clip = load("footage/clip.wav")
a = clip[: int(9.4 * SR)]; ta = np.arange(len(a)) / SR; p = ease((ta - 2.2) / 3.8)[:, None]
a = (a * (1 - p) + room(a) * p * 1.6) * 1.15; a[-300:] *= np.linspace(1, 0, 300)[:, None]; place(a, 0)
b = room(clip[int(3.3 * SR): int(9.4 * SR)]) * 1.55; b[:int(0.25 * SR)] *= np.linspace(0, 1, int(0.25 * SR))[:, None]; b[-300:] *= np.linspace(1, 0, 300)[:, None]
place(b, 62.5)

# ---------------------------------------------------------------- outside the window
A = filt(looped(load("audio/rain_on_window_loop.wav"), n), 0, 7000)
B = filt(load("audio/rain_ylmir_3.ogg", 5, 40), 0, 2500); B = looped(B, n)
rain = A / rms(A) * 0.03 + B / rms(B) * 0.012
re = (0.35 + 0.65 * ease((t - 2.0) / 4.0)) * (1 + 0.3 * env(9.4, 10.0, 32.6, 33.0))
re *= 1 - env(33.4, 34.8, 59.5, 61.5)                      # 1999 and 2008 are dry nights
re *= 1 + 0.3 * ease((t - 68.6) / 0.6)
out += rain * (re * ease(t / 0.5))[:, None]
cr = np.zeros(n, np.float32)                                # crickets, 1999
for k in range(3):
    f0, rate, ph = 4300 + 350 * k, 2.6 + 0.5 * k, rng.random()
    chirp = (np.sin(2 * np.pi * (t * rate + ph)) > 0.55).astype(np.float32)
    cr += np.sin(2 * np.pi * f0 * t) * filt(np.stack([chirp, chirp], 1), 0, 120)[:, 0] * (0.5 + 0.5 * np.sin(2 * np.pi * 55 * t)) * 0.005
ce = env(34.8, 36.0, 48.8, 49.8); out += np.stack([cr * ce, np.roll(cr, 900) * ce], 1)
wn = filt(rng.standard_normal((n, 2)).astype(np.float32), 80, 900) * 0.045      # wind in the trees, 2008
lv = filt(rng.standard_normal((n, 2)).astype(np.float32), 2500, 7000) * 0.01
gust = 0.55 + 0.45 * np.sin(2 * np.pi * 0.23 * t) * np.sin(2 * np.pi * 0.11 * t + 1)
we = env(50.4, 51.4, 59.4, 61.0); out += (wn * gust[:, None] + lv * (gust ** 2)[:, None]) * we[:, None]

# ---------------------------------------------------------------- the TV crowd, through the set's speaker
amb = load("audio/crowd_ambience.mp3", 3.0, 18); roar = load("audio/crowd_roar.mp3", 5.6, 8.0)
amb *= 0.14 / rms(amb); roar *= 0.14 / rms(roar)
def tvset(x, lo, hi, drive):
    y = filt(x.mean(1, keepdims=True).repeat(2, 1), lo, hi); return np.tanh(y * drive) / drive
for (start, goal, end, lo, hi, drive, g, muffle) in [(32.8, 45.0, 49.4, 250, 4500, 2.5, 0.085, None),
                                                     (50.8, 54.0, 59.0, 450, 6000, 1.6, 0.075, 56.5)]:
    L = int((end - start) * SR); x = tvset(looped(amb, L), lo, hi, drive)[:L]; tx = np.arange(L) / SR
    e = ease(tx / 0.6) * (1 - ease((tx - (L / SR - 1.0)) / 1.0)) * (1 - 0.5 * ease((tx - (goal - start)) / 0.4))
    r = np.zeros_like(x); rr_ = tvset(roar, lo, hi, drive); k = int((goal - 0.05 - start) * SR); r[k:k + len(rr_)] = rr_[: L - k]
    tr = (np.arange(L) / SR - (goal - start)); r *= (ease(tr / 0.25) * (1 - ease((tr - 3.2) / 1.2)))[:, None] * 2.6
    y = (x * e[:, None] + r)
    if muffle: y = y * (1 - ease((tx - (muffle - start)) / 1.6))[:, None] + filt(y, 0, 600) * ease((tx - (muffle - start)) / 1.6)[:, None] * 0.8
    place(y, start, g)

# ---------------------------------------------------------------- foley
def sample(name, gain=1.0, at=0.0, pan=0.0, lo=0, hi=None):
    x = load(f"audio/{name}.wav"); x = filt(x, lo, hi) if (lo or hi) else x; place(x / (np.abs(x).max() + 1e-9), at, gain, pan)
def step(at, gain, dark=900, pan=0.0):
    k = np.arange(int(0.12 * SR)); thump = np.sin(2 * np.pi * 75 * k / SR) * np.exp(-k / (0.025 * SR))
    scuff = filt(np.stack([rng.standard_normal(len(k))] * 2, 1).astype(np.float32), 100, dark)[:, 0] * np.exp(-k / (0.018 * SR)) * 2
    x = (thump + scuff).astype(np.float32); place(np.stack([x, x], 1), at, gain, pan)
def click(at, f, d, g):
    k = np.arange(int(d * SR)); s = (np.sin(2 * np.pi * f * k / SR) * np.exp(-k / (0.004 * SR)) * g).astype(np.float32); place(np.stack([s, s], 1), at)
def whoosh(at, d, g):
    k = np.arange(int(d * SR)); u = k / len(k); x = rng.standard_normal(len(k)).astype(np.float32) * np.sin(np.pi * u) ** 2
    x = filt(np.stack([x, x], 1), 300, 2500) * g; place(x, at)
def tv_off(at): sample("switch_off", 0.10, at - 0.1, hi=6000); click(at, 900, 0.05, 0.2); click(at, 70, 0.12, 0.22)

tv_off(9.4)
sample("floor_creak1", 0.10, 14.65, -0.2, hi=3000)                                 # he gets up
for i, at in enumerate([15.95, 16.45, 16.95, 17.4]): step(at, 0.09 - 0.012 * i, pan=0.25)
sample("door_creak_open", 0.11, 17.35, 0.4)
for i, at in enumerate([18.85, 19.15]): step(at, 0.05 - 0.012 * i, dark=600, pan=0.4)
sample("door_creak_close", 0.08, 19.35, 0.4); sample("door_close", 0.16, 20.05, 0.4, hi=2500)
for i, at in enumerate([22.9, 23.15, 23.4, 23.65]): step(at, 0.02 + 0.006 * i, dark=500, pan=0.0)   # small feet in the corridor
sample("door_creak_open", 0.12, 23.75, 0.0)
for i, at in enumerate([24.5, 24.8, 25.1]): step(at, 0.035 + 0.01 * i, dark=1200)
for i, at in enumerate(np.arange(26.5, 28.0, 0.3)): step(at, 0.03 + 0.008 * i, dark=1200, pan=0.2)
sample("floor_creak1", 0.07, 28.05, 0.0, hi=3500); click(28.1, 60, 0.16, 0.12)       # hop onto the sofa
click(29.55, 2400, 0.02, 0.05)                                                     # picks up the remote
sample("switch_on", 0.10, 32.1, 0.0, hi=6000)                                      # the small thumb
click(32.6, 110, 0.18, 0.18)                                                       # the old set: thunk, line whine, static
k = np.arange(int(1.4 * SR)); wh = (np.sin(2 * np.pi * 15600 * k / SR) * np.exp(-k / (0.6 * SR)) * 0.004).astype(np.float32); place(np.stack([wh, wh], 1), 32.6)
st = filt(rng.standard_normal((int(0.5 * SR), 2)).astype(np.float32), 1500, 8000) * 0.03 * np.linspace(1, 0, int(0.5 * SR))[:, None]; place(st, 32.62)
for at in [45.05, 45.62, 46.1, 54.05, 54.6]: click(at, 60, 0.18, 0.15); sample("floor_creak1", 0.03, at + 0.05, hi=2500)
whoosh(49.45, 1.1, 0.12)                                                           # across the night sky
tv_off(68.6)

# ---------------------------------------------------------------- score
sc = load("out/score.wav"); place(sc[:n], 0, 0.5)

out *= 1 - ease((t - (D - 0.8)) / 0.8)[:, None]
out *= 0.89 / np.abs(out).max()
w = wave.open("out/film.wav", "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
print("ok")

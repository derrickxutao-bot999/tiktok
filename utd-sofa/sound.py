# Segment 1 soundtrack -> out/seg1.wav (47 s). Times match seg1.js.
# 2026: the interview (dry, then "in the room"), rain, the remote, the door.
# 1999: CRT crowd, crickets outside, the winner and the sofa bouncing.
# 2008: laptop crowd, wind in the trees, the penalty save.
# 2026 again: rain, the same interview, the same click.
# Piano ("Danse Morialta", Kevin MacLeod) from the child at the door to the end of 2008.
import subprocess, wave, numpy as np
SR, D = 48000, 47.0
rng = np.random.default_rng(7)
n = int(D * SR); t = np.arange(n) / SR; out = np.zeros((n, 2), np.float32)
T = dict(off1=9.4, rise=12.6, doorA=14.3, doorB=15.9, doorShut=16.7, kidDoor=19.3, kidWalk=20.4, kidSit=21.9,
         tvOn=23.0, goal99=26.0, to08=29.0, goal08=32.0, alone=35.0, to26=36.2, clip2=37.0, off2=43.1)

def load(p, start=0.0, dur=None):
    cmd = ["ffmpeg", "-v", "error", "-ss", str(start), "-i", p] + (["-t", str(dur)] if dur else []) + ["-f", "s16le", "-ac", "2", "-ar", str(SR), "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).reshape(-1, 2).astype(np.float32) / 32768
def filt(x, lo=0, hi=None, order=4):
    X = np.fft.rfft(x, axis=0); f = np.fft.rfftfreq(len(x), 1 / SR); g = np.ones_like(f)
    if hi: g *= 1 / (1 + (f / hi) ** order)
    if lo: g *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** order)
    return np.fft.irfft(X * g[:, None], n=len(x), axis=0).astype(np.float32)
def ease(u): u = np.clip(u, 0, 1); return u * u * (3 - 2 * u)
def env(a, b, c, d):  # 0 before a, up a->b, hold, down c->d
    return ease((t - a) / max(b - a, 1e-3)) * (1 - ease((t - c) / max(d - c, 1e-3)))
def rms(x): return float(np.sqrt((x ** 2).mean()) + 1e-9)
def place(x, at, gain=1.0, pan=0.0):
    i = int(at * SR); x = x[: max(0, n - i)]
    out[i:i + len(x), 0] += x[:, 0] * gain * (1 - max(0, pan)); out[i:i + len(x), 1] += x[:, 1] * gain * (1 + min(0, pan))
def looped(x, need, xf=1.0):
    k = int(xf * SR); fade = np.sqrt(np.linspace(0, 1, k))[:, None]; y = x.copy()
    while len(y) < need: y = np.concatenate([y[:-k], y[-k:] * fade[::-1] + x[:k] * fade, x[k:]])
    return y[:need]
def room(x, amount=1.0):  # a small speaker across a room
    r = filt(x, 120, 3200)
    ir = np.exp(-np.arange(int(0.35 * SR)) / (0.07 * SR)) * rng.standard_normal(int(0.35 * SR)) * 0.05
    r = r + np.stack([np.convolve(r[:, c], ir)[:len(r)] for c in range(2)], 1)
    return x * (1 - amount) + r * amount * 0.62

# ---------------------------------------------------------------- the interview, twice
clip = load("footage/clip.wav")
a = clip[: int(T["off1"] * SR)]; ta = np.arange(len(a)) / SR
p = ease((ta - 4.0) / 3.6)[:, None]; a = a * (1 - p) + room(a) * p
a[-300:] *= np.linspace(1, 0, 300)[:, None]; place(a, 0)
b = room(clip[int(3.3 * SR): int(9.4 * SR)]) * 0.9; b[-300:] *= np.linspace(1, 0, 300)[:, None]
b[:int(0.3 * SR)] *= np.linspace(0, 1, int(0.3 * SR))[:, None]; place(b, T["clip2"])

# ---------------------------------------------------------------- weather outside
A = filt(looped(load("audio/rain_on_window_loop.wav"), n), 0, 7000)
B = filt(load("audio/rain_ylmir_3.ogg", 5, D), 0, 2500); B = np.pad(B, ((0, max(0, n - len(B))), (0, 0)))[:n]
rain = A / rms(A) * 0.03 + B / rms(B) * 0.012
rain_env = (0.3 + 0.7 * ease((t - 3.5) / 4.0)) * (1 + 0.3 * env(T["off1"], T["off1"] + 0.6, T["tvOn"], T["tvOn"] + 0.1))
rain_env *= (1 - env(T["tvOn"], T["tvOn"] + 0.8, T["to26"], T["to26"] + 1.0))          # gone in 1999 / 2008, back in 2026
rain_env *= 1 + 0.3 * ease((t - T["off2"]) / 0.6)
rain_env *= ease(t / 0.4) * (1 - ease((t - (D - 1.2)) / 1.2))
out += rain * rain_env[:, None]

# 1999: crickets on a clear night
cr = np.zeros(n, np.float32)
for k in range(3):
    f0, rate, ph = 4300 + 350 * k, 2.6 + 0.5 * k, rng.random()
    chirp = (np.sin(2 * np.pi * (t * rate + ph)) > 0.55).astype(np.float32)
    trill = 0.5 + 0.5 * np.sin(2 * np.pi * 55 * t)
    cr += np.sin(2 * np.pi * f0 * t) * filt(np.stack([chirp, chirp], 1), 0, 120)[:, 0] * trill * 0.006
cr_env = env(T["tvOn"] + 0.3, T["tvOn"] + 1.5, T["to08"], T["to08"] + 0.8)
out += np.stack([cr * cr_env, np.roll(cr, 900) * cr_env], 1)

# 2008: wind in the trees, in gusts
wn = filt(rng.standard_normal((n, 2)).astype(np.float32), 80, 900) * 0.05
leaves = filt(rng.standard_normal((n, 2)).astype(np.float32), 2500, 7000) * 0.012
gust = 0.55 + 0.45 * np.sin(2 * np.pi * 0.23 * t) * np.sin(2 * np.pi * 0.11 * t + 1)
w_env = env(T["to08"] + 0.2, T["to08"] + 1.2, T["to26"], T["to26"] + 0.9)
out += (wn * gust[:, None] + leaves * (gust ** 2)[:, None]) * w_env[:, None]

# ---------------------------------------------------------------- the TV crowd, through the set's speaker
amb = load("audio/crowd_ambience.mp3", 3.0, 16); roar = load("audio/crowd_roar.mp3", 5.6, 8.0)
amb *= 0.14 / rms(amb); roar *= 0.14 / rms(roar)   # keep the set's overdrive gentle so the roar can still rise
def tvset(x, lo, hi, drive):
    y = filt(x.mean(1, keepdims=True).repeat(2, 1), lo, hi)
    return np.tanh(y * drive) / drive
for (start, goal, end, lo, hi, drive, g) in [(T["tvOn"], T["goal99"], T["to08"], 250, 4500, 2.5, 0.11),
                                             (T["to08"] + 0.3, T["goal08"], T["to26"] - 0.4, 450, 6000, 1.6, 0.095)]:
    x = tvset(amb, lo, hi, drive)[: int((end - start) * SR)]; tx = np.arange(len(x)) / SR
    e = ease(tx / 0.5) * (1 - ease((tx - (len(x) / SR - 0.8)) / 0.8)) * (1 - 0.5 * ease((tx - (goal - start)) / 0.4))
    place(x * e[:, None], start, g)
    r = tvset(roar, lo, hi, drive); tr = np.arange(len(r)) / SR
    r *= (ease(tr / 0.25) * (1 - ease((tr - (end - goal - 0.8)) / 0.8)))[:, None]
    place(r[: int((end - goal) * SR)], goal - 0.05, g * 3.6)

# ---------------------------------------------------------------- foley
def sample(name, gain=1.0, at=0.0, pan=0.0, lo=0, hi=None):
    x = load(f"audio/{name}.wav"); x = filt(x, lo, hi) if (lo or hi) else x; place(x / (np.abs(x).max() + 1e-9), at, gain, pan)
def step(at, gain, dark=900, pan=0.0):
    k = np.arange(int(0.12 * SR)); thump = np.sin(2 * np.pi * 75 * k / SR) * np.exp(-k / (0.025 * SR))
    scuff = filt(np.stack([rng.standard_normal(len(k))] * 2, 1).astype(np.float32), 100, dark)[:, 0] * np.exp(-k / (0.018 * SR)) * 2
    x = (thump + scuff).astype(np.float32); place(np.stack([x, x], 1), at, gain, pan)
def click(at, f, d, g):
    k = np.arange(int(d * SR)); s = (np.sin(2 * np.pi * f * k / SR) * np.exp(-k / (0.004 * SR)) * g).astype(np.float32)
    place(np.stack([s, s], 1), at)

# first TV off
sample("switch_off", 0.10, 9.30, hi=6000); click(9.40, 900, 0.05, 0.2); click(9.40, 70, 0.12, 0.22)
# he gets up and leaves
sample("floor_creak1", 0.10, T["rise"], 0.2, hi=3000)
for i, at in enumerate([13.15, 13.75, 14.35]): step(at, 0.09 - 0.015 * i, pan=0.3)
sample("door_creak_open", 0.10, T["doorA"] - 0.05, 0.4)
for i, at in enumerate([14.95, 15.55]): step(at, 0.045 - 0.012 * i, dark=600, pan=0.4)
sample("door_creak_close", 0.08, T["doorB"] - 0.1, 0.4); sample("door_close", 0.16, T["doorShut"] - 0.12, 0.4, hi=2500)
# the child comes back
for i, at in enumerate([18.55, 18.8, 19.05]): step(at, 0.025 + 0.008 * i, dark=500, pan=0.4)
sample("door_creak_open", 0.11, T["kidDoor"] - 0.05, 0.4)
for i, at in enumerate(np.arange(T["kidWalk"] + 0.05, T["kidSit"], 0.29)): step(at, 0.025 + 0.012 * i, dark=1200, pan=0.4 - 0.12 * i)
sample("floor_creak1", 0.06, T["kidSit"] - 0.05, -0.3, hi=3500)
sample("switch_on", 0.10, T["tvOn"] - 0.12, -0.2, hi=6000)
# the old set warms up: thunk and line whine
click(T["tvOn"], 110, 0.18, 0.18)
k = np.arange(int(1.2 * SR)); wh = (np.sin(2 * np.pi * 15600 * k / SR) * np.exp(-k / (0.5 * SR)) * 0.004).astype(np.float32); place(np.stack([wh, wh], 1), T["tvOn"])
# jumping on the sofa / the dorm floor
for at in [T["goal99"] + 0.12, T["goal99"] + 0.68, T["goal08"] + 0.12, T["goal08"] + 0.7]:
    click(at, 60, 0.18, 0.16); sample("floor_creak1", 0.035, at + 0.05, 0.0, hi=2500)
# second TV off
sample("switch_off", 0.10, T["off2"] - 0.1, hi=6000); click(T["off2"], 900, 0.05, 0.2); click(T["off2"], 70, 0.12, 0.22)

# ---------------------------------------------------------------- piano
m = load("music/Danse Morialta.mp3", 73.5, T["to26"] + 1.6 - T["kidDoor"])
m = m / rms(m) * 0.034; tm = np.arange(len(m)) / SR + T["kidDoor"]
me = ease((tm - T["kidDoor"]) / 2.5) * (1 - ease((tm - (T["to26"] - 0.7)) / 2.0))
me *= 1 - 0.35 * (np.exp(-np.maximum(0, tm - T["goal99"]) / 1.5) * (tm > T["goal99"]) + np.exp(-np.maximum(0, tm - T["goal08"]) / 1.5) * (tm > T["goal08"]))
place(m * me[:, None], T["kidDoor"])

fade = 1 - ease((t - (D - 0.8)) / 0.8); out *= fade[:, None]
out *= 0.89 / np.abs(out).max()
w = wave.open("out/seg1.wav", "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
print("ok")

# Opening sound: the interview audio (dry while the clip fills the screen, then
# "in the room" as the camera pulls back), rain fading in, remote click, TV off.
# python3 sound.py -> out/opening.wav
import wave, numpy as np
SR, D, T_OFF = 48000, 12.5, 9.4
rng = np.random.default_rng(7)
def read(p):
    w = wave.open(p); a = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, w.getnchannels()).astype(np.float32) / 32768
    assert w.getframerate() == SR; return a
def lowpass(x, hz):
    X = np.fft.rfft(x, axis=0); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= (1 / (1 + (f / hz) ** 4))[:, None]; return np.fft.irfft(X, n=len(x), axis=0)
def bandpass(x, lo, hi):
    X = np.fft.rfft(x, axis=0); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= ((f > lo) & (f < hi))[:, None]; return np.fft.irfft(X, n=len(x), axis=0)
def ease(u): u = np.clip(u, 0, 1); return u * u * (3 - 2 * u)
n = int(D * SR); t = np.arange(n) / SR; out = np.zeros((n, 2), np.float32)

# interview: dry -> small speaker in a room
clip = read("footage/clip.wav")[: int(T_OFF * SR)]
m = len(clip); tc = np.arange(m) / SR; p = ease((tc - 4.0) / 3.6)[:, None]
room = lowpass(clip, 3200)
ir = np.exp(-np.arange(int(0.35 * SR)) / (0.07 * SR)) * rng.standard_normal(int(0.35 * SR)) * 0.05
room = room + np.stack([np.convolve(room[:, c], ir)[:m] for c in range(2)], 1)
tv = clip * (1 - p) + room * p * 0.62
tv[-int(0.006 * SR):] *= np.linspace(1, 0, int(0.006 * SR))[:, None]   # hard cut when the TV goes off
out[:m] += tv

# rain on the window: filtered noise plus single drops
rain = bandpass(rng.standard_normal((n, 2)).astype(np.float32), 300, 7000) * 0.05
for _ in range(int(D * 30)):
    i = rng.integers(0, n - 2000); k = np.exp(-np.arange(2000) / 90) * rng.standard_normal(2000) * 0.06
    rain[i:i + 2000, rng.integers(0, 2)] += k
rain_env = (0.25 + 0.75 * ease((t - 3.5) / 4.0)) * (1 - ease((t - 12.0) / 0.5))
rain_env = np.where(t > T_OFF, rain_env * 1.35, rain_env)               # louder once the room is quiet
out += rain * rain_env[:, None] * ease(t / 0.4)[:, None]

# remote button, then the TV relay
def click(at, f, d, g):
    i = int(at * SR); k = np.arange(int(d * SR)); s = np.sin(2 * np.pi * f * k / SR) * np.exp(-k / (0.004 * SR)) * g
    out[i:i + len(k)] += s[:, None]
click(9.33, 3200, 0.03, 0.10); click(9.40, 900, 0.05, 0.22); click(9.40, 70, 0.12, 0.25)

out *= 0.89 / np.abs(out).max()                                       # peak-normalise (about -17.6 LUFS)
w = wave.open("out/opening.wav", "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
print("ok", round(float(np.abs(out).max()), 3))

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

# rain: a real window recording (alxl, CC0) looped with a crossfade, plus a
# second, darker recording (Ylmir, CC0) underneath so the loop never repeats audibly
import subprocess
def load(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-f", "s16le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).reshape(-1, 2).astype(np.float32) / 32768
def looped(x, need, xf=1.0):
    k = int(xf * SR); fade = np.sqrt(np.linspace(0, 1, k))[:, None]; y = x.copy()
    while len(y) < need: y = np.concatenate([y[:-k], y[-k:] * fade[::-1] + x[:k] * fade, x[k:]])
    return y[:need]
def rms(x): return float(np.sqrt((x ** 2).mean()))
A = lowpass(looped(load("audio/rain_on_window_loop.wav"), n), 7000)
B = lowpass(load("audio/rain_ylmir_3.ogg")[int(5 * SR):int(5 * SR) + n], 2500)
rain = A / rms(A) * 0.03 + B / rms(B) * 0.012                          # about -30 dBFS under the voice
rain_env = (0.3 + 0.7 * ease((t - 3.5) / 4.0)) * (1 - ease((t - 12.0) / 0.5))
rain_env = rain_env * np.where(t > T_OFF, 1.0 + 0.3 * ease((t - T_OFF) / 0.6), 1.0)   # the rain fills the quiet room
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

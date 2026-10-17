"""Synthesised sound effects, room tones, and the final mix.

  python3 sound.py  ->  build/mix.wav  (+ build/stems/sfx.wav, vo.wav)
"""
import json, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt
import tinysoundfont
from style import BUILD
from timeline import TOTAL, VO

SR = 48000
NS = int(TOTAL * SR)
rng = np.random.default_rng(11)

def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "bandpass", fs=SR, output="sos"), x)

def lp(x, f, order=2):
    return sosfilt(butter(order, f, "lowpass", fs=SR, output="sos"), x)

def hp(x, f, order=2):
    return sosfilt(butter(order, f, "highpass", fs=SR, output="sos"), x)

def env(n, a, r, curve=4.0):
    e = np.ones(n)
    na = max(1, int(a * SR)); nr = max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na)
    if nr < n:
        e[-nr:] *= np.exp(-np.linspace(0, curve, nr))
    return e

def noise(sec):
    return rng.standard_normal(int(sec * SR))

def pink(sec):
    n = int(sec * SR)
    f = np.fft.rfft(rng.standard_normal(n))
    k = np.arange(len(f)); k[0] = 1
    return np.fft.irfft(f / np.sqrt(k), n) * 30

TRACK = np.zeros((NS, 2), np.float32)

def put(x, t, gain=1.0, pan=0.0):
    s = int(t * SR)
    if s >= NS:
        return
    x = x[: NS - s] * gain
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    TRACK[s:s + len(x), 0] += x * l * 1.414
    TRACK[s:s + len(x), 1] += x * r * 1.414

# ------------------------------------------------------------------ sounds
def click():
    x = hp(noise(0.012), 2500) * env(int(0.012 * SR), 0.0005, 0.011, 6)
    return x * 0.5

def tv_off():
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    pop = lp(noise(0.08), 400) * env(int(0.08 * SR), 0.001, 0.07, 5) * 0.6
    whine = np.sin(2 * np.pi * (9000 - 4000 * t) * t) * np.exp(-t * 7) * 0.015
    stat = hp(noise(0.6), 3000) * np.exp(-t * 18) * 0.08
    out = whine + stat
    out[: len(pop)] += pop
    return out

def tv_on():
    n = int(0.5 * SR); t = np.arange(n) / SR
    return hp(noise(0.5), 2500) * np.exp(-t * 10) * 0.08 + np.r_[lp(noise(0.05), 300) * 0.4, np.zeros(n - int(0.05 * SR))]

def step(soft=1.0, child=False):
    d = 0.09
    x = lp(noise(d), 260 if not child else 380) * env(int(d * SR), 0.004, 0.08, 6)
    x += hp(noise(d), 1800) * env(int(d * SR), 0.001, 0.03, 8) * 0.06
    return x * 0.9 * soft

def creak(sec, base=180):
    n = int(sec * SR); t = np.arange(n) / SR
    f = base * (1 + 0.25 * np.sin(2 * np.pi * 1.3 * t) + 0.08 * rng.standard_normal(n).cumsum() / np.sqrt(np.arange(1, n + 1)))
    ph = 2 * np.pi * np.cumsum(f) / SR
    saw = (ph / (2 * np.pi)) % 1 * 2 - 1
    grit = (rng.random(n) < 0.04) * rng.standard_normal(n)
    x = bp(saw + grit * .6, 300, 1800) * env(n, 0.08, 0.2, 3) * (0.6 + 0.4 * np.sin(2 * np.pi * 3.1 * t) ** 2)
    return x * 0.09

def door_close():
    th = lp(noise(0.35), 140) * env(int(0.35 * SR), 0.002, 0.33, 6) * 1.2
    latch = hp(noise(0.03), 2000) * env(int(0.03 * SR), 0.001, 0.028, 6) * 0.25
    out = th.copy(); out[int(0.04 * SR): int(0.04 * SR) + len(latch)] += latch
    return out

def handle():
    return bp(noise(0.06), 1500, 6000) * env(int(0.06 * SR), 0.001, 0.05, 6) * 0.2

def tick():
    x = bp(noise(0.03), 600, 1200) * env(int(0.03 * SR), 0.001, 0.028, 7) * 0.15
    x[: int(0.02 * SR)] += bp(noise(0.02), 2000, 5000) * env(int(0.02 * SR), 0.0005, 0.018, 7) * 0.3
    return x

def tock():
    return bp(noise(0.02), 1400, 3500) * env(int(0.02 * SR), 0.0005, 0.018, 7) * 0.25

def rain(sec):
    n = int(sec * SR)
    base = lp(hp(pink(sec), 400), 5000) * 0.012
    drops = (rng.random(n) < 0.0015) * rng.standard_normal(n)
    drops = bp(drops, 2000, 7000) * 0.25
    return (base + drops) * env(n, 1.0, 1.0, 2)

def room(sec, level=0.004):
    n = int(sec * SR)
    return lp(pink(sec), 220) * level * env(n, .5, .5, 2)

def murmur(sec, level=0.02, muffle=1800, rate=0.35):
    """Distant crowd through a TV speaker."""
    n = int(sec * SR); t = np.arange(n) / SR
    am = 0.7 + 0.3 * np.sin(2 * np.pi * rate * t + rng.random() * 6) * np.sin(2 * np.pi * 0.13 * t)
    x = bp(pink(sec), 250, muffle) * am * level
    return x * env(n, 0.6, 0.6, 2)

_tsf = None
def applause(sec, vel=110, note=60):
    global _tsf
    s = tinysoundfont.Synth(samplerate=SR)
    sid = s.sfload("/opt/assets/FreePatsGM-SF2-20221026/FreePatsGM-20221026.sf2")
    s.program_select(0, sid, 0, 126)
    s.noteon(0, note, vel)
    a = np.frombuffer(s.generate(int(sec * SR)), np.float32).reshape(-1, 2).mean(1).astype(np.float64)
    s.noteoff(0, note)
    return a

def roar(sec, peak=1.0, attack=0.25):
    n = int(sec * SR); t = np.arange(n) / SR
    a = applause(sec)
    nz = bp(pink(sec), 200, 3500) * 0.05
    e = np.minimum(1, t / attack) * np.exp(-np.maximum(0, t - attack) * 0.55)
    x = (a * 0.6 + nz) * e * peak
    return x * env(n, 0.01, 0.8, 2)

def chant(sec, level=0.03):
    """Rhythmic crowd outside a stadium: murmur with a slow two-beat pulse."""
    n = int(sec * SR); t = np.arange(n) / SR
    pulse = 0.6 + 0.4 * (np.sin(2 * np.pi * 0.9 * t) > 0.3)
    x = bp(pink(sec), 180, 1400) * pulse * level
    return lp(x, 1600) * env(n, 0.8, 0.8, 2)

def thud(level=1.0):
    n = int(0.6 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (70 - 30 * t) * t) * np.exp(-t * 7) * 0.5
    x += lp(noise(0.6), 200) * np.exp(-t * 12) * 0.4
    return x * level

def rustle(sec):
    n = int(sec * SR)
    x = hp(noise(sec), 2500) * (rng.random(n) < 0.3) * 0.04
    return lp(x, 8000) * env(n, 0.05, 0.2, 3)

def paper():
    return bp(noise(0.05), 1200, 6000) * env(int(0.05 * SR), 0.002, 0.045, 5) * 0.05

def sit():
    x = lp(noise(0.3), 300) * env(int(0.3 * SR), 0.01, 0.28, 4) * 0.5
    return x + creak(0.3, 140) * 0.6

# ------------------------------------------------------------------ cue sheet
def build_sfx():
    # 2026 flat: rain and room tone through the opening and the empty room
    put(rain(26.8), 0.0, 1.0, -0.4)
    put(room(26.8), 0.0)
    # s03 leave (16.0)
    put(click(), 16.0 + 1.22)
    put(tv_off(), 16.0 + 1.25, 0.9)
    put(creak(0.4, 150) * 0.7, 18.7)
    for i, tt in enumerate(np.arange(19.45, 21.7, 0.58)):
        put(step(0.7 - i * 0.05), tt, pan=0.15 + i * .05)
    put(handle(), 21.6, pan=.3)
    put(creak(0.75, 210), 21.65, pan=.3)
    for tt in (22.5, 23.05):
        put(step(0.35), tt, pan=.3)
    put(door_close() * 0.8, 23.75, pan=.3)
    # s04 empty: clock
    for i, tt in enumerate(np.arange(24.3, 26.6, 1.0)):
        put(tick() if i % 2 == 0 else tock(), tt, .8, .5)
    # s05 enter (26.6)
    put(handle(), 26.55, pan=.3)
    put(creak(1.1, 230), 26.6, 0.9, pan=.3)
    put(room(22.5, 0.005), 26.6)
    for i, tt in enumerate(np.arange(28.0, 30.4, 0.6)):
        put(step(0.5), tt, pan=.2 - i * .06)
        put(step(0.35, child=True), tt + 0.3, pan=.1 - i * .06)
    put(sit(), 30.9, .8); put(sit() * .5, 31.2, .8)
    # TV crowd in each era of the montage
    put(murmur(16.0, 0.02, 1500), 28.6)
    put(lp(murmur(6.0, 0.016, 1300), 1400), 43.4)
    put(rain(5.6) * .8, 43.4, 1.0, -.4)
    # 1999: room + TV crowd, clock in the long wait
    put(murmur(10.0, 0.016, 1600), 55.0)
    put(murmur(30.6, 0.022, 1700, rate=.5), 65.0)
    for i, tt in enumerate(np.arange(65.5, 80.0, 1.0)):
        put(tick() if i % 2 == 0 else tock(), tt, .6, .5)
    put(roar(1.4, 0.5), 62.0)  # Bayern end celebrates, muted
    # the goals
    put(roar(4.5, 0.9), 83.95)
    put(roar(9.0, 1.6, 0.15), 93.5)
    put(sit() * .6, 99.6)
    # 2013 dorm
    put(murmur(11.0, 0.012, 1200, rate=.2), 110.0)
    put(room(11.0, 0.004), 110.0)
    # seasons: a paper tick per row
    for i in range(13):
        put(paper(), 121.0 + i * 1.05, 1.0, (i % 2) * .3 - .15)
    # FA Cup goals and whistle
    put(roar(3.0, 0.6), 143.67); put(roar(3.0, 0.6), 144.3)
    put(roar(1.2, 0.25), 147.8)
    put(roar(4.0, 1.0), 148.4)
    # phone + room
    put(room(12.0, 0.005), 151.0)
    put(rain(3.5) * .5, 159.5, 1, -.4)
    # takeover thuds
    for g in (166.0, 166.9, 167.8):
        put(thud(0.6), g)
    # stands filling in green and gold
    put(murmur(13.0, 0.02, 1800, rate=.3), 178.0)
    # protest
    put(chant(10.5, 0.045), 190.5)
    put(thud(0.9), 196.9)
    # scarf
    put(rustle(1.0), 201.3); put(rustle(1.6), 202.9); put(rustle(1.4), 204.4)
    # return (209.5)
    put(rain(17.0) * .8, 209.5, 1, -.4)
    put(room(23.0, 0.004), 209.5)
    for i, tt in enumerate(np.arange(209.7, 211.2, 1.0)):
        put(tick() if i % 2 == 0 else tock(), tt, .6, .5)
    put(handle(), 211.05, pan=.3); put(creak(0.9, 220), 211.1, .9, .3)
    for i, tt in enumerate(np.arange(212.4, 214.6, 0.6)):
        put(step(0.5), tt, pan=.25 - i * .08)
    put(door_close() * .6, 216.2, pan=.3)
    put(sit(), 215.4, .8)
    put(click(), 217.78); put(tv_on(), 217.8, .8)
    put(lp(murmur(8.7, 0.012, 1300), 1400), 217.8)

def build_vo():
    durs = json.load(open(os.path.join(BUILD, "vo", "durations.json")))
    vo = np.zeros((NS, 2), np.float32)
    for k, t in VO.items():
        sr, x = wavfile.read(os.path.join(BUILD, "vo", f"{k}.wav"))
        x = x.astype(np.float32) / 32768
        if k == "f02":  # father on the phone
            x = bp(x, 320, 3300, 3) * 2.2
            x = np.tanh(x * 1.5) / 1.5
        if k == "f01":
            x = x * 0.85
        if k == "s01":
            x = x * 0.95
        s = int(t * SR)
        x = x[: NS - s]
        vo[s:s + len(x), 0] += x; vo[s:s + len(x), 1] += x
    # gentle de-harsh + small room
    for c in range(2):
        vo[:, c] = lp(vo[:, c], 9000, 2)
    return vo

def build_tv():
    """The Prime Video interview as heard from the TV, following clipmap.SEGMENTS."""
    import clipmap
    sr, a = wavfile.read(os.path.join(BUILD, "clip", "audio48k.wav"))
    a = a.astype(np.float32).mean(1) / 32768
    out = np.zeros(NS, np.float32)
    for f0, f1, c0, gdb, muf in clipmap.SEGMENTS:
        n = int((f1 - f0) * SR)
        x = a[int(c0 * SR): int(c0 * SR) + n].astype(np.float64)
        if len(x) < n:
            x = np.pad(x, (0, n - len(x)))
        cut = 12000 * (1 - muf) + 2600 * muf
        x = lp(x, cut, 2)
        if muf > 0:
            x = hp(x, 120 + 180 * muf, 2)
        g = 10 ** (gdb / 20) * np.ones(n)
        if f0 == 44.0:   # under the narration until it ends, then the loop is heard
            tt = f0 + np.arange(n) / SR
            g = np.where(tt < 47.0, 10 ** (-24 / 20), g)
            g = np.convolve(g, np.ones(2400) / 2400, mode="same")
        fade = int(0.03 * SR)
        e = np.ones(n); e[:fade] = np.linspace(0, 1, fade); e[-fade:] = np.linspace(1, 0, fade)
        out[int(f0 * SR): int(f0 * SR) + n] += (x * g * e).astype(np.float32)
    # small room on the muffled parts
    from music import reverb
    st = np.stack([out, out], 1)
    return reverb(st, secs=1.2, wet=0.18, seed=5)

def music_gain(t):
    """Automation: hard cut at the TV click; silence where the picture needs it."""
    g = np.ones_like(t)
    g[(t >= 17.25) & (t < 26.7)] = 0.0
    k = (t >= 17.2) & (t < 17.25); g[k] = 1 - (t[k] - 17.2) / 0.05
    g[(t >= 209.5) & (t < 211.9)] = 0.0
    k = (t >= 226.5) & (t < 227.2); g[k] = 0.0
    return g

def main():
    from scipy.io.wavfile import read
    build_sfx()
    vo = build_vo() + build_tv()
    m = np.zeros((NS, 2), np.float32)
    levels = {"piano": 0.55, "winds": 0.6, "strings": 0.5, "perc": 0.7}
    for st, lv in levels.items():
        sr, x = read(os.path.join(BUILD, "music", f"{st}.wav"))
        m[: len(x)] += x[:NS] * lv
    t = np.arange(NS) / SR
    m *= music_gain(t)[:, None]
    # duck music under the voice (smoothed envelope of VO)
    v = np.abs(vo[:, 0])
    k = int(0.25 * SR)
    cs = np.concatenate([[0], np.cumsum(v)])
    idx = np.arange(NS)
    lo = np.clip(idx - k // 2, 0, NS); hi = np.clip(idx + k // 2, 0, NS)
    venv = (cs[hi] - cs[lo]) / k
    duck = 1 - 0.45 * np.clip(venv / 0.03, 0, 1)
    m *= duck[:, None]
    # fade out the tail
    m[-int(2.5 * SR):] *= np.linspace(1, 0, int(2.5 * SR))[:, None]
    os.makedirs(os.path.join(BUILD, "stems"), exist_ok=True)
    for nm, x in (("vo", vo), ("sfx", TRACK), ("music_mixed", m)):
        wavfile.write(os.path.join(BUILD, "stems", f"{nm}.wav"), SR, x.astype(np.float32))
    mix = vo * 1.0 + TRACK * 0.9 + m * 0.75
    peak = np.abs(mix).max()
    mix = mix / max(1.0, peak / 0.89)
    wavfile.write(os.path.join(BUILD, "mix.wav"), SR, mix.astype(np.float32))
    print("peak", peak, "rms", float(np.sqrt((mix ** 2).mean())))

if __name__ == "__main__":
    main()

"""Cut 2 mix: the score carries everything. Martinez's own voice in the
opening (de-noised, filtered), a TV click and a door, nothing else."""
import os
import numpy as np
from scipy.io import wavfile
import sound as S
from edit2 import TOTAL, CLIP_AUDIO
from style import BUILD

SR = 48000
NS = int(TOTAL * SR)

def voice():
    sr, a = wavfile.read(os.path.join(BUILD, "clip", "voice_clean.wav"))
    a = a.astype(np.float32) / 32768
    out = np.zeros(NS, np.float32)
    for f0, f1, c0, gdb in CLIP_AUDIO:
        n = int((f1 - f0) * SR)
        x = a[int(c0 * SR): int(c0 * SR) + n]
        x = np.pad(x, (0, max(0, n - len(x))))
        if f0 > 30:   # on the TV across the room
            x = S.lp(S.hp(x, 300), 3000).astype(np.float32)
        fade = int(0.04 * SR)
        e = np.ones(n, np.float32); e[:fade] = np.linspace(0, 1, fade); e[-fade:] = np.linspace(1, 0, fade)
        out[int(f0 * SR): int(f0 * SR) + n] += x * e * 10 ** (gdb / 20) * 1.6
    return out

def sfx():
    S.NS = NS
    S.TRACK = np.zeros((NS, 2), np.float32)
    S.put(S.click() * 0.8, 12.47)
    pop = S.lp(S.noise(0.12), 300) * S.env(int(0.12 * SR), 0.002, 0.11, 6) * 0.5
    S.put(pop, 12.5)
    S.put(S.door_close() * 0.55, 17.45, pan=.3)
    from edit2 import remap
    S.put(S.click() * 0.6, remap(137.45))
    return S.TRACK

def main():
    m = np.zeros((NS, 2), np.float32)
    lv = {"piano": 0.62, "winds": 0.62, "strings": 0.55, "perc": 0.62, "bass": 0.7}
    for st, g in lv.items():
        sr, x = wavfile.read(os.path.join(BUILD, "music2", f"{st}.wav"))
        m[: len(x)] += x[:NS] * g
    v = voice()
    # duck the score under his voice
    env = np.abs(v)
    k = int(0.2 * SR)
    cs = np.concatenate([[0], np.cumsum(env)])
    idx = np.arange(NS)
    venv = (cs[np.clip(idx + k // 2, 0, NS)] - cs[np.clip(idx - k // 2, 0, NS)]) / k
    m *= (1 - 0.5 * np.clip(venv / 0.02, 0, 1))[:, None]
    m[-int(3 * SR):] *= np.linspace(1, 0, int(3 * SR))[:, None]
    mix = m + np.stack([v, v], 1) + sfx() * 0.9
    os.makedirs(os.path.join(BUILD, "stems2"), exist_ok=True)
    wavfile.write(os.path.join(BUILD, "stems2", "voice.wav"), SR, v)
    wavfile.write(os.path.join(BUILD, "stems2", "music.wav"), SR, m)
    peak = np.abs(mix).max()
    wavfile.write(os.path.join(BUILD, "mix2.wav"), SR, (mix / max(1, peak / 0.89)).astype(np.float32))
    print("peak", peak)

if __name__ == "__main__":
    main()

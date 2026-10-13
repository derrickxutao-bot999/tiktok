"""Test score for messi-storm (15 s, 120 bpm): a dark pulse, rain, and hits on every visual impact.
Synthesised with the banana-39 kit (../banana-39/audio), so no third-party music is involved."""
import os, sys, wave
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "banana-39", "audio"))
from synth import SR, adsr, band, boom, noise, riser, piano, strings, hz, tt, timpani, reverb_ir, convolve  # noqa: E402
from synth2 import rain, kick, whoosh, pad  # noqa: E402

N = int(15 * SR); mix = np.zeros(N)
def put(y, at, g=1.0):
    i = int(at * SR); y = y[:N - i] * g; mix[i:i + len(y)] += y
# 0–1: the characters gather — a rising whoosh into the slam
put(riser(1.0, 200, 7000, 1.0), 0.0, .9)
put(whoosh(.9, 300, 6000, 1.0, .9), .1, .6)
# 1.0: the "10" slams in
put(boom(3.0, 60, 30, 1.0), 1.0, 1.3); put(band(noise(.4), 2000, 12000) * np.exp(-tt(.4) * 12), 1.0, .5)
# a heartbeat pulse in D under the hook
for k in range(4): put(kick(.9), 1.5 + k * .5, .7)
put(pad([hz("D2"), hz("A2"), hz("F3")], 13.5, .9, 1.5, 2.0), 1.0, 1.0)
put(strings(hz("D3"), 13.0, 2.0, 2.5, .45, 3, .8), 1.5, .8)
# 2.6–3: the characters fall as rain
put(whoosh(.5, 5000, 600, 1.0, .3), 2.55, .7)
put(rain(12.0, 1.0) * adsr(int(12 * SR), .3, .1, 1, 1.5), 2.9, 1.0)
put(band(noise(12.0), 30, 120) * .08, 3.0, 1.0)          # thunder-ish rumble under the rain
# 3–10.5: the pulse goes on; three finals crash down on the beat
for k in range(15): put(kick(.6 + .02 * k), 3.0 + k * .5, .55)
for at, f in ((4.5, "D2"), (6.0, "C2"), (7.5, "Bb1")):
    put(whoosh(.38, 400, 8000, 1.0, .95), at - .37, .8)
    put(boom(2.5, 70, 32, 1.0), at, 1.4); put(timpani(hz(f), 2.0, 1.0), at, 1.0)
    put(band(noise(.6), 1500, 9000) * np.exp(-tt(.6) * 9), at, .7)    # the shatter
for k, n in enumerate(("A4", "F4", "D4")): put(piano(hz(n), 2.5, .5), 4.5 + k * 1.5 + .5, .8)
# 10.5–12: the penalty
put(whoosh(.8, 300, 5000, 1.0, .3), 11.0, .9); put(kick(1.0), 11.0, .8)
# 12–15: his words, the rain slows, one low piano note
put(piano(hz("D2"), 3.0, .9), 12.0, 1.0); put(piano(hz("A3"), 2.6, .5), 12.4, .7)
put(boom(2.5, 50, 28, .6), 12.0, .8)
ir = reverb_ir(2.4, 3); mix = mix * .8 + convolve(mix, ir) * .3
fade = np.ones(N); fade[-int(.6 * SR):] = np.linspace(1, 0, int(.6 * SR)); mix *= fade
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.6) * .89
os.makedirs("out", exist_ok=True)
st = (np.stack([mix, mix]).T * 32767).astype(np.int16)
with wave.open("out/score.wav", "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print("ok")

"""Downloads the instrument samples used by soundtrack.py from the University of Iowa
Musical Instrument Samples (https://theremin.music.uiowa.edu/MIS.html) — "freely available ...
may be downloaded and used for any projects, without restrictions" — and converts each note
to a trimmed 48 kHz stereo float32 .npy file in audio/samples/<instrument>/<midi>.npy.

Run once:  python3 audio/fetch_samples.py      (needs curl + ffmpeg, ~1 GB download)
"""
import os
import re
import subprocess
import sys
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

import numpy as np

BASE = "https://theremin.music.uiowa.edu/"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "samples")
TMP = os.path.join(HERE, "samples", "_tmp")
SR = 48000
SEMI = {"C": 0, "Db": 1, "D": 2, "Eb": 3, "E": 4, "F": 5, "Gb": 6, "G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11}


def midi(name):
    m = re.fullmatch(r"([A-G]b?)(\d)", name)
    return 12 * (int(m.group(2)) + 1) + SEMI[m.group(1)] if m else None


def links(page):
    html = subprocess.run(["curl", "-sS", "-m", "60", BASE + page], capture_output=True, text=True, encoding="latin-1").stdout
    root = BASE + (page.rsplit("/", 1)[0] + "/" if "/" in page else "")
    return [urllib.parse.urljoin(root, urllib.parse.quote(h)) for h in re.findall(r'href="([^"]+\.aiff?)"', html)]


# instrument -> (index page, filename regex with a (?P<n>note) group, midi range, max seconds)
PITCHED = {
    "piano_mf": ("MISpiano.html", r"Piano\.mf\.(?P<n>[A-G]b?\d)\.aiff", (33, 88), 7.0),
    "piano_pp": ("MISpiano.html", r"Piano\.pp\.(?P<n>[A-G]b?\d)\.aiff", (52, 91), 6.0),
    "violin": ("MIS-Pitches-2012/MISViolin2012.html", r"Violin\.arco\.ff\.sul\w\.(?P<n>[A-G]b?\d)\.stereo\.aif", (55, 91), 6.0),
    "viola": ("MIS-Pitches-2012/MISViola2012.html", r"Viola\.arco\.ff\.sul\w\.(?P<n>[A-G]b?\d)\.stereo\.aif", (48, 79), 6.0),
    "cello": ("MIS-Pitches-2012/MISCello2012.html", r"Cello\.arco\.ff\.sul\w\.(?P<n>[A-G]b?\d)\.stereo\.aif", (36, 72), 6.0),
    "bass": ("MIS-Pitches-2012/MISDoubleBass2012.html", r"Bass\.arco\.ff\.sul\w\.(?P<n>[A-G]b?\d)\.stereo\.aif", (28, 55), 6.0),
    "violin_pizz": ("MIS-Pitches-2012/MISViolin2012.html", r"Violin\.pizz\.ff\.sul\w\.(?P<n>[A-G]b?\d)\.stereo\.aif", (55, 91), 2.0),
    "cello_pizz": ("MIS-Pitches-2012/MISCello2012.html", r"Cello\.pizz\.ff\.sul\w\.(?P<n>[A-G]b?\d)\.stereo\.aif", (36, 64), 2.0),
    "bass_pizz": ("MIS-Pitches-2012/MISDoubleBass2012.html", r"Bass\.pizz\.ff\.sul\w\.(?P<n>[A-G]b?\d)\.stereo\.aif", (28, 50), 2.5),
    "horn": ("MIS-Pitches-2012/MISHorn2012.html", r"Horn\.ff\.(?P<n>[A-G]b?\d)\.stereo\.aif", (34, 77), 5.0),
    "trombone": ("MIS-Pitches-2012/MISTenorTrombone2012.html", r"TenorTrombone\.ff\.(?P<n>[A-G]b?\d)\.stereo\.aif", (40, 72), 5.0),
    "trumpet": ("MIS-Pitches-2012/MISBbTrumpet2012.html", r"Trumpet\.vib\.ff\.(?P<n>[A-G]b?\d)\.stereo\.aif", (52, 84), 5.0),
    "glock": ("MIS-Pitches-2012/MISBells2012.html", r"bells\.plastic\.ff\.(?P<n>[A-G]b?\d)\.stereo\.aif", (60, 108), 4.0),
    "vibes": ("MIS-Pitches-2012/MISVibraphone2012.html", r"Vibraphone\.sustain\.ff\.(?P<n>[A-G]b?\d)\.stereo\.aif", (48, 90), 6.0),
    "crotale": ("MIS-Pitches-2012/MISCrotales2012.html", r"Crotale\.ff\.(?P<n>[A-G]b?\d)\.stereo\.aif", (84, 110), 5.0),
    "bassoon": ("MIS-Pitches-2012/MISBassoon2012.html", r"Bassoon\.ff\.(?P<n>[A-G]b?\d)\.stereo\.aif", (34, 76), 4.0),
    "clarinet": ("MIS-Pitches-2012/MISBbClarinet2012.html", r"BbClarinet\.ff\.(?P<n>[A-G]b?\d)\.stereo\.aif", (50, 91), 4.0),
    "flute": ("MIS-Pitches-2012/MISFlute2012.html", r"Flute\.vib\.ff\.(?P<n>[A-G]b?\d)\.stereo\.aif", (59, 96), 4.0),
}
FX = {  # name -> (index page, filename, max seconds)
    "roll18": ("MIS-Pitches-2012/MISCymbals2012.html", "18crash.mallet.roll.stereo.aif", 12),
    "roll20": ("MIS-Pitches-2012/MISCymbals2012.html", "20crash.mallet.roll.stereo.aif", 12),
    "crash_viennese": ("MIS-Pitches-2012/MISCymbals2012.html", "18orchcrash.viennese.ff.stereo.aif", 10),
    "crash_heavy": ("MIS-Pitches-2012/MISCymbals2012.html", "17orchcrash.medheavy.ff.stereo.aif", 10),
    "cym_bow": ("MIS-Pitches-2012/MISCymbals2012.html", "18crash.bow.stereo.aif", 12),
    "cym_stick": ("MIS-Pitches-2012/MISCymbals2012.html", "18crash.stick.normal.ff.stereo.aif", 8),
    "tamtam40": ("MIS-Pitches-2012/MISGongsTamTams2012.html", "40tamtam.ff.stereo.aif", 16),
    "tamtam28": ("MIS-Pitches-2012/MISGongsTamTams2012.html", "28tamtam.ff.stereo.aif", 14),
    "tamtam_bow": ("MIS-Pitches-2012/MISGongsTamTams2012.html", "40tamtam.bow.stereo.aif", 14),
}


def convert(src, dst, max_s):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).T
    peak = np.max(np.abs(x)) + 1e-9
    on = np.argmax(np.max(np.abs(x), axis=0) > peak * .03)       # trim the silence before the attack
    x = x[:, max(0, on - int(.004 * SR)):][:, :int(max_s * SR)].copy()
    n = min(int(.25 * SR), x.shape[1] // 3)
    x[:, -n:] *= np.linspace(1, 0, n)                              # fade the tail
    np.save(dst, x.astype(np.float32))


def job(item):
    url, dst, max_s = item
    if os.path.exists(dst):
        return
    tmp = os.path.join(TMP, os.path.basename(dst) + "." + os.path.basename(os.path.dirname(dst)) + ".aif")
    for _ in range(4):
        if subprocess.run(["curl", "-sS", "-f", "-m", "300", "-o", tmp, url]).returncode == 0 and os.path.getsize(tmp) > 10000:
            break
    else:
        print("  FAILED", urllib.parse.unquote(url), flush=True)
        return
    convert(tmp, dst, max_s)
    os.remove(tmp)


def main():
    os.makedirs(TMP, exist_ok=True)
    jobs, pages = [], {}
    for inst, (page, pat, (lo, hi), max_s) in PITCHED.items():
        os.makedirs(os.path.join(OUT, inst), exist_ok=True)
        seen = set()
        for url in pages.setdefault(page, links(page)):
            m = re.search(pat, urllib.parse.unquote(url))
            if not m:
                continue
            k = midi(m.group("n"))
            if k is None or not lo <= k <= hi or k in seen:
                continue
            seen.add(k)
            jobs.append((url, os.path.join(OUT, inst, f"{k}.npy"), max_s))
    os.makedirs(os.path.join(OUT, "fx"), exist_ok=True)
    for name, (page, fname, max_s) in FX.items():
        url = next(u for u in pages.setdefault(page, links(page)) if urllib.parse.unquote(u).endswith(fname))
        jobs.append((url, os.path.join(OUT, "fx", f"{name}.npy"), max_s))
    print(f"{len(jobs)} samples", flush=True)
    with ThreadPoolExecutor(8) as ex:
        for i, _ in enumerate(ex.map(job, jobs)):
            if i % 50 == 0:
                print(f"  {i}/{len(jobs)}", flush=True)
    os.rmdir(TMP)
    print("done")


if __name__ == "__main__":
    sys.exit(main())

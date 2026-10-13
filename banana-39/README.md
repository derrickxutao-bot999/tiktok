# 一根香蕉的39年 · 足球与城市 第三集

**39 Years of a Banana.** A 116-second vertical film (1080×1920, 30 fps) for Douyin about Manchester City's inflatable bananas: from a joke in the club's worst years to the away end at Anfield in October 2026.

Final video: `banana-39.mp4`

## The story

On 11 October 2026, hundreds of City fans held up inflatable bananas at Anfield. It was City's first match since an independent commission upheld 114 of the 115 Premier League charges against the club. City won 3-0.

Why bananas? The answer goes back to the late 1980s.

1. **1987:** Manchester was a declining industrial city. City had just been relegated, and English football was at its lowest: fenced terraces, and English clubs banned from Europe.
2. **15 August 1987, Maine Road v Plymouth:** fan Frank Newton brought a 5ft 6in inflatable banana to the match. People laughed. By the end of the season, the chant for striker Imre Varadi had become "Imre Banana". The craze was not a tribute to Varadi.
3. **The craze spread:** about 50 bananas at the last away game of 1987–88. The next season brought sharks, crocodiles, dinosaurs and Frankensteins. A banana producer stepped up production and a fruit company sponsored City games. Meanwhile Manchester's clubs were playing acid house.
4. **Boxing Day 1988 at Stoke:** over 12,000 City fans came in fancy dress, and Stoke gave them two sides of the ground. The players ran out with inflatables. City lost.
5. **The decline:** the inflatables faded with all-seater grounds. City fell to the third tier in 1998, then came back at Wembley in 1999 from 2-0 down at 89 minutes.
6. **2008 onwards:** Abu Dhabi ownership, the 2012 title (the 93:20 goal) and the 2023 treble. The bananas became a memory.
7. **29 September 2026:** the commission found that City broke the financial rules between 2009-10 and 2017-18. Sanctions are still to come, and City deny wrongdoing and have appealed. At Anfield the bananas came back.
   - The supporters' group 1894 said: "this fan base has always been on a rollercoaster".
   - The home end's banner read: "a generation of supporters cheated".

The film ends with a question rather than a verdict: *the banana hasn't changed, so what has?* Thirty-nine years ago it was a joke for hard times. Today some call it loyalty, others a shield.

### Sources

- GJ Football Archive, [Bananarama – The Inflatables Craze](https://gjfootballarchive.com/2022/06/20/bananarama-the-inflatables-craze/): Newton, Plymouth, the chant, the 50 bananas, Fyffes, Stoke on Boxing Day, the players.
- Yahoo Sports, [Why Man City fans have inflatable bananas at Anfield](https://sports.yahoo.com/articles/why-man-city-fans-inflatable-155348226.html): 11 October 2026, the 0-3 result, 1894, the banner, the appeal.
- CBS Sports, [Commission finds Manchester City guilty on 114 charges](https://www.cbssports.com/soccer/news/manchester-city-premier-league-commission-guilty-114-charges/): 29 September 2026, the seasons covered, sanctions to come.
- Wikipedia, [1999 Football League Second Division play-off final](https://en.wikipedia.org/wiki/1999_Football_League_Second_Division_play-off_final).

## How it is made

- **Pictures:** every shot is drawn on a 2D canvas (`js/props.js`, `js/scenes*.js`).
- **Grading:** `js/grade.js` grades each frame in WebGL2. Each era has its own look:
  - **1987–88 camcorder:** scanline jitter, chroma smear, tracking band, head-switch noise, on-screen date.
  - **1990s DV:** cold tones and interlace.
  - **1999 TV broadcast:** interlace and a live scoreboard.
  - **Glossy HD:** for the trophy years.
  - **Cold verdict.**
  - **Modern dusk:** for Anfield 2026.
- **Music:** `soundtrack.py` is cued to the picture. A five-note "banana" motif changes instrument with each era:
  - high piano at Anfield
  - lonely piano in the 1987 rain
  - comic bassoon and clarinet as Newton walks in
  - flute and trumpet over a Madchester acid-house groove (synthesised 303 bass and drums, real piano stabs)
  - a tape-stop when the era ends
  - heroic D-major brass after Wembley
  - a music box for the shoebox
  - near-silence and a ticking clock for the verdict
  - an unresolved piano at the end

  The instruments are real recordings from the [University of Iowa Musical Instrument Samples](https://theremin.music.uiowa.edu/MIS.html), which are free for any use.

## Rebuild

```bash
./fetch-fonts.sh                    # OFL fonts -> fonts/
python3 audio/fetch_samples.py      # instrument samples -> audio/samples/ (once)
python3 soundtrack.py               # -> out/soundtrack.wav
ln -s /path/to/node_modules .       # needs playwright; Chromium with WebGL
node render.mjs --workers 4         # -> out/banana-39.mp4 (~80 MB, for upload) + out/master.mp4 + a 720p preview
node render.mjs --stills 4.5,40,69  # quick PNG checks
```

`narration.txt` and `subtitles.*.srt` contain the narration with timecodes, for an AI voiceover in 剪映 (CapCut) or for platform captions.

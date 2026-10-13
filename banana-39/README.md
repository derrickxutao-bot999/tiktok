# 一根香蕉的39年 · 足球与城市 第一集

**39 Years of a Banana.** A 130-second vertical film (1080×1920, 30 fps) for Douyin about Manchester City's inflatable bananas: from a joke in the club's worst years to the away end at Anfield in October 2026.

Final video: `banana-39.mp4`

## The story

On 11 October 2026, hundreds of City fans held up inflatable bananas at Anfield. It was City's first match since an independent commission upheld 114 of the 115 Premier League charges against the club. City won 3-0.

Why bananas? The answer goes back to the late 1980s.

1. **1987:** Manchester was a declining industrial city. City had just been relegated, and English football was at its lowest: fenced terraces, and English clubs banned from Europe.
2. **15 August 1987, Maine Road v Plymouth:** fan Frank Newton brought a 5ft 6in inflatable banana to the match. People laughed. By the end of the season, the chant for striker Imre Varadi had become "Imre Banana". The craze was not a tribute to Varadi.
3. **The craze spread:** about 50 bananas at the last away game of 1987–88. The next season brought sharks, crocodiles, dinosaurs and Frankensteins. A banana producer stepped up production and a fruit company sponsored City games. Meanwhile Manchester's clubs were playing acid house.
4. **Boxing Day 1988 at Stoke:** over 12,000 City fans came in fancy dress, and Stoke gave them two sides of the ground. The players ran out with inflatables. City lost.
5. **The decline:** the inflatables faded with all-seater grounds. City fell to the third tier in 1998, then came back at Wembley in 1999 from 2-0 down at 89 minutes.
6. **2008 onwards:** Abu Dhabi ownership, the 2012 title (the 93:20 goal) and the 2023 treble.
7. **6 February 2023, the year of the treble:** the Premier League brought 115 charges. The main ones concern the club's finances from 2009-10 to 2017-18, the seasons of City's first titles. The case ran for more than three years, and the bananas stayed in old fans' shoeboxes.
8. **29 September 2026:** the commission upheld 114 of the 115 charges. Sanctions are still to come, and City deny wrongdoing and have appealed. At Anfield the bananas came back.
   - The supporters' group 1894 said: "this fan base has always been on a rollercoaster".
   - The home end's banner read: "a generation of supporters cheated".

The film ends with an argument and a conclusion. Some say the bananas have become the club's shield. But the banana was born in 1987, when City had nothing but their fans. The verdict is about the club's accounts; the fans holding bananas did nothing wrong. In a montage of match dissolves, the same supporter stands in the same spot through the lows and the peaks:

- a banana at Maine Road in 1987
- a scarf in the rain in the third tier in 1998
- Wembley in 1999
- the treble in 2023
- Anfield in 2026, with his grandchild

The last line is *香蕉没变，举香蕉的人，一直都在*: the banana hasn't changed, and the people holding it never left.

### Sources

- GJ Football Archive, [Bananarama – The Inflatables Craze](https://gjfootballarchive.com/2022/06/20/bananarama-the-inflatables-craze/): Newton, Plymouth, the chant, the 50 bananas, Fyffes, Stoke on Boxing Day, the players.
- Yahoo Sports, [Why Man City fans have inflatable bananas at Anfield](https://sports.yahoo.com/articles/why-man-city-fans-inflatable-155348226.html): 11 October 2026, the 0-3 result, 1894, the banner, the appeal.
- ESPN, [Man City vs. Premier League: 115 charges, what's at stake](https://global.espn.com/football/story/_/id/41279820/man-city-vs-premier-league-115-charges-whats-stake): the charges of 6 February 2023 and the seasons they cover.
- CBS Sports, [Commission finds Manchester City guilty on 114 charges](https://www.cbssports.com/soccer/news/manchester-city-premier-league-commission-guilty-114-charges/): 29 September 2026, the seasons covered, sanctions to come.
- Wikipedia, [1999 Football League Second Division play-off final](https://en.wikipedia.org/wiki/1999_Football_League_Second_Division_play-off_final).

## How it is made

- **Pictures:** every shot is drawn on a 2D canvas (`js/props.js`, `js/scenes*.js`).
- **Transitions:** every cut lands on a downbeat of the score. Each transition is motivated by the picture (`CUTS` in `js/main.js`):
  - the Anfield footage rewinds on tape, and the bananas sink back down
  - the VHS picture rolls and locks onto 1987, and camcorder pauses glitch between shots
  - whip pans run along the terraces, landing on the groove's bar lines
  - a crash zoom dives into a yellow banana and comes out of the acid-house smiley
  - a strobe drops into Boxing Day, and the tape stops
  - the camera tilts down as City fall, then a 1999 TV graphic wipes to Wembley
  - photographers' flashes lead out of Wembley, then a gold light sweeps across
  - under "2023 ★★★" the light flickers and goes cold as "115 CHARGES" appears: the honours and the charges share one frame
  - the trophies dissolve into a shoebox; a phone in it lights up with the verdict, and the camera pushes into the notification until its "114 / 115" becomes the verdict's
  - the last falling page flies into the lens, and its white becomes the floodlights at Anfield
  - one continuous push takes the camera from the banner into the wall of bananas, then a slow light dissolve finds two fans in the away end
  - the closing montage dissolves through the eras on one fan's raised hand
- **Grading:** `js/grade.js` grades each frame in WebGL2. Each era has its own look:
  - **1987–88 camcorder:** scanline jitter, chroma smear, tracking band, head-switch noise, on-screen date.
  - **1990s DV:** cold tones and interlace.
  - **1999 TV broadcast:** interlace and a live scoreboard.
  - **Glossy HD:** for the trophy years.
  - **Cold verdict.**
  - **Modern dusk:** for Anfield 2026.
- **Music:** `soundtrack.py` is cued to the picture. Each section has its own tempo, and its downbeats fall on the cuts. A five-note "banana" motif changes instrument with each era:
  - high piano at Anfield
  - lonely piano in the 1987 rain
  - comic bassoon and clarinet as Newton walks in, with a bassoon pickup leading into the cut
  - flute and trumpet over a Madchester acid-house groove (synthesised 303 bass and drums, real piano stabs)
  - heroic D-major brass after Wembley
  - a music box for the shoebox

  The music changes with the cuts:
  - The score rewinds with the picture, and the tape wobbles up to speed at PLAY.
  - The groove closes into a low-pass filter as the camera dives into the banana, and opens up again in the club.
  - The tape stops when the 1980s end.
  - Timpani land when City drop a division.
  - When the trophies go cold, the treble's fanfare breaks off mid-phrase, a high semitone rub resolves onto the A that the shoebox's F major keeps, and a clock starts ticking; it returns under the verdict.
  - The music box slows down, and the phone's buzz stops it before its last note.
  - A rising push lands on "114" with a low boom, and the clock speeds up into the tempo of Anfield.
  - Under "the club's shield" the beat stops on a held D minor; a high violin A, common to D minor and F major, carries the change of key into the fans' scene.
  - When the film remembers where the banana was born, the lonely 1987 piano version of the motif returns; the major version answers it.
  - A deceptive cadence opens the montage of the lows. Each era's crowd sound fades in and out with its own dissolve.
  - The motif finally resolves under the end card, and the music box's missing note is played by everyone.

  The instruments are real recordings from the [University of Iowa Musical Instrument Samples](https://theremin.music.uiowa.edu/MIS.html), which are free for any use.

## Rebuild

```bash
./fetch-fonts.sh                    # OFL fonts -> fonts/
python3 audio/fetch_samples.py      # instrument samples -> audio/samples/ (once)
python3 soundtrack.py               # -> out/soundtrack.wav
ln -s /path/to/node_modules .       # needs playwright; Chromium with WebGL
node render.mjs --workers 4         # -> out/banana-39.mp4 (1080x1920, two-pass to ~95 MB) + out/master.mp4 + a 720p preview
node render.mjs --stills 4.5,40,69  # quick PNG checks
```

`narration.txt` and `subtitles.*.srt` contain the narration with timecodes, for an AI voiceover in 剪映 (CapCut) or for platform captions.

# 足球与城市 · 曼联 — the red shirt on the sofa

Segment 1 (concept by the channel owner): Lisandro Martínez's post-match outburst
(Atlético Madrid 2–0 Man United, Champions League, 13 Oct 2026) plays on a TV. A fan in
a United shirt switches it off and walks out. A child comes back through the same door,
sits down and switches it on — the same fan, years earlier. The camera stays behind the
sofa while the room changes around him: 1999 with his dad, 2008 in a dorm, 2026 alone.

Facts used: both finals kicked off at 20:45 CET = 02:45 Beijing time —
26 May 1999, Camp Nou, Man United 2–1 Bayern (calendar shows 27 May, Thursday);
21 May 2008, Luzhniki, Man United 1–1 Chelsea, 6–5 on penalties.

Look: muted night blue, United red as the only colour, everyone seen from behind and
rim-lit by the screen. Shirts are plain red with no badge or sponsor.

- `scene.js` — rooms (1999 flat, 2008 dorm, 2026 flat), TVs and screen content, rain
  window, door with corridor light, back-view fans (`bustBack`), rim light, grade.
- `storyboard.html?f=N` — storyboard shots 1–5; `storyboard-seg1.png` is the sheet.
  Standing doorway figures use `../messi-storm/silhouette.js`.

Render a shot: `node tools/shot.mjs storyboard.html out/sb1.png 1080 1920 "?f=1"`.
The real interview clip goes on the TV via `screenContent(..., { image })`.

## Segment 1 v2 — "the same sofa" (`film.html` = `toon.js` + `views.js` + `film.js`, 76 s)

Many angles and cinematic transitions instead of one locked camera; the people are full-colour
cartoon characters (the same man at three ages, his dad, two roommates) with faces, lit by the
light in the scene (TV, laptop, corridor, rainy window).

| # | Time | Shot | Transition out |
|---|---|---|---|
| 1 | 0–6 | The real interview (Prime Video, 2:29.3–), pulled back to reveal his TV | dissolve |
| 2 | 6–8 | His face in the TV light, rain light on the wall | cut |
| 3 | 8–9.4 | Insert: his thumb on the remote | cut on the click |
| 4 | 9.4–11.2 | The screen dies; his reflection in the black glass | dissolve |
| 5 | 11.2–14.6 | Profile in the dark; head goes down; piano starts | cut |
| 6 | 14.6–20.2 | He stands; crosses to the door, looks back once, leaves | dissolve |
| 7 | 20.2–22.6 | The empty room, slow push on the dark TV | dissolve |
| 8 | 22.6–25.2 | Floor level: feet under the door, it opens on a child | cut |
| 9 | 25.2–28 | The child in the doorway (oversized No.7 shirt), walks in | cut |
| 10 | 28–31 | He hops onto the sofa, legs dangling, picks up the remote | cut |
| 11 | 31–32.6 | Insert: two small hands, the same button (match cut with 3) | cut |
| 12 | 32.6–34.6 | The screen opens on an old broadcast; the camera flies into it | push-through |
| 13 | 34.6–39.6 | 1999 from behind: out of the CRT to Dad and the boy | dissolve |
| 14 | 39.6–42.2 | Clock 02:45 -> calendar 27 May 1999 (focus pull) | dissolve |
| 15 | 42.2–48.6 | Their faces; the winner (45.0); Dad on his feet, the boy jumping | camera move |
| 16 | 48.6–51.2 | Up to the moon, across the night sky, down into a dorm window | whip + dissolves |
| 17 | 51.2–56.5 | 2008: three faces in laptop light; the save (54.0); they jump | cut |
| 18 | 56.5–59.5 | The moment holds; the roommates fade; closer on him | cut |
| 19 | 59.5–62 | The student's face dissolves into the man's | dissolve |
| 20 | 62–66.4 | His face; the same interview | cut |
| 21 | 66.4–67.8 | From behind: the same picture on the TV | cut |
| 22 | 67.8–68.6 | Insert: his thumb, the same button | cut on the click |
| 23 | 68.6–76 | Black screen: his reflection, and beside him, faint, the boy | fade out |

Score (`score.py`, original): one theme in D major on real instrument recordings (University of
Iowa MIS, fetched by `../banana-39/audio/fetch_samples.py`). Silence under the interview; solo
piano when he is alone; an octave higher with glockenspiel for the child; strings in 1999 with the
goal on a downbeat; a piano/pizzicato pulse in 2008 and the save; back to piano; silence; a coda.

Build: `tools/fetch_footage.sh`, `python3 score.py`, `python3 sound.py` (-> `out/film.wav`),
`node render.mjs film.html out/film.mp4 out/film.wav`.

Words (checked with two transcription passes): "You start changing, changing, changing manager
and… But what about other areas? … I can't say more." Subtitles: 一直在换、换、换主教练…… /
但其他方面呢？ / 我不能再多说了。 On-screen credit: 画面：Prime Video.
Credits for the description (crowd sounds, CC BY 4.0) are in `audio/LICENSES.md`; the music is
original.

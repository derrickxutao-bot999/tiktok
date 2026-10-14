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

## Segment 1 (`seg1.html` + `seg1.js`, 47 s)

| Time | Shot | Outside |
|---|---|---|
| 0–12.5 | The real interview (Prime Video Sport on X, 2:29.3–2:38.8) fills the screen; the camera pulls back to the TV in his flat; on "I can't say more" he switches it off | rain |
| 12.5–16.7 | He stands, walks out through the door into the corridor light; the door closes | rain |
| 16.7–19.3 | Empty room, a line of light under the door | rain |
| 19.3–23 | The door opens on a child, who walks to the sofa, climbs up and presses the remote | rain |
| 23–29 | The TV light carries the room back to 1999 (Dad, CRT, 02:45, calendar 27 May); the injury-time winner, arms up | clear night, crickets |
| 29–35 | 2008 dorm, roommates, the penalty save, arms up | windy night, branches, clouds over the moon |
| 35–37 | The roommates fade out; he grows up; the rain comes back | rain |
| 37–47 | 2026, alone: the same interview, the same click, the room goes dark | rain |

Words (checked with two transcription passes): "You start changing, changing, changing manager
and… But what about other areas? … I can't say more." Subtitles: 一直在换、换、换主教练…… /
但其他方面呢？ / 我不能再多说了。 On-screen credit: 画面：Prime Video.

Build: `tools/fetch_footage.sh` (the interview, not in git) and `tools/fetch_music.sh`, then
`python3 sound.py` -> `out/seg1.wav`, then `node render.mjs seg1.html out/seg1.mp4 out/seg1.wav`.
Sound sources and the credits the video description needs are in `audio/LICENSES.md`
(music: Kevin MacLeod "Danse Morialta", CC BY 4.0; crowd: Gregor Quendel, CC BY 4.0; the rest CC0).

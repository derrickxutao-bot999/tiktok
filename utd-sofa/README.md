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

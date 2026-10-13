# 梅西 · 风雨（风格测试）

A 15-second vertical style test (1080×1920, 30 fps) for a Messi episode, in the kinetic-typography style of the Su Shi "定风波" video: one small figure in a storm, text as scenery, hard hits on the beat.

- 0–3 s: thousands of characters fly in and slam into a "10"; "他输掉了三个决赛".
- 3–10.5 s: the characters fall as rain onto an empty pitch; three lost finals drop and shatter on the beat:
  - 2014 World Cup final, 0-1 (Germany, after extra time)
  - 2015 Copa América final, lost 1-4 on penalties (Chile)
  - 2016 Copa América final, lost 2-4 on penalties (Chile)
- 10.5–12 s: his 2016 penalty goes over the bar.
- 12–15 s: his words after that final, "对我来说，国家队生涯结束了" (he said the national team was over for him; he later returned).

Build: `python3 score.py` (synthesised test score), then `node render.mjs` → `out/messi-storm.mp4`; `node render.mjs --stills 1,5` for frames. Fonts come from `../banana-39/fonts` (run `../banana-39/fetch-fonts.sh`).

# Labs

Each lab is a separate Remotion entry point with its own test compositions, so a
component can be developed and rendered on its own without bundling the whole
film:

    node tools/stills.mjs LabAthlete 0,30,60 --entry src/lab/athlete/entry.ts --sheet out/lab-athlete.png

- `athlete/`: the vector athlete in every era, standing in for the pose solver output.
- `env/`: the two worlds (stadium night, Rosario dusk), the ground and the ball.
- `fx/`: pulses, glitch, shuffle, captions, subtitle, grain.

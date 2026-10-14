#!/bin/sh
# Martínez post-match interview (Prime Video Sport on X), used as the episode's opening.
# Needs yt-dlp and ffmpeg. Frames 2:29.3–2:38.8 at 25 fps -> footage/clip/, audio -> footage/clip.wav
set -e
cd "$(dirname "$0")/.."
mkdir -p footage/clip
[ -f footage/lisandro.mp4 ] || yt-dlp --no-playlist -o footage/lisandro.mp4 "https://twitter.com/primevideosport/status/2110119478176411773/video/1"
ffmpeg -v error -y -ss 149.3 -t 9.5 -i footage/lisandro.mp4 -vf scale=1280:-2 -q:v 3 footage/clip/%04d.jpg
ffmpeg -v error -y -ss 149.3 -t 9.5 -i footage/lisandro.mp4 -vn -ac 2 -ar 48000 footage/clip.wav

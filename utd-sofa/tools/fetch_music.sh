#!/bin/sh
# Kevin MacLeod, "Danse Morialta" (incompetech.com), CC BY 4.0
set -e
cd "$(dirname "$0")/.."
mkdir -p music
curl -sSL -o "music/Danse Morialta.mp3" "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Danse%20Morialta.mp3"

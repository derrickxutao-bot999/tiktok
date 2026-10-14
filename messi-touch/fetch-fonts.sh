#!/usr/bin/env bash
# Downloads the open-licence (OFL) fonts used by the film into public/fonts/.
set -euo pipefail
cd "$(dirname "$0")" && mkdir -p public/fonts
get() { curl -sS -A "Mozilla/4.0" "https://fonts.googleapis.com/css2?family=$1" | grep -o 'https[^)]*' | head -1 | xargs curl -sS -o "public/fonts/$2"; }
get "Barlow+Condensed:wght@500" BarlowCondensed-Medium.ttf
get "Barlow+Condensed:wght@700" BarlowCondensed-Bold.ttf
get "Cormorant+Garamond:ital,wght@1,500" Cormorant-MediumItalic.ttf
get "IBM+Plex+Mono:wght@400" IBMPlexMono-Regular.ttf

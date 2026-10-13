#!/usr/bin/env bash
# Downloads the open-licence (OFL) fonts used by index.html into fonts/.
set -euo pipefail
cd "$(dirname "$0")" && mkdir -p fonts
get() { curl -sS -A "Mozilla/4.0" "https://fonts.googleapis.com/css2?family=$1" | grep -o 'https[^)]*' | head -1 | xargs curl -sS -o "fonts/$2"; }
get "Noto+Serif+SC:wght@500" NotoSerifSC-Medium.ttf
get "Noto+Serif+SC:wght@600" NotoSerifSC-SemiBold.ttf
get "Ma+Shan+Zheng" MaShanZheng-Regular.ttf
get "Cormorant+Garamond:wght@500" Cormorant-Medium.ttf
get "Cormorant+Garamond:wght@700" Cormorant-Bold.ttf
get "Cormorant+Garamond:ital,wght@1,500" Cormorant-Italic.ttf
get "Playfair+Display:wght@700" PlayfairDisplay-Bold.ttf
get "VT323" VT323-Regular.ttf
get "Oswald:wght@600" Oswald-SemiBold.ttf

"""Rank source frames by how sharp the player is, per kit.

    python3 score_frames.py SRC_FRAMES_DIR
"""
import os
import sys

import cv2
import numpy as np

from toon import grass_mask, remove_watermarks

d = sys.argv[1]
for n in sorted(os.listdir(d)):
    f = remove_watermarks(cv2.imread(os.path.join(d, n)))
    m = grass_mask(cv2.bilateralFilter(f, 9, 40, 9))
    player = (1 - m).astype(bool)
    ys, xs = np.where(player)
    if len(ys) < 500:
        continue
    g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
    sharp = cv2.Laplacian(g, cv2.CV_64F)[player].var()
    hsv = cv2.cvtColor(f, cv2.COLOR_BGR2HSV)[player]
    light_blue = ((hsv[:, 0] > 95) & (hsv[:, 0] < 115) & (hsv[:, 2] > 150)).mean()
    kit = "ARG" if light_blue > 0.08 else "FCB"
    edge = xs.min() < 4 or xs.max() > f.shape[1] - 5 or ys.min() < 4 or ys.max() > f.shape[0] - 5
    print(n, kit, f"{sharp:7.1f}", "edge" if edge else "")

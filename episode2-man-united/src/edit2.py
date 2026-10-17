"""Cut 2: no narration. 96 BPM (beat = 0.625 s = 15 frames, bar = 2.5 s).
Every cut sits on a bar or beat; captions carry the story.

SHOTS: (id, start, dur, transition_in)
transition_in: ("cut",) | ("flash", colour, frames) | ("whip", dir, frames)
               | ("ink", frames) | ("dip", colour, frames) | ("dissolve", frames) | ("iris", frames)
"""
BPM = 96
BEAT = 60 / BPM
BAR = 4 * BEAT

SHOTS = [
    ("open",      0.0, 12.5, ("cut",)),
    ("profile",  12.5,  1.5, ("flash", "#000000", 2)),
    ("standup",  14.0,  1.25, ("cut",)),
    ("exit",     15.25, 2.25, ("cut",)),
    ("empty",    17.5,  2.5, ("cut",)),
    ("enter",    20.0,  5.0, ("cut",)),
    ("orbit",    25.0, 10.0, ("whip", "left", 6)),
    ("title",    35.0,  2.5, ("flash", "#F4ECDA", 3)),
    ("date99",   37.5,  2.5, ("ink", 12)),
    ("basler",   40.0,  2.5, ("whip", "up", 6)),
    ("sleepy",   42.5,  5.0, ("iris", 12)),
    ("clock",    47.5,  2.5, ("cut",)),
    ("corner1",  50.0,  5.0, ("whip", "left", 5)),
    ("corner2",  55.0,  5.0, ("cut",)),
    ("joy",      60.0,  5.0, ("flash", "#FFFFFF", 3)),
    ("fergie",   65.0,  2.5, ("dip", "#000000", 6)),
    ("dorm",     67.5,  5.0, ("dip", "#000000", 8)),
    ("seasons",  72.5, 10.0, ("whip", "up", 6)),
    ("facup",    82.5,  7.5, ("ink", 12)),
    ("phone",    90.0,  7.5, ("dissolve", 12)),
    ("morning",  97.5,  2.5, ("dissolve", 10)),
    ("takeover", 100.0, 5.0, ("ink", 12)),
    ("newton",  105.0,  2.5, ("whip", "left", 6)),
    ("stands",  107.5,  5.0, ("iris", 10)),
    ("fans",    112.5,  5.0, ("whip", "up", 6)),
    ("protest", 117.5,  7.5, ("ink", 12)),
    ("scarf",   125.0,  7.5, ("dip", "#000000", 8)),
    ("return",  132.5, 15.0, ("whip", "left", 6)),
    ("final",   147.5,  6.0, ("dip", "#EFE5CF", 8)),
    ("end",     153.5,  6.5, ("dissolve", 12)),
]
TOTAL = 160.0

# Captions: (start, end, text, style). styles: cap (lower third), quote (spoken
# words, 「」), hand (handwritten motif), big (centre, large), tag (top band)
CAPTIONS = [
    # Martinez (his own voice is heard)
    (0.4, 2.95, "真的很差。真的很差。", "quote"),
    (3.3, 6.3, "有时候，这就是", "quote"),
    (6.3, 9.6, "俱乐部现状的一面镜子。", "quote"),
    (9.8, 12.3, "我们期待高层做得更多。", "quote"),
    (0.4, 9.6, "利桑德罗·马丁内斯 赛后采访|2026.10.13 · 欧冠 马竞 2-0 曼联 · Prime Video", "tag"),
    # the loop
    (20.4, 24.8, "1999 · 一个虚构的曼联家庭", "tag"),
    (25.3, 27.4, "1999 · 跟着父亲", "cap"),
    (27.8, 29.9, "2013 · 大学宿舍", "cap"),
    (30.3, 32.4, "2019 · 一个人", "cap"),
    (32.8, 34.9, "2026 · 位置没变", "cap"),
    # 1999
    (43.0, 45.2, "比分停在 0 比 1。七岁的他困得睁不开眼。", "cap"),
    (45.6, 47.4, "再等一会儿。", "hand"),
    (60.3, 62.2, "2 比 1", "big"),
    (62.4, 64.9, "只要再等一会儿，球就会进。", "cap"),
    # the wait
    (67.8, 70.2, "2013年5月 · 弗格森宣布退休", "cap"),
    (70.3, 72.4, "宿舍里，没有人说话。", "cap"),
    (72.8, 75.4, "一个赛季，又一个赛季。", "cap"),
    (75.6, 77.6, "偶尔也有光。", "cap"),
    (77.8, 80.3, "每一次，他都对自己说：再等一会儿。", "cap"),
    (80.4, 82.4, "这一次，等的是一个又一个赛季。", "cap"),
    (90.7, 92.6, "爸，你看到了吗？", "quote"),
    (93.0, 94.6, "看到了。", "quote"),
    (95.0, 97.4, "那一晚，像极了1999年。", "cap"),
    (90.0, 100.0, "2024 · 虚构场景", "tag"),
    (97.8, 99.9, "可第二天醒来，老问题还在。", "cap"),
    # green and gold
    (109.6, 112.3, "绿金围巾，走进老特拉福德。", "cap"),
    (112.8, 115.0, "他们没有离开球队。", "cap"),
    (115.1, 117.4, "他们想要回自己的俱乐部。", "cap"),
    (118.6, 122.3, "欧超风波之后，数千名球迷在老特拉福德外抗议。", "cap"),
    (122.8, 124.9, "对利物浦的比赛被迫推迟。", "cap"),
    (125.0, 132.5, "虚构场景", "tag"),
    (126.0, 128.6, "红色球衣，绿金围巾。", "cap"),
    (128.8, 132.3, "支持它，和要求它改变，从来不矛盾。", "cap"),
    # ending
    (132.5, 147.5, "2026", "tag"),
    (138.2, 140.0, "二十七年。", "big"),
    (140.2, 142.2, "等一个进球，等一个赛季，", "cap"),
    (142.3, 144.2, "等一个像样的答案。", "cap"),
    (144.5, 147.3, "球迷的忠诚，值得俱乐部认真回应。", "cap"),
]

# Martinez audio from the Prime Video clip: (film_start, film_end, clip_start, gain_db)
CLIP_AUDIO = [
    (0.00, 3.00, 6.35, 0.0),
    (3.00, 9.65, 15.00, 0.0),
    (9.65, 12.50, 25.75, 0.0),
    (33.4, 34.9, 6.80, 0.0),     # "Really poor." on the 2026 TV in the orbit
]

def clip_time(t):
    """Picture on the TV (clip time) for film time t, or None."""
    for a, b, c, g in CLIP_AUDIO[:3]:
        if a <= t < b:
            return c + (t - a)
    if 12.5 <= t < 14.0:
        return 28.25 + (t - 12.5)
    return None

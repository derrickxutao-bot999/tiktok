"""Cut 2: no narration. 96 BPM (beat = 0.625 s = 15 frames, bar = 2.5 s).
Every cut sits on a bar or beat; captions carry the story.

SHOTS: (id, start, dur, transition_in)
transition_in: ("cut",) | ("flash", colour, frames) | ("whip", dir, frames)
               | ("ink", frames) | ("dip", colour, frames) | ("dissolve", frames) | ("iris", frames)
"""
BPM = 96
BEAT = 60 / BPM
BAR = 4 * BEAT

# Cut 3 edits cut 2's timeline: two shots are deleted and three passages are
# inserted. Everything is expressed in cut-2 time and mapped with remap().
DELETES = {"clock", "fergie"}
INSERTS = [
    (67.5, [("nfather", 2.5, ("dip", "#000000", 6)), ("munich", 2.5, ("dip", "#000000", 10)),
            ("seats", 2.5, ("cut",)), ("wembley", 2.5, ("flash", "#F4ECDA", 4))]),
    (105.0, [("debt", 2.5, ("whip", "up", 6)), ("rain", 2.5, ("cut",)), ("tickets", 2.5, ("cut",)), ("jobs", 2.5, ("cut",))]),
    (147.5, [("pair", 5.0, ("cut",))]),
]

def _windows():
    return [(st, st + d) for s, st, d, tr in _CUT2 if s in DELETES]

def base(at):
    """Where cut-2 time `at` lands in cut 3, before anything inserted at `at`."""
    return at - sum(b - a for a, b in _windows() if b <= at + 1e-6) + sum(sum(x[1] for x in items) for t0, items in INSERTS if t0 < at - 1e-6)

def remap(t):
    """Cut-2 time -> cut-3 time (None inside a deleted shot)."""
    for a, b in _windows():
        if a <= t < b - 1e-6:
            return None
    return base(t) + sum(sum(x[1] for x in items) for t0, items in INSERTS if abs(t0 - t) < 1e-6)

def at_insert(i, off):
    """Cut-3 time of an offset into the i-th inserted passage."""
    return base(INSERTS[i][0]) + off

_CUT2 = [
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
SHOTS = [(s, remap(st), d, tr) for s, st, d, tr in _CUT2 if s not in DELETES]
for i, (t0, items) in enumerate(INSERTS):
    off = 0.0
    for s, d, tr in items:
        SHOTS.append((s, at_insert(i, off), d, tr)); off += d
SHOTS.sort(key=lambda x: x[1])
TOTAL = SHOTS[-1][1] + SHOTS[-1][2]

_CAP2 = [
    (0.4, 2.95, "真的很差。真的很差。", "quote"),
    (3.3, 6.3, "有时候，这就是", "quote"),
    (6.3, 9.6, "俱乐部现状的一面镜子。", "quote"),
    (9.8, 12.3, "我们期待高层做得更多。", "quote"),
    (20.4, 24.8, "1999 · 一个虚构的曼联家庭", "tag"),
    (25.3, 27.4, "1999 · 跟着父亲", "cap"),
    (27.8, 29.9, "2013 · 大学宿舍", "cap"),
    (30.3, 32.4, "2019 · 一个人", "cap"),
    (32.8, 34.9, "2026 · 位置没变", "cap"),
    (43.0, 45.2, "比分停在 0 比 1。七岁的他困得睁不开眼。", "cap"),
    (45.6, 47.4, "再等一会儿。", "hand"),
    (60.3, 62.2, "2 比 1", "big"),
    (62.4, 64.9, "只要再等一会儿，球就会进。", "cap"),
    (67.8, 70.0, "2013年5月 · 弗格森宣布退休", "cap"),
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
    (109.6, 112.3, "绿金围巾，走进老特拉福德。", "cap"),
    (112.8, 115.0, "他们没有离开球队。", "cap"),
    (115.1, 117.4, "他们想要回自己的俱乐部。", "cap"),
    (118.6, 122.3, "欧超风波之后，数千名球迷在老特拉福德外抗议。", "cap"),
    (122.8, 124.9, "对利物浦的比赛被迫推迟。", "cap"),
    (125.0, 132.5, "虚构场景", "tag"),
    (126.0, 128.6, "红色球衣，绿金围巾。", "cap"),
    (128.8, 132.3, "支持它，和要求它改变，从来不矛盾。", "cap"),
    (132.5, 147.5, "2026", "tag"),
    (138.2, 140.0, "二十七年。", "big"),
    (140.2, 142.2, "等一个进球，等一个赛季，", "cap"),
    (142.3, 144.2, "等一个像样的答案。", "cap"),
    (144.5, 147.3, "球迷的忠诚，值得俱乐部认真回应。", "cap"),
]
CAPTIONS = [(remap(a), remap(a) + (b - a), s, st) for a, b, s, st in _CAP2 if remap(a) is not None]
_NEWCAP = [  # (insert index, start offset, end offset, text, style)
    (0, 0.3, 2.5, "父亲说，这句话是爷爷教他的。", "cap"),
    (0, 2.8, 4.9, "空难中23人遇难，其中8名是曼联球员。", "cap"),
    (0, 5.3, 7.4, "那一年，爷爷十九岁。", "cap"),
    (0, 7.8, 9.1, "十年后，曼联第一次赢得欧冠。", "cap"),
    (0, 9.1, 9.95, "爷爷等了十年。", "hand"),
    (1, 0.3, 2.4, "钱，先拿去还了收购的债。", "cap"),
    (1, 2.7, 4.9, "球场老了，雨水灌进看台。", "cap"),
    (1, 5.2, 7.4, "儿童和老人的优惠，没了。", "cap"),
    (1, 7.7, 9.9, "账单，最后落在了人身上。", "cap"),
    (2, 0.0, 5.0, "虚构场景", "tag"),
    (2, 0.3, 2.1, "再等一会儿？", "quote"),
    (2, 2.4, 4.85, "等。可这一次，我们也要说出来。", "quote"),
]
CAPTIONS += [(at_insert(i, a), at_insert(i, b), s, st) for i, a, b, s, st in _NEWCAP]

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

# ======================================================================
# Cut 4 (2:30): windows removed from the cut-3 timeline. Video, music,
# voice and captions are all cut by the same windows, so sync holds and the
# score is edited on its own beat grid. Times are cut-3 times.
CUT4_DELETE = [
    (3.00, 9.65),      # Martinez's "mirror" line: keep the two sharpest lines
    (18.75, 20.00),    # the empty room, a little shorter
    (22.50, 23.75),    # part of the walk in from the door
    (37.50, 40.00),    # the 1999 date card (now on the 6' card)
    (50.00, 51.25),    # the 1-1 hold
    (93.75, 95.00),    # the hold after the final whistle
    (100.00, 102.50),  # "那一晚，像极了1999年"
    (108.75, 110.00),  # takeover tail
    (125.00, 127.50),  # second half of the stands filling
    (132.50, 133.75),  # protest lead-in
    (140.00, 142.50),  # scarf: reaching for the hook
    (150.00, 151.25),  # part of the walk back in
    (177.00, 180.00),  # end card, shorter
]

def kept(t3):
    return not any(a <= t3 < b - 1e-6 for a, b in CUT4_DELETE)

def to4(t3):
    return t3 - sum(min(b, t3) - a for a, b in CUT4_DELETE if t3 > a)

TOTAL4 = to4(TOTAL)

# Transitions that grow out of the story (override cut-3 choices)
TRANS4 = {
    "orbit": ("dissolve", 8),            # same seat, same boy
    "title": ("tvline", 10),             # the orbit ends on the TV: it switches off into the title
    "basler": ("dissolve", 8),           # title -> 6' (date99 is gone)
    "sleepy": ("cut",),                  # pulls back out of the CRT showing the 6' card
    "nfather": ("dissolve", 6),          # same 1999 room
    "munich": ("cut",),                  # match cut: the 1999 wall clock -> the Munich clock
    "dorm": ("years", 1968, 2013, 18),   # the grandfather's wait -> his own
    "seasons": ("zoomin", 10),           # through the dorm TV into the ledger
    "facup": ("flash", "#F4ECDA", 3),    # out of the glowing 23/24 FA Cup dot
    "takeover": ("years", 2024, 2005, 18),
    "newton": ("dissolve", 10),          # the last staff icons -> the shirt, on the same paper
    "fans": ("zoomin", 8),               # into the green-and-gold stand
    "scarf": ("zoomin", 8),              # into the protest banner -> the scarf
    "return": ("flash", "#FFF8EC", 4),   # the hallway door's light -> his room's door
}

# Caption changes for cut 4 (cut-3 times): clearer opening, moved lines
def captions4():
    out = []
    for a, b, s, st in CAPTIONS:
        if st == "tag" and s.startswith("1999 · 一个虚构"):
            continue
        if s == "2013年5月 · 弗格森宣布退休":
            a = 73.35          # after the rolling years have landed on 2013
        if s == "我们期待高层做得更多。":
            a, b = 9.75, 12.4
        if s == "绿金围巾，走进老特拉福德。":
            a, b = 122.8, 124.95
        if s == "欧超风波之后，数千名球迷在老特拉福德外抗议。":
            a, b = 133.8, 137.3
        if s == "红色球衣，绿金围巾。":
            a, b = 142.6, 144.6
        if s == "支持它，和要求它改变，从来不矛盾。":
            a, b = 144.8, 147.35
        out.append((a, b, s, st))
    out += [
        (0.3, 2.95, "曼联后卫马丁内斯，赛后直言", "head"),
        (9.65, 12.4, "曼联后卫马丁内斯，赛后直言", "head"),
        (12.6, 15.15, "他支持曼联，已经二十七年。", "cap"),
        (20.4, 22.45, "1999年，七岁的他和父亲。", "cap"),
    ]
    return out

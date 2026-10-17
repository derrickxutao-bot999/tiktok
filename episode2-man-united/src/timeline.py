"""Master timeline (seconds). Shots are contiguous; VO cues are absolute."""

SHOTS = [
    # id, start, dur, note
    ("s01_pullback", 0.0, 13.0, "Martinez quote fills screen; pull back to 2026 room"),
    ("s02_profile", 13.0, 3.0, "profile close-up, eyes lowered"),
    ("s03_leave", 16.0, 8.0, "remote click, TV off, stands, exits through door"),
    ("s04_empty", 24.0, 2.6, "empty room hold"),
    ("s05_enter", 26.6, 6.4, "door opens: room becomes 1999, father and boy enter"),
    ("s06_grow", 33.0, 16.0, "growing up in the same seat; ends on the same interview"),
    ("s07_title", 49.0, 6.0, "title"),
    ("s08_basler", 55.0, 10.0, "1999 final card + Basler free kick"),
    ("s09_wait", 65.0, 10.0, "1999 room: sleepy boy, father: just a little longer"),
    ("s10_clock", 75.0, 5.0, "90:00, board +3"),
    ("s11_corner1", 80.0, 7.6, "Sheringham 1-1"),
    ("s12_corner2", 87.6, 8.0, "Solskjaer 2-1"),
    ("s13_joy", 95.6, 9.4, "room erupts; quiet afterglow"),
    ("s14_fergie", 105.0, 5.0, "Football. Bloody hell."),
    ("s15_dorm", 110.0, 11.0, "2013 dorm, Ferguson retires"),
    ("s16_seasons", 121.0, 17.5, "seasons pass, little lights"),
    ("s17_facup", 138.5, 12.5, "2024 FA Cup final"),
    ("s18_phone", 151.0, 12.0, "phone call to father"),
    ("s19_takeover", 163.0, 10.0, "2005 leveraged buyout"),
    ("s20_greengold", 173.0, 13.0, "Newton Heath colours, scarves"),
    ("s21_fans", 186.0, 4.5, "they did not leave"),
    ("s22_protest", 190.5, 10.5, "2 May 2021"),
    ("s23_scarf", 201.0, 8.5, "red shirt, green-and-gold scarf"),
    ("s24_return", 209.5, 17.0, "back in the room; he returns"),
    ("s25_final", 226.5, 6.5, "just a little longer - but not forever"),
    ("s26_end", 233.0, 7.0, "sources + disclaimer"),
]
TOTAL = 240.0

VO = {
    "n01": 28.4, "n02": 33.4, "n03": 37.4, "n04": 40.8, "n05": 44.9,
    "n06": 55.6, "n07": 59.9, "n08": 65.6, "f01": 71.4,
    "n09": 75.5, "n10": 80.3, "n11": 88.0, "n12": 95.4, "n13": 99.4,
    "n14": 110.6, "n15": 117.0,
    "n16": 121.6, "n17": 124.6, "n18": 129.4, "n19": 132.9,
    "n20": 139.0, "n21": 142.4, "s01": 152.6, "f02": 155.0, "n22": 157.0, "n23": 160.0,
    "n24": 163.6, "n25": 173.6, "n26": 177.8, "n27": 186.4, "n28": 191.0,
    "n29": 201.8, "n30": 204.4,
    "n31": 213.4, "n32": 216.2, "n33": 221.0, "n34": 224.2,
}

# Short on-screen tags (not narration), shown small in the top band.
TAGS = [
    (0.4, 9.9, "利桑德罗·马丁内斯 赛后采访|2026.10.13 · 欧冠 马竞 2-0 曼联 · Prime Video"),
    (26.9, 32.8, "1999 · 虚构的球迷家庭"),
    (33.0, 36.6, "1999"), (36.6, 40.4, "2013"), (40.4, 44.0, "2019"), (44.0, 49.0, "2026"),
    (110.0, 121.0, "2013"), (151.0, 163.0, "2024 · 虚构场景"), (201.0, 209.5, "虚构场景"),
    (209.5, 226.5, "2026"),
]

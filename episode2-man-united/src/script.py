"""Episode 2 script: narration and spoken lines.

Every dated claim is listed in ../SOURCES.md. Lines spoken by the father and
the protagonist are fictional; narrator lines that carry dates are documented.
"""

NARRATOR = dict(voice="zh-CN-YunxiNeural", rate="-8%", pitch="-2Hz")
FATHER = dict(voice="zh-CN-YunjianNeural", rate="-12%", pitch="-4Hz")
SON = dict(voice="zh-CN-YunyangNeural", rate="-6%", pitch="+0Hz")

# id -> (speaker, text)
LINES = {
    "n01": (NARRATOR, "每个曼联球迷，都记得自己是从哪一天开始的。"),
    "n02": (NARRATOR, "有人是跟着父亲，有人是在大学宿舍。"),
    "n03": (NARRATOR, "后来，更多时候，是一个人。"),
    "n04": (NARRATOR, "房间换了，电视换了，身边的人也换了。"),
    "n05": (NARRATOR, "只有他坐的位置，没变。"),

    "n06": (NARRATOR, "1999年5月26日，巴塞罗那，欧冠决赛。"),
    "n07": (NARRATOR, "第6分钟，巴斯勒任意球破门。拜仁1比0领先。"),
    "n08": (NARRATOR, "比分一直停在那里。那个七岁的孩子，困得睁不开眼。"),
    "f01": (FATHER, "再等一会儿。"),
    "n09": (NARRATOR, "第90分钟，第四官员举牌：补时三分钟。"),
    "n10": (NARRATOR, "第91分钟，贝克汉姆开出角球，谢林汉姆把球扫进。1比1。"),
    "n11": (NARRATOR, "不到两分钟后，又是角球。谢林汉姆头球一摆，索尔斯克亚伸脚捅射。"),
    "n12": (NARRATOR, "2比1。"),
    "n13": (NARRATOR, "那天晚上，他记住了一件事：再等一会儿，球就会进。"),

    "n14": (NARRATOR, "2013年5月，弗格森宣布退休。宿舍里，没有人说话。"),
    "n15": (NARRATOR, "那时候大家都觉得，球队只是需要一点时间。"),
    "n16": (NARRATOR, "一个赛季过去，又一个赛季。"),
    "n17": (NARRATOR, "也有过光亮：足总杯，联赛杯，欧联杯。"),
    "n18": (NARRATOR, "每一次，他都对自己说：再等一会儿。"),
    "n19": (NARRATOR, "只是这一次，他等的不是一个进球，而是一个又一个赛季。"),
    "n20": (NARRATOR, "2024年5月25日，足总杯决赛。"),
    "n21": (NARRATOR, "加纳乔，梅努。两个十几岁的年轻人进球，曼联2比1击败曼城。"),
    "s01": (SON, "爸，你看到了吗？"),
    "f02": (FATHER, "看到了。"),
    "n22": (NARRATOR, "那一晚，像极了1999年。"),
    "n23": (NARRATOR, "可到了第二天，老问题还在。"),

    "n24": (NARRATOR, "2005年，格雷泽家族通过杠杆收购买下曼联。收购的债务，压在了俱乐部身上。"),
    "n25": (NARRATOR, "绿色和金色，是曼联前身牛顿希斯的颜色。"),
    "n26": (NARRATOR, "2010年前后，越来越多的球迷戴着绿金围巾，走进老特拉福德。"),
    "n27": (NARRATOR, "他们没有离开球队。他们想要回自己的俱乐部。"),
    "n28": (NARRATOR, "2021年5月2日，欧超风波之后，数千名球迷在老特拉福德外抗议。对利物浦的比赛被迫推迟。"),
    "n29": (NARRATOR, "红色球衣，绿金围巾。"),
    "n30": (NARRATOR, "支持这支球队，和要求它改变，从来不矛盾。"),

    "n31": (NARRATOR, "二十七年，他一直在等。"),
    "n32": (NARRATOR, "等一个进球，等一个赛季，等一个像样的答案。"),
    "n33": (NARRATOR, "球迷的忠诚，不该只是被消耗。"),
    "n34": (NARRATOR, "它值得俱乐部认真回应。"),
}

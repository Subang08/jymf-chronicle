#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
《剑与魔法命运编年史》像素画生成器 —— 零依赖（PNG 用标准库 zlib 写；有 Pillow 时额外排标题字）

产出（默认写到 docs/images/）：
  pixel-cover.png   主视觉：320x180 逻辑像素 x4 放大 = 1280x720（中世纪像素风夜景）
  pixel-icons.png   道具图标：8 个 16x16 图标排成一行 x6 放大

画面全部由本文件里的像素数据决定（ASCII sprite + 手写点阵），不联网、不读外部素材。
用法：python tools/make-pixel-art.py
"""

import math
import os
import struct
import zlib

W, H = 320, 180              # 逻辑像素
BAR = 34                     # 底部标题条高度（逻辑像素）
HORIZON = 106                # 地平线：以上天空、以下地面（地面到 146 为止，底部 34px 留给标题条）
SCALE = 4                    # 放大倍数 -> 1280x720
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs', 'images')

# ------------------------------------------------------------------ 调色板
# 冷石板外壳 + 奶白莫兰迪，加中世纪的金、血红、松绿、炉火橙
P = {
    '.': None,
    # 夜空（自上而下渐亮）
    '0': (7, 9, 13), '1': (11, 14, 20), '2': (16, 21, 29), '3': (23, 30, 41),
    '4': (31, 40, 53), '5': (40, 51, 66), '6': (50, 63, 80),
    # 月与星
    'm': (240, 235, 245), 'n': (208, 201, 220), 'o': (170, 164, 188),
    '*': (247, 244, 235), 'x': (112, 120, 142),
    # 山岩（远到近）
    'a': (18, 22, 29), 'b': (26, 32, 40), 'c': (36, 44, 54), 'd': (48, 57, 69),
    'e': (62, 72, 85), 'f': (86, 96, 110),
    # 雪顶与雾
    'g': (226, 230, 236), 'h': (176, 184, 196),
    # 城堡
    'i': (60, 66, 75), 'j': (76, 83, 93), 'k': (44, 49, 57), 'l': (30, 34, 40),
    'K': (44, 56, 72), 'L': (60, 74, 92),
    'w': (228, 186, 96), 'v': (178, 134, 54), 'u': (120, 88, 40),
    # 旗与血
    'r': (146, 60, 60), 'R': (98, 38, 38), 'p': (200, 100, 92),
    # 松林
    'G': (22, 45, 33), 'g2': (31, 60, 44), 'g3': (43, 80, 57), 'g4': (15, 31, 23),
    # 地面与路
    's': (32, 40, 32), 'S': (24, 30, 25), 'q': (60, 54, 44), 'Q': (78, 70, 56),
    # 火
    'F': (234, 126, 60), 'Y': (248, 198, 98), 'W': (255, 238, 182),
    # 骑士
    'A': (128, 136, 148), 'B': (92, 100, 112), 'C': (58, 66, 76),
    'D': (240, 234, 246), 'E': (204, 196, 214),
    'Z': (228, 186, 96),
    'T': (42, 48, 58), 'U': (28, 33, 42),
    # 画框
    'I': (253, 246, 240), 'J': (226, 182, 92), 'X': (46, 42, 58), 'N': (172, 166, 190),
}


class Canvas(object):
    def __init__(self, w, h, bg='.'):
        self.w, self.h = w, h
        self.px = [[bg for _ in range(w)] for _ in range(h)]

    def set(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h and c in P and P[c] is not None:
            self.px[y][x] = c

    def rect(self, x, y, w, h, c):
        for j in range(y, y + h):
            for i in range(x, x + w):
                self.set(i, j, c)

    def hline(self, x, y, w, c):
        self.rect(x, y, w, 1, c)

    def vline(self, x, y, h, c):
        self.rect(x, y, 1, h, c)

    def disc(self, cx, cy, r, c):
        for j in range(cy - r, cy + r + 1):
            for i in range(cx - r, cx + r + 1):
                if (i - cx) ** 2 + (j - cy) ** 2 <= r * r:
                    self.set(i, j, c)

    def ring(self, cx, cy, r, c):
        for j in range(cy - r, cy + r + 1):
            for i in range(cx - r, cx + r + 1):
                d = (i - cx) ** 2 + (j - cy) ** 2
                if (r - 0.6) ** 2 < d <= r * r:
                    self.set(i, j, c)

    def dither(self, x, y, w, h, c, step=2, phase=0):
        for j in range(y, y + h):
            for i in range(x, x + w):
                if (i + j + phase) % step == 0:
                    self.set(i, j, c)

    def blit(self, sprite, x, y, flip=False):
        rows = sprite.strip('\n').split('\n')
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch in ' .':
                    continue
                self.set(x + (len(row) - 1 - i if flip else i), y + j, ch)


# ------------------------------------------------------------------ sprite
# 巨龙剪影（翼展 30，飞在月与山脊之间）
DRAGON = """
..............dd..............
.....ff......dddf.............
....fdddd...ddddd.............
..ffddddddddddddddf...........
.fffdddddddddddddddf..........
..ffddddddddddddddd...........
...ffddddddddddddd............
....ffdddddddddd..............
.....ffddddd.ff...............
......fddd....ff..............
.......fd......f..............
........f.......f.............
"""

# 骑士（背影，21x30）：翎羽、甲片、盾上星徽、长剑、披风
KNIGHT = """
..........rr.........
.........rrrr........
.........rAA r.......
........AAAAAA.......
........AALAAA.......
........AALAAA.......
.......BAAAAAAB......
.......BAAAAAAB......
......BCCAAAACCB.....
.....BCC.DDD.CCB.....
....BCDDDZZZDDDCB....
....BCDDZZZZZDDCB....
....BCDDZZZZZDDCB....
....BCDDDZZZDDDCB....
....BCDDDDDDDDDCB....
....BCCDDDDDDDCCB....
.....BCCDDDDDCCB.....
......BCCDDDCCB......
.......BBCCCBB.......
....TTT..B..TTT......
...TTT...B...TTT.....
...TT....B....TT.....
..TTT....B....TTT....
..TT.....B.....TT....
.TT......B......TT...
.T.......B.......T...
.........B...........
........CCC..........
.........C...........
.........C...........
"""

ICONS = [
    # d20
    """
................
......EEEE......
.....E.DD.E.....
....E..DD..E....
...E..DDDD..E...
..E..DDZZDD..E..
.E..DDZZZZDD..E.
.E..DDZZZZDD..E.
.E..DDDZZDDD..E.
.E..DDDDDDDD..E.
..E..DDDDDD..E..
...E..DDDD..E...
....E..DD..E....
.....E.DD.E.....
......EEEE......
................
""",
    # 剑与盾
    """
.......gg.......
......ghhg......
......ghhg......
......ghhg......
......ghhg......
......ghhg......
.g....ghhg....g.
.gg..DghhgD..gg.
..gg.DDDDDD.gg..
...ggDEZZEDgg...
....gDEZZEDg....
.....DEZZED.....
.....DEEEE D....
......DEEED.....
.......DDD......
........D.......
""",
    # 药水
    """
......DDD.......
......D.D.......
......D.D.......
......D.D.......
.....DDDDD......
....D.....D.....
...D..ppp..D....
..D..ppppp..D...
..D.ppppppp.D...
..D.ppppppp.D...
..D.ppppppp.D...
..D..ppppp..D...
...D..ppp..D....
....DDDDDDD.....
................
................
""",
    # 卷轴
    """
................
..qqqqqqqqqqqq..
.qQQQQQQQQQQQQq.
.qQqqqqqqqqqqQq.
.qQqXXXXXXqqqQq.
.qQqqqqqqqqqqQq.
.qQqXXXXXXXqqQq.
.qQqqqqqqqqqqQq.
.qQqXXXXXqqqqQq.
.qQqqqqqqqqqqQq.
.qQqXXXXXXXqqQq.
.qQqqqqqqqqqqQq.
.qQQQQQQQQQQQQq.
..qqqqqqqqqqqq..
................
................
""",
    # 火把
    """
......Y.........
.....YWY........
....YWWWY.......
....YWWWY.......
.....YWY........
......F.........
.....qFq........
.....qQq........
.....qQq........
.....qQq........
.....qQq........
.....qQq........
.....qQq........
.....qQq........
.....qQq........
......q.........
""",
    # 旗帜
    """
.......J........
.......J........
.rrrrrJ.........
.rrrrrJrrrrr....
.rrZrrJrrZrr....
.rrZZZJZZZrr....
.rrZrrJrrZrr....
.rrrrrJrrrrr....
.rrrrrJ.........
.......J........
.......J........
.......J........
.......J........
.......J........
.......J........
......JJJ.......
""",
    # 龙头
    """
................
.......dd.......
......dddd......
.....dddddd.....
....dddddddd....
...ddddeeeddd...
..ddddeeeeedd...
..ddeeYeeeeeed..
..ddeeeeeeeeeed.
..ddeeeeeeeeFd..
..dddeeeeeFFdd..
...dddeeeFFd....
....dddFFFF.....
.....dd.YY......
................
................
""",
    # 骷髅
    """
................
....DDDDDD......
...DDDDDDDD.....
..DDDDDDDDDD....
..DDD.DD.DDD....
..DD..DD..DD....
..DDD.DD.DDD....
..DDDDDDDDDD....
...DDDDDDDD.....
....D.DD.D.......
....DDDDDD......
....D.D.D.D......
....DDDDDD......
.....D..D.......
................
................
""",
]
ICON_NAMES = ['d20', 'sword-shield', 'potion', 'scroll', 'torch', 'banner', 'dragon', 'skull']


def ridge(cv, base_y, x, peak, half_l, half_r, body, edge, snow=0, shade=None):
    """不对称山脊：左坡长右坡短，雪只压峰顶，画到 base_y 为止不漫到地面"""
    top = base_y - peak
    for j in range(top, base_y + 1):
        t = (j - top) / float(max(1, peak))
        hl = int(1 + t * half_l)
        hr = int(1 + t * half_r)
        cv.hline(x - hl, j, hl + hr, body)
        cv.set(x - hl, j, edge)
        cv.set(x + hr - 1, j, edge)
        if shade and (j - top) % 5 == 0:
            cv.set(x + 1, j, shade)
            cv.set(x - 2, j, shade)
    if snow:
        for j in range(max(0, top - 1), top + snow):
            t = (j - top) / float(max(1, peak))
            hl = int(1 + t * half_l)
            hr = int(1 + t * half_r)
            cv.hline(x - hl + 2, j, max(1, hl + hr - 5), 'g' if j < top + snow * 0.7 else 'h')


def range_far(cv, base_y, spec, body, edge):
    for x, peak, hl, hr, snow in spec:
        ridge(cv, base_y, x, peak, hl, hr, body, edge, snow)
    cv.hline(0, base_y, cv.w, edge)


def pine(cv, x, base_y, hgt, dark, mid, light):
    for j in range(hgt):
        t = j / float(hgt)
        half = int(1 + t * hgt * 0.5)
        c = dark if t < 0.5 else mid
        cv.hline(x - half, base_y - hgt + j, half * 2, c)
        cv.set(x - half, base_y - hgt + j, dark)
        cv.set(x + half - 1, base_y - hgt + j, dark)
        if j % 4 == 1:
            cv.set(x, base_y - hgt + j, light)
    cv.vline(x, base_y - 2, 3, dark)


def keep(cv, x, base_y, w=52, h=30):
    """城堡：主楼 + 两座塔 + 城垛 + 亮窗 + 两面旗 + 门前光池"""
    top = base_y - h
    cv.hline(x - 7, base_y, w + 14, 'l')
    cv.rect(x - 7, base_y + 1, w + 14, 4, 'a')
    cv.dither(x - 7, base_y + 1, w + 14, 4, 'b', 2, 1)
    cv.rect(x, top + 10, w, h - 10, 'i')
    cv.dither(x, top + 10, w, h - 10, 'j', 3, 0)
    cv.vline(x, top + 10, h - 10, 'k')
    cv.vline(x + w - 1, top + 10, h - 10, 'k')
    for i in range(x, x + w, 4):
        cv.rect(i, top + 7, 3, 4, 'j')
        cv.set(i, top + 7, 'k')
    for wy in range(top + 16, base_y - 6, 6):
        for wx in range(x + 6, x + w - 4, 8):
            cv.rect(wx, wy, 2, 3, 'w')
            cv.set(wx, wy, 'Y')
            cv.set(wx + 1, wy + 2, 'v')
    cv.rect(x + w // 2 - 4, base_y - 10, 9, 10, 'l')
    cv.rect(x + w // 2 - 3, base_y - 9, 7, 9, 'q')
    cv.rect(x + w // 2 - 2, base_y - 6, 5, 6, 'w')
    cv.set(x + w // 2, base_y - 4, 'W')
    for j in range(base_y + 1, base_y + 10):
        t = (j - base_y) / 10.0
        half = int(4 + t * 11)
        cv.dither(x + w // 2 - half, j, half * 2, 1, 'u', 2, 0)
    for tx, th in ((x - 11, h + 7), (x + w + 1, h + 3)):
        ttop = base_y - th
        cv.rect(tx, ttop + 6, 10, th - 6, 'i')
        cv.vline(tx, ttop + 6, th - 6, 'k')
        cv.vline(tx + 9, ttop + 6, th - 6, 'k')
        for i in range(tx, tx + 10, 4):
            cv.rect(i, ttop + 3, 3, 4, 'j')
        for k in range(9):
            wd = 10 - k * 2
            if wd > 0:
                cv.hline(tx + k // 2, ttop - 2 + k // 3, wd, 'K')
        cv.hline(tx, ttop + 2, 10, 'L')
        cv.vline(tx + 4, ttop - 10, 9, 'N')
        cv.rect(tx + 5, ttop - 10, 5, 4, 'r')
        cv.set(tx + 7, ttop - 9, 'Z')
        cv.set(tx + 7, ttop - 8, 'Z')
        cv.rect(tx + 4, ttop + 13, 2, 3, 'w')
        cv.rect(tx + 4, ttop + 22, 2, 3, 'w')


def campfire(cv, x, y):
    cv.rect(x - 6, y, 13, 2, 'l')
    cv.rect(x - 5, y - 1, 4, 1, 'q')
    cv.rect(x + 2, y - 1, 4, 1, 'q')
    cv.rect(x - 2, y - 6, 5, 5, 'F')
    cv.rect(x - 1, y - 9, 3, 4, 'Y')
    cv.set(x, y - 10, 'W')
    cv.set(x + 1, y - 7, 'W')
    cv.set(x - 2, y - 4, 'v')
    cv.dither(x - 8, y - 7, 17, 8, 'u', 5, 0)
    cv.dither(x - 12, y - 11, 25, 13, 'l', 7, 3)
    cv.dither(x - 5, y - 5, 11, 5, 'v', 3, 1)
    for ex, ey in ((x - 4, y - 13), (x + 3, y - 15), (x + 1, y - 18)):
        cv.set(ex, ey, 'Y')
        cv.set(ex + 1, ey + 1, 'F')


def make_cover():
    cv = Canvas(W, H, '0')
    # 夜空：五段渐变，抖动只放在上半天，避免在山脊上拉横条
    bands = ((0, 20, '0'), (20, 40, '1'), (40, 58, '2'), (58, 78, '3'), (78, HORIZON, '4'))
    for y0, y1, c in bands:
        cv.rect(0, y0, W, y1 - y0, c)
    cv.dither(0, 20, W, 4, '1', 3, 0)
    cv.dither(0, 38, W, 4, '2', 3, 1)
    cv.dither(0, 56, W, 4, '3', 3, 2)
    cv.dither(0, 76, W, 5, '4', 4, 0)
    # 星
    stars = [(9, 12), (23, 6), (37, 18), (52, 9), (66, 22), (81, 5), (95, 15), (110, 24),
             (124, 8), (139, 17), (152, 4), (166, 21), (180, 11), (196, 19), (210, 7),
             (224, 23), (238, 13), (252, 3), (266, 20), (280, 10), (295, 16), (308, 6),
             (17, 27), (44, 30), (88, 28), (131, 31), (175, 29), (243, 27), (287, 30),
             (60, 34), (105, 36), (150, 33), (200, 35), (230, 32), (270, 34),
             (205, 44), (128, 46), (18, 44), (298, 40)]
    for sx, sy in stars:
        cv.set(sx, sy, '*')
        if (sx * 7 + sy) % 4 == 0:
            cv.set(sx - 1, sy, 'x')
            cv.set(sx, sy + 1, 'x')
    # 星母之泪：短而亮的一划
    for k in range(15):
        cv.set(30 + k, 40 - k // 3, 'm' if k < 4 else ('n' if k < 7 else 'x'))
    # 月之女士的银月
    cv.disc(262, 30, 12, 'm')
    for cx, cy, r in ((257, 25, 2), (267, 35, 3), (259, 37, 2), (266, 24, 1)):
        cv.disc(cx, cy, r, 'o')
    cv.ring(262, 30, 13, 'n')
    for a in range(0, 360, 30):
        cv.set(int(262 + 18 * math.cos(math.radians(a))), int(30 + 18 * math.sin(math.radians(a))), '6')
    # 龙骨山脉：远层压 y=100，近层压地平线，峰间留出天光
    range_far(cv, 94, [(38, 24, 24, 16, 5), (98, 19, 20, 13, 4), (152, 28, 28, 18, 6),
                        (214, 20, 21, 13, 4), (272, 25, 25, 16, 5)], 'a', 'b')
    range_far(cv, HORIZON, [(16, 15, 20, 13, 0), (74, 21, 26, 16, 3), (128, 13, 18, 12, 0),
                            (186, 19, 24, 15, 3), (246, 15, 20, 13, 0), (304, 18, 23, 14, 3)], 'b', 'c')
    # 巨龙
    cv.blit(DRAGON, 92, 36)
    cv.set(119, 47, 'F')
    cv.set(120, 47, 'v')
    # 地面
    GROUND = H - BAR
    cv.rect(0, HORIZON, W, GROUND - HORIZON, 'S')
    cv.rect(0, HORIZON, W, 4, 's')
    cv.dither(0, HORIZON + 3, W, 8, 's', 2, 0)
    cv.dither(0, 124, W, 10, 's', 3, 1)
    # 林带：城堡左右各一片，中间留出城与路
    for x in range(0, 112, 7):
        pine(cv, x + 3, 126, 12 + (x % 5) * 2, 'g4', 'G', 'g2')
    for x in range(2, 96, 13):
        pine(cv, x + 5, 134, 18 + (x % 6) * 2, 'g4', 'G', 'g3')
    pine(cv, 10, 142, 26, 'g4', 'G', 'g3')
    for x in range(214, 320, 8):
        pine(cv, x + 4, 125, 11 + (x % 4) * 2, 'g4', 'G', 'g2')
    for x in range(224, 320, 15):
        pine(cv, x + 5, 133, 17 + (x % 5) * 2, 'g4', 'G', 'g3')
    pine(cv, 312, 142, 24, 'g4', 'G', 'g3')
    # 通往城门的路
    for j in range(HORIZON, GROUND):
        t = (j - HORIZON) / float(GROUND - HORIZON)
        half = int(3 + t * 28)
        cv.hline(176 - half, j, half * 2, 'q')
        cv.set(176 - half, j, 'Q')
        cv.set(176 + half - 1, j, 'Q')
        if j % 5 == 0:
            cv.dither(176 - half + 3, j, max(1, half * 2 - 6), 1, 'Q', 2, 0)
    # 城堡、营火、骑士
    keep(cv, 150, HORIZON)
    campfire(cv, 86, 140)
    cv.blit(KNIGHT, 148, 112)
    for i in range(11):
        cv.hline(149 + i + 1, 143, 12 - i, 'a')
    for j in range(0, 27):
        cv.set(168, 114 + j, 'u')
    cv.set(167, 118, 'v')
    # 草簇与碎石
    for gx, gy in [(14, 128), (33, 134), (58, 130), (84, 143), (108, 132), (132, 138),
                   (206, 128), (232, 136), (262, 131), (288, 141), (306, 129), (46, 141),
                   (104, 144), (240, 143), (274, 144), (120, 126), (196, 137), (252, 142)]:
        cv.set(gx, gy, 'g2')
        cv.set(gx + 1, gy - 1, 'G')
        cv.set(gx + 2, gy, 'g2')
    for rxp, ryp in [(30, 137), (66, 143), (120, 141), (222, 136), (284, 142), (176, 130)]:
        cv.set(rxp, ryp, 'c')
        cv.set(rxp + 1, ryp, 'd')
    # 画框：奶白莫兰迪面板 + 金线
    cv.rect(0, 0, W, 2, 'I')
    cv.rect(0, 2, W, 1, 'J')
    cv.rect(0, H - BAR - 3, W, 3, 'I')
    cv.rect(0, H - BAR - 4, W, 1, 'J')
    cv.rect(0, 0, 2, H, 'I')
    cv.rect(2, 0, 1, H, 'J')
    cv.rect(W - 2, 0, 2, H, 'I')
    cv.rect(W - 3, 0, 1, H, 'J')
    for cx, cy in ((5, 5), (W - 10, 5), (5, H - BAR - 12), (W - 10, H - BAR - 12)):
        cv.rect(cx, cy, 5, 5, 'J')
        cv.rect(cx + 1, cy + 1, 3, 3, 'I')
        cv.set(cx + 2, cy + 2, 'J')
        cv.rect(cx, cy, 5, 1, 'X')
    # 标题条底色（字由 Pillow 排）
    cv.rect(0, H - BAR, W, BAR, 'I')
    cv.rect(0, H - BAR + 1, W, 1, 'N')
    return cv


def make_icons():
    cell, pad = 16, 4
    cols = len(ICONS)
    cv = Canvas(cols * cell + pad * 2, cell + pad * 2 + 6, 'X')
    cv.rect(0, 0, cv.w, cv.h, 'X')
    for i, sp in enumerate(ICONS):
        cv.blit(sp, pad + i * cell, pad)
    cv.hline(0, cv.h - 3, cv.w, 'J')
    cv.hline(0, cv.h - 2, cv.w, 'I')
    cv.hline(0, cv.h - 1, cv.w, 'X')
    return cv


def write_png(path, cv, scale=1):
    w, h = cv.w * scale, cv.h * scale
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            c = P.get(cv.px[y // scale][x // scale]) or (0, 0, 0)
            raw += bytes(c)

    def chunk(tag, data):
        out = struct.pack('>I', len(data)) + tag + data
        return out + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    png += chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)
    return w, h


def add_title(path):
    """有 Pillow 时在标题条里排两行字（逻辑字号 x 放大倍数，得到像素字观感）"""
    try:
        from PIL import Image, ImageDraw, ImageFont
    except Exception:
        print('  （没装 Pillow，跳过标题字；画面本身不依赖它）')
        return False
    fp = next((f for f in ('C:/Windows/Fonts/msyhbd.ttc', 'C:/Windows/Fonts/msyh.ttc',
                           'C:/Windows/Fonts/simhei.ttf', 'C:/Windows/Fonts/simsun.ttc')
               if os.path.exists(f)), None)
    if not fp:
        print('  （找不到中文字体，跳过标题字）')
        return False
    img = Image.open(path).convert('RGB')
    w, h = img.size
    d = ImageDraw.Draw(img)
    big = ImageFont.truetype(fp, 13 * SCALE)
    small = ImageFont.truetype(fp, 5 * SCALE)
    title = '剑 与 魔 法 命 运 编 年 史'
    sub = 'AELDERAN · S.C.824 · 冷峻写实 · 高自由度 · 因果严明'
    tb = d.textbbox((0, 0), title, font=big)
    sb = d.textbbox((0, 0), sub, font=small)
    tw, sw = tb[2] - tb[0], sb[2] - sb[0]
    bar_top = h - BAR * SCALE
    d.text(((w - tw) // 2, bar_top + 3 * SCALE), title, font=big, fill=P['X'])
    d.text(((w - sw) // 2, bar_top + 20 * SCALE), sub, font=small, fill=(126, 118, 138))
    for x0, x1 in ((10 * SCALE, 42 * SCALE), (w - 42 * SCALE, w - 10 * SCALE)):
        d.rectangle([x0, bar_top + 16 * SCALE, x1, bar_top + 17 * SCALE], fill=P['J'])
    img.save(path)
    return True


def main():
    out = os.path.abspath(OUT)
    os.makedirs(out, exist_ok=True)
    cover = os.path.join(out, 'pixel-cover.png')
    w, h = write_png(cover, make_cover(), SCALE)
    print('pixel-cover.png  %dx%d' % (w, h))
    add_title(cover)
    icons = os.path.join(out, 'pixel-icons.png')
    w2, h2 = write_png(icons, make_icons(), 6)
    print('pixel-icons.png  %dx%d  (%s)' % (w2, h2, ', '.join(ICON_NAMES)))
    print('输出目录：' + out)


if __name__ == '__main__':
    main()

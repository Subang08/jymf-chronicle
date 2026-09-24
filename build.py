# -*- coding: utf-8 -*-
"""
《剑与魔法命运编年史》网页版 · 单文件打包器
把 build/ 下的片段拼成可直接双击运行的一个 HTML 文件，并做硬约束校验。

用法：  python build.py
输出：  剑与魔法命运编年史.html
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(ROOT, "build")
SHELL = os.path.join(BUILD, "shell.html")
CSS = os.path.join(BUILD, "style.css")
OUT = os.path.join(ROOT, "剑与魔法命运编年史.html")

# 依赖顺序：靠前先加载
ORDER = ["latex.js", "world.js", "geo.js", "tables.js", "narr.js", "engine.js", "panels.js", "improv.js", "map.js", "create.js", "game.js", "net.js"]

# 叙述面向的文件：AI 模板词句零容忍
STRICT_BAN_FILES = {"narr.js", "create.js", "panels.js", "game.js", "improv.js", "net.js", "shell.html", "style.css"}
BANNED = ["微不可查", "不易察觉", "不由得", "不禁", "随即", "片刻后", "只见", "就在这时",
          "深刻地", "无比", "极其", "格外", "至关", "关键性", "错综复杂", "交织",
          "谱写", "画卷", "织锦", "镌刻", "烙印"]
BANNED_PAT = [re.compile(r"不是[^。！？\n]{0,18}?而是"), re.compile(r"从来不是"), re.compile(r"不仅仅是")]

ALLOWED_SYMBOLS = set("◈✦✕◆◇─│〔〕【】·｜▸→←")
EMOJI_RANGES = [(0x1F000, 0x1FAFF), (0x2190, 0x21FF), (0x2300, 0x23FF), (0x2460, 0x24FF),
                (0x25A0, 0x25FF), (0x2600, 0x27BF), (0x2B00, 0x2BFF), (0xFE0F, 0xFE0F),
                (0x200D, 0x200D), (0x1F1E6, 0x1F1FF)]


def read(path):
    with io.open(path, "r", encoding="utf-8") as f:
        return f.read()


def write(path, text):
    with io.open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def find_emoji(text):
    hits = []
    for ch in text:
        cp = ord(ch)
        if ch in ALLOWED_SYMBOLS:
            continue
        for lo, hi in EMOJI_RANGES:
            if lo <= cp <= hi:
                hits.append((ch, hex(cp)))
                break
    return hits


def main():
    problems = []
    notes = []

    if not os.path.isfile(SHELL):
        print("缺少 build/shell.html")
        return 1
    shell = read(SHELL)
    css = read(CSS)

    parts = []
    for name in ORDER:
        p = os.path.join(BUILD, name)
        if not os.path.isfile(p):
            problems.append("缺少模块文件：build/%s" % name)
            continue
        src = read(p)
        parts.append("/* ================= %s ================= */\n%s" % (name, src))
        notes.append("%-12s %7d bytes" % (name, len(src.encode("utf-8"))))
    js = "\n\n".join(parts)

    # ---- 结构校验 ----
    if "/*__CSS__*/" not in shell:
        problems.append("shell.html 缺少 /*__CSS__*/ 占位")
    if "/*__JS__*/" not in shell:
        problems.append("shell.html 缺少 /*__JS__*/ 占位")
    if "</script>" in js:
        problems.append("JS 中出现 </script>，会截断脚本")
    if "</style>" in css:
        problems.append("CSS 中出现 </style>，会截断样式")
    if "__bootGame" not in js:
        problems.append("缺少 window.__bootGame 启动钩子")

    # ---- 零外链 ----
    both = shell + css + js
    for pat in ["http://", "https://", "@import", "<link", "src=", "fonts.googleapis",
                "cdn.", "unpkg", "jsdelivr"]:
        if pat in both:
            problems.append("出现外部资源痕迹：%s" % pat)
    for name in ORDER:
        p = os.path.join(BUILD, name)
        if os.path.isfile(p) and "Math.random(" in read(p):
            problems.append("%s 使用了 Math.random（必须走 ENG 种子随机）" % name)

    # ---- 零 emoji ----
    for label, text in (("JS", js), ("CSS", css), ("SHELL", shell)):
        hits = find_emoji(text)
        if hits:
            problems.append("%s 中出现 emoji/图形符号：%s" % (label, hits[:8]))

    # ---- 禁用模板词句 ----
    # 例外：net.js 里有一小段是「查禁用词的表」本身（BAN-GATE 标记区内），
    # 那些词必须原样存在才查得出来。只此一处，且限长，免得被当成藏文字的地方。
    for name in ORDER:
        p = os.path.join(BUILD, name)
        if not os.path.isfile(p):
            continue
        src = read(p)
        strict = name in STRICT_BAN_FILES
        scan = src
        # 两个受控放行区：BAN-GATE 放「查禁用词的表」，PROMPT-GATE 放「禁止写成什么样的说明书」。
        # 两处都只允许出现一次并限长，免得变成藏正文的地方。
        for tag, cap in (("BAN-GATE", 1600), ("PROMPT-GATE", 6000)):
            if tag + "-BEGIN" in src:
                blocks = re.findall(tag + r"-BEGIN(.*?)" + tag + r"-END", src, re.S)
                total = sum(len(b) for b in blocks)
                if len(blocks) != 1 or total > cap:
                    problems.append("%s 的 %s 标记区异常：%d 处 / %d 字节（只允许一处、不超过 %d 字节）" % (name, tag, len(blocks), total, cap))
                scan = re.sub(tag + r"-BEGIN.*?" + tag + r"-END", "", scan, flags=re.S)
        bad = [w for w in BANNED if w in scan]
        badpat = [r.pattern for r in BANNED_PAT if r.search(scan)]
        if bad or badpat:
            msg = "%s 出现禁用词：%s %s" % (name, "/".join(bad), "/".join(badpat))
            if strict:
                problems.append(msg)
            else:
                notes.append("[提示] " + msg)
    for w in BANNED:
        if w in shell:
            problems.append("shell.html 出现禁用词：%s" % w)

    # ---- 关键实现自检 ----
    need = ["LTX", "WD", "GEO", "TB", "NARR", "ENG", "PANEL", "IMPROV", "MAP", "CREATE", "GAME", "AI"]
    for k in need:
        if ("global.%s" % k) not in js and ("window.%s" % k) not in js:
            problems.append("模块未挂载全局：%s" % k)

    # ---- 组装 ----
    html = shell.replace("/*__CSS__*/", css).replace("/*__JS__*/", js)
    write(OUT, html)

    print("=== 模块 ===")
    for n in notes:
        print("  " + n)
    print("=== 输出 ===")
    print("  %s  %d bytes" % (os.path.basename(OUT), len(html.encode("utf-8"))))
    print("  外部引用 0 处 · 面板渲染器 LTX · 模块 %d 个" % len(ORDER))
    if problems:
        print("=== 校验失败 ===")
        for p in problems:
            print("  [X] " + p)
        return 1
    print("=== 校验通过 ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())

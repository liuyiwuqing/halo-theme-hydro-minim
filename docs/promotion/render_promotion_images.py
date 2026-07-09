from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


OUT = Path(__file__).resolve().parent
BACKDROP = OUT / "hydro-minim-abstract-backdrop.png"

W, H = 1600, 900
PAPER = (243, 243, 243)
INK = (16, 17, 18)
MUTED = (16, 17, 18, 150)
LINE = (16, 17, 18, 36)
LINE_STRONG = (16, 17, 18, 86)
WHITE = (255, 255, 252)
CORAL = (255, 107, 107)
TEAL = (78, 205, 196)
YELLOW = (255, 230, 109)
DARK = (16, 17, 18)
DARK_INK = (245, 243, 239)

FONT_SANS = "/System/Library/Fonts/Hiragino Sans GB.ttc"
FONT_MONO = "/System/Library/Fonts/Menlo.ttc"
FONT_SF = "/System/Library/Fonts/SFNS.ttf"


def font(path: str, size: int, index: int = 0) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size, index=index)


def sans(size: int, index: int = 1) -> ImageFont.FreeTypeFont:
    return font(FONT_SANS, size, index=index)


def mono(size: int) -> ImageFont.FreeTypeFont:
    return font(FONT_MONO, size)


def alpha(color: tuple[int, int, int], a: int) -> tuple[int, int, int, int]:
    return (*color, a)


def composite(base: Image.Image, layer: Image.Image) -> Image.Image:
    base.alpha_composite(layer)
    return base


def rounded_rect(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int, int, int],
    radius: int,
    fill: tuple[int, ...],
    outline: tuple[int, ...] | None = None,
    width: int = 1,
) -> None:
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def text(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    value: str,
    fnt: ImageFont.FreeTypeFont,
    fill: tuple[int, ...] = INK,
    anchor: str | None = None,
) -> None:
    draw.text(xy, value, font=fnt, fill=fill, anchor=anchor)


def multiline(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    value: str,
    fnt: ImageFont.FreeTypeFont,
    fill: tuple[int, ...],
    spacing: int = 12,
) -> None:
    draw.multiline_text(xy, value, font=fnt, fill=fill, spacing=spacing)


def draw_hydro_mark(draw: ImageDraw.ImageDraw, x: int, y: int, size: int, dark: bool = False) -> None:
    scale = size / 128
    ink = DARK_INK if dark else INK
    soft = alpha(ink, 38 if dark else 34)
    accent = TEAL
    draw.ellipse((x + 17 * scale, y + 17 * scale, x + 111 * scale, y + 111 * scale), outline=soft, width=max(1, int(2 * scale)))
    draw.arc((x + 29 * scale, y + 50 * scale, x + 100 * scale, y + 104 * scale), 22, 158, fill=soft, width=max(2, int(10 * scale)))
    lw = max(3, int(9 * scale))
    draw.line((x + 45 * scale, y + 39 * scale, x + 45 * scale, y + 89 * scale), fill=ink, width=lw)
    draw.line((x + 83 * scale, y + 39 * scale, x + 83 * scale, y + 89 * scale), fill=ink, width=lw)
    draw.arc((x + 45 * scale, y + 45 * scale, x + 83 * scale, y + 78 * scale), 200, 340, fill=ink, width=lw)
    draw.arc((x + 25 * scale, y + 30 * scale, x + 44 * scale, y + 66 * scale), 115, 250, fill=ink, width=max(2, int(4 * scale)))
    draw.ellipse((x + 86 * scale, y + 29 * scale, x + 96 * scale, y + 39 * scale), fill=accent)
    draw.ellipse((x + 82 * scale, y + 25 * scale, x + 100 * scale, y + 43 * scale), outline=alpha(ink, 56), width=max(1, int(2 * scale)))


def base(light: bool = True) -> Image.Image:
    bg = Image.new("RGBA", (W, H), PAPER if light else DARK)
    d = ImageDraw.Draw(bg, "RGBA")
    grid = (16, 17, 18, 9) if light else (245, 243, 239, 9)
    for x in range(0, W, 86):
        d.line((x, 0, x, H), fill=grid)
    for y in range(0, H, 86):
        d.line((0, y, W, y), fill=grid)

    if BACKDROP.exists():
        backdrop = Image.open(BACKDROP).convert("RGBA").resize((W, H), Image.Resampling.LANCZOS)
        backdrop.putalpha(36 if light else 24)
        bg.alpha_composite(backdrop)

    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow, "RGBA")
    gd.ellipse((-140, -120, 520, 520), fill=(78, 205, 196, 34 if light else 28))
    gd.ellipse((1070, 520, 1780, 1180), fill=(255, 107, 107, 32 if light else 30))
    glow = glow.filter(ImageFilter.GaussianBlur(80))
    bg.alpha_composite(glow)

    random.seed(13)
    grain = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grain, "RGBA")
    for _ in range(6500):
        x = random.randrange(W)
        y = random.randrange(H)
        a = random.randrange(5, 16) if light else random.randrange(4, 13)
        gd.point((x, y), fill=(0, 0, 0, a) if light else (255, 255, 255, a))
    bg.alpha_composite(grain)
    return bg


def label(draw: ImageDraw.ImageDraw, x: int, y: int, value: str, dark: bool = False) -> None:
    color = (245, 243, 239, 144) if dark else (16, 17, 18, 132)
    line = (245, 243, 239, 78) if dark else LINE_STRONG
    draw.line((x, y + 11, x + 46, y + 11), fill=line, width=1)
    text(draw, (x + 62, y), value.upper(), mono(16), color)


def chip(draw: ImageDraw.ImageDraw, x: int, y: int, value: str) -> int:
    f = sans(15)
    box = draw.textbbox((0, 0), value, font=f)
    width = box[2] - box[0] + 36
    rounded_rect(draw, (x, y, x + width, y + 43), 22, (255, 255, 255, 118), LINE)
    text(draw, (x + 18, y + 12), value, f, (16, 17, 18, 178))
    return width


def save_flat(img: Image.Image, path: Path, background: tuple[int, int, int]) -> None:
    flattened = Image.new("RGBA", img.size, (*background, 255))
    flattened.alpha_composite(img)
    flattened.convert("RGB").save(path)


def draw_browser(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int) -> None:
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow, "RGBA")
    rounded_rect(sd, (x, y, x + w, y + h), 28, (0, 0, 0, 42))
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))
    draw.bitmap((0, 0), shadow, fill=None)
    rounded_rect(draw, (x, y, x + w, y + h), 28, (255, 255, 255, 136), (16, 17, 18, 52))
    for i in range(3):
        draw.ellipse((x + 28 + i * 21, y + 27, x + 38 + i * 21, y + 37), outline=(16, 17, 18, 86), width=1)
    rounded_rect(draw, (x + w - 280, y + 26, x + w - 60, y + 42), 9, (16, 17, 18, 12), (16, 17, 18, 24))

    mx, my = x + 24, y + 76
    media_w = int(w * 0.53)
    rounded_rect(draw, (mx, my, mx + media_w, y + h - 26), 18, (16, 17, 18, 16), (16, 17, 18, 44))
    draw.ellipse((mx + 80, my + 60, mx + media_w - 70, y + h - 84), outline=(16, 17, 18, 48), width=2)
    draw.ellipse((mx + 230, my + 94, mx + 430, my + 294), fill=(78, 205, 196, 42))
    rounded_rect(draw, (mx + media_w - 130, y + h - 72, mx + media_w - 36, y + h - 42), 16, (255, 255, 255, 92), (16, 17, 18, 44))
    text(draw, (mx + media_w - 104, y + h - 66), "氢视窗", sans(14), (16, 17, 18, 140))

    cx = mx + media_w + 32
    text(draw, (cx, y + h - 286), "探索", sans(78), INK)
    for i, width in enumerate([220, 280, 180]):
        rounded_rect(draw, (cx, y + h - 180 + i * 22, cx + width, y + h - 171 + i * 22), 5, (16, 17, 18, 28))
    items = ["数字设计的未来", "把博客写成一张轻纸", "在结构里保留呼吸"]
    for i, item in enumerate(items):
        yy = y + h - 88 + i * 34
        draw.line((cx, yy, x + w - 42, yy), fill=(16, 17, 18, 30), width=1)
        text(draw, (cx, yy + 10), f"{i + 1:02d}", mono(12), (16, 17, 18, 120))
        text(draw, (cx + 48, yy + 6), item, sans(16), INK)
        text(draw, (x + w - 110, yy + 10), "2026.06", mono(11), (16, 17, 18, 106))


def draw_mobile(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int) -> None:
    rounded_rect(draw, (x, y, x + w, y + h), 36, (255, 255, 255, 138), (16, 17, 18, 54), 2)
    rounded_rect(draw, (x + 18, y + 18, x + w - 18, y + h - 18), 26, PAPER + (255,), (16, 17, 18, 34))
    rounded_rect(draw, (x + 34, y + 34, x + w - 34, y + 78), 22, (255, 255, 255, 198), (16, 17, 18, 40))
    draw.ellipse((x + 42, y + 43, x + 68, y + 69), outline=(16, 17, 18, 42))
    draw.ellipse((x + w - 68, y + 43, x + w - 42, y + 69), outline=(16, 17, 18, 42))
    text(draw, (x + 38, y + 132), "轻量\n阅读流", sans(30), INK)
    for i, width in enumerate([150, 132, 164, 112]):
        rounded_rect(draw, (x + 38, y + 236 + i * 18, x + 38 + width, y + 244 + i * 18), 4, (16, 17, 18, 30))
    rounded_rect(draw, (x + 30, y + h - 76, x + w - 30, y + h - 30), 23, (255, 255, 255, 210), (16, 17, 18, 44))
    for i in range(4):
        rounded_rect(draw, (x + 44 + i * 45, y + h - 64, x + 72 + i * 45, y + h - 42), 11, (16, 17, 18, 14), (16, 17, 18, 32))


def poster_hero() -> None:
    img = base(True)
    d = ImageDraw.Draw(img, "RGBA")
    draw_hydro_mark(d, 72, 68, 72)
    text(d, (164, 70), "氢·简", sans(38), INK)
    text(d, (166, 116), "HYDRO-MINIM", mono(13), (16, 17, 18, 148))
    label(d, 72, 260, "Halo Theme / Minimal Blog")
    text(d, (72, 304), "轻盈克制的\nHalo 博客主题", sans(96), INK)
    multiline(d, (76, 542), "灰白纸面、细线、轻颗粒与低饱和动效，\n把内容放回第一位。", sans(27), (16, 17, 18, 172), 12)
    x = 76
    for value in ["Halo >= 2.25.0", "深浅色切换", "阅读进度", "插件页适配"]:
        x += chip(d, x, 658, value) + 12
    label(d, 72, 802, "Version 1.0.0-beta9")
    draw_browser(d, 750, 120, 760, 480)
    draw_mobile(d, 1250, 340, 250, 510)
    text(d, (1278, 842), "halo-theme-hydro-minim", mono(14), (16, 17, 18, 108))
    save_flat(img, OUT / "hydro-minim-promo-hero.png", PAPER)


def metric(draw: ImageDraw.ImageDraw, x: int, y: int, title: str, body: str, idx: int) -> None:
    rounded_rect(draw, (x, y, x + 346, y + 168), 20, (255, 255, 255, 124), LINE)
    text(draw, (x + 24, y + 22), f"{idx:02d}", mono(42), INK)
    text(draw, (x + 24, y + 82), title, sans(22), INK)
    multiline(draw, (x + 24, y + 116), body, sans(14), (16, 17, 18, 148), 5)


def poster_features() -> None:
    img = base(True)
    d = ImageDraw.Draw(img, "RGBA")
    label(d, 74, 72, "Feature Matrix")
    text(d, (74, 116), "从首页到插件页，\n都不是摆设", sans(72), INK)
    multiline(d, (990, 122), "Hero、文章阅读、分类标签、归档搜索、\n友链瞬间图库和文档页，一套视觉系统全覆盖。", sans(23), (16, 17, 18, 166), 10)
    items = [
        ("Hydro 首页", "图片/视频 Hero，精选文章，\n最新文章，分类模块和关于模块。"),
        ("阅读系统", "目录、进度、侧向操作栏，\n移动端底部阅读条和相关文章。"),
        ("发现页面", "分类目录、云朵标签、年份归档，\n页面搜索和推荐文章。"),
        ("传播能力", "文章海报、瞬间海报、复制链接，\n点赞、评论和灯箱。"),
    ]
    for idx, (title, body) in enumerate(items, 1):
        metric(d, 74 + (idx - 1) * 364, 350, title, body, idx)
    rounded_rect(d, (74, 560, 660, 800), 22, (255, 255, 255, 114), LINE)
    label(d, 104, 592, "Mobile First Enough")
    text(d, (104, 646), "手机端不硬塞侧栏", sans(34), INK)
    for i, width in enumerate([430, 360, 280]):
        rounded_rect(d, (104, 718 + i * 20, 104 + width, 728 + i * 20), 5, (16, 17, 18, 28))
    strip = [
        ("搜索插件皮肤", "适配 PluginSearchWidget，\n弹窗和页面两种入口。"),
        ("渐进式图片外壳", "图库和正文图片加载失败\n也不破坏布局。"),
        ("HydroNotice", "统一胶囊提示 API，\n方便插件和脚本复用。"),
    ]
    for i, (title, body) in enumerate(strip):
        x = 690 + i * 274
        rounded_rect(d, (x, 560, x + 252, 800), 20, (255, 255, 255, 104), LINE)
        text(d, (x + 22, 602), title, sans(22), INK)
        multiline(d, (x + 22, 648), body, sans(15), (16, 17, 18, 150), 7)
    text(d, (1190, 840), "Theme functions based on current source", mono(14), (16, 17, 18, 108))
    save_flat(img, OUT / "hydro-minim-promo-features.png", PAPER)


def poster_settings() -> None:
    img = base(True)
    d = ImageDraw.Draw(img, "RGBA")
    label(d, 74, 72, "Operator-Minded Settings")
    text(d, (74, 116), "按站长运营思路\n组织配置", sans(72), INK)
    multiline(d, (960, 122), "品牌、视觉、导航、首页、内容、插件、高级设置。\n后台配置跟使用场景走。", sans(23), (16, 17, 18, 166), 10)
    rounded_rect(d, (74, 330, 700, 800), 26, (255, 255, 255, 128), LINE)
    draw_hydro_mark(d, 112, 368, 60)
    text(d, (190, 370), "主题配置", sans(30), INK)
    text(d, (192, 410), "HALO CONSOLE", mono(12), (16, 17, 18, 140))
    rows = [
        ("identity", "品牌与站点"),
        ("motion", "视觉与动效"),
        ("navigation", "导航与结构"),
        ("content", "内容页面"),
        ("plugins", "插件页面"),
    ]
    for i, (key, name) in enumerate(rows):
        y = 470 + i * 58
        rounded_rect(d, (112, y, 662, y + 44), 16, (255, 255, 255, 106), (16, 17, 18, 28))
        text(d, (132, y + 13), key, mono(12), (16, 17, 18, 126))
        text(d, (250, y + 8), name, sans(20), INK)
        rounded_rect(d, (590, y + 9, 638, y + 35), 13, (78, 205, 196, 56), (16, 17, 18, 40))
        d.ellipse((612, y + 13, 630, y + 31), fill=INK)
    rounded_rect(d, (744, 330, 1526, 800), 28, (255, 255, 255, 86), LINE)
    d.ellipse((1000, 418, 1390, 808), outline=(16, 17, 18, 34), width=2)
    d.ellipse((1148, 522, 1408, 782), fill=(255, 107, 107, 42), outline=(16, 17, 18, 28))
    d.ellipse((1038, 448, 1250, 660), fill=(78, 205, 196, 46), outline=(16, 17, 18, 28))
    pills = [("深浅色光幕过渡", CORAL), ("Hero 图片跟随", TEAL), ("文章卡片 3D Hover", YELLOW), ("页面级快捷操作", CORAL)]
    for i, (name, color) in enumerate(pills):
        y = 410 + i * 70
        rounded_rect(d, (820, y, 1188, y + 48), 24, (255, 255, 255, 170), LINE)
        text(d, (844, y + 12), name, sans(18), INK)
        d.ellipse((1144, y + 13, 1168, y + 37), fill=color)
    text(d, (1288, 840), "docs/theme-usage-guide.md", mono(14), (16, 17, 18, 108))
    save_flat(img, OUT / "hydro-minim-promo-settings.png", PAPER)


def plugin_card(draw: ImageDraw.ImageDraw, x: int, y: int, idx: int, title: str, body: str) -> None:
    rounded_rect(draw, (x, y, x + 180, y + 154), 20, (245, 243, 239, 16), (245, 243, 239, 36))
    draw.ellipse((x + 22, y + 22, x + 64, y + 64), outline=(245, 243, 239, 54), width=1)
    text(draw, (x + 36, y + 35), f"{idx:02d}", mono(14), alpha(TEAL, 255))
    text(draw, (x + 22, y + 84), title, sans(21), DARK_INK)
    multiline(draw, (x + 22, y + 116), body, sans(12), (245, 243, 239, 148), 4)


def poster_plugins() -> None:
    img = base(False)
    d = ImageDraw.Draw(img, "RGBA")
    label(d, 74, 72, "Halo Plugin Pages", dark=True)
    text(d, (74, 116), "插件缺失不炸页，\n插件可用就成体系", sans(70), DARK_INK)
    multiline(d, (940, 122), "友链、瞬间、图库、装备、朋友圈、追番、Steam 和 Docsme 文档，\n都有 Hydro-Minim 的页面语言。", sans(23), (245, 243, 239, 166), 10)
    rounded_rect(d, (74, 330, 830, 806), 28, (245, 243, 239, 16), (245, 243, 239, 36))
    for i in range(3):
        d.ellipse((108 + i * 22, 362, 118 + i * 22, 372), outline=(245, 243, 239, 88))
    rounded_rect(d, (500, 360, 780, 376), 8, (245, 243, 239, 28))
    timeline = [("06.11", "瞬间时间线"), ("06.08", "图库灯箱"), ("06.01", "Docsme 文档目录")]
    for i, (date, title) in enumerate(timeline):
        y = 430 + i * 110
        d.line((108, y, 780, y), fill=(245, 243, 239, 30), width=1)
        text(d, (108, y + 22), date, mono(14), (245, 243, 239, 110))
        rounded_rect(d, (196, y + 18, 760, y + 92), 18, (245, 243, 239, 15), (245, 243, 239, 32))
        text(d, (220, y + 34), title, sans(22), DARK_INK)
        for j, width in enumerate([380, 280]):
            rounded_rect(d, (220, y + 66 + j * 14, 220 + width, y + 74 + j * 14), 4, (245, 243, 239, 34))
    plugins = [
        ("友链", "站点信息、在线提交、修改申请。"),
        ("瞬间", "时间线、标签、点赞、评论、海报。"),
        ("图库", "分组、分页、瀑布流、灯箱。"),
        ("Docsme", "文档中心、目录、详情页、评论。"),
        ("Steam", "最近游玩、游戏库、外链缓存。"),
        ("装备", "硬件、软件和创作工具清单。"),
        ("朋友圈", "订阅源动态流和分页。"),
        ("追番", "番剧条目展示和评论区。"),
    ]
    for i, (title, body) in enumerate(plugins):
        col = i % 4
        row = i // 4
        plugin_card(d, 862 + col * 184, 330 + row * 174, i + 1, title, body)
    text(d, (1290, 840), "Hydro Content Surface", mono(14), (245, 243, 239, 100))
    save_flat(img, OUT / "hydro-minim-promo-plugins.png", DARK)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    poster_hero()
    poster_features()
    poster_settings()
    poster_plugins()


if __name__ == "__main__":
    main()

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


OUT = Path("/Users/linfeng/Desktop/project/output/imagegen/story_app_mockup.png")

W, H = 1920, 1080
BG = (250, 242, 236)
INK = (39, 41, 45)
MUTED = (151, 151, 151)
ORANGE = (255, 138, 58)
ORANGE_SOFT = (255, 211, 178)
GREEN = (169, 214, 160)
BLUE = (183, 207, 213)
CARD = (255, 255, 255)

FONT_SF = "/System/Library/Fonts/SFNS.ttf"
FONT_SF_ROUNDED = "/System/Library/Fonts/SFNSRounded.ttf"
FONT_CJK = "/System/Library/Fonts/Hiragino Sans GB.ttc"


def font(size, bold=False):
    path = FONT_SF_ROUNDED if bold else FONT_SF
    try:
        return ImageFont.truetype(path, size, index=0)
    except OSError:
        return ImageFont.truetype(FONT_CJK, size)


def cjk(size, bold=False):
    try:
        return ImageFont.truetype(FONT_CJK, size, index=1 if bold else 0)
    except OSError:
        return font(size, bold)


def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def shadow(base, box, radius=28, offset=(0, 14), blur=26, alpha=42):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x1, y1, x2, y2 = box
    d.rounded_rectangle((x1 + offset[0], y1 + offset[1], x2 + offset[0], y2 + offset[1]), radius, fill=(110, 90, 70, alpha))
    base.alpha_composite(layer.filter(ImageFilter.GaussianBlur(blur)))


def text(draw, xy, s, f, fill=INK, anchor=None):
    draw.text(xy, s, font=f, fill=fill, anchor=anchor)


def fit_text(draw, box, s, f, fill=INK, anchor="mm"):
    x1, y1, x2, y2 = box
    maxw = x2 - x1 - 24
    size = f.size
    while draw.textbbox((0, 0), s, font=f)[2] > maxw and size > 18:
        size -= 2
        f = font(size, True)
    draw.text(((x1 + x2) / 2, (y1 + y2) / 2), s, font=f, fill=fill, anchor=anchor)


def left_fit_text(draw, xy, maxw, s, size, fill=INK, bold=True):
    f = font(size, bold)
    while draw.textbbox((0, 0), s, font=f)[2] > maxw and size > 12:
        size -= 1
        f = font(size, bold)
    text(draw, xy, s, f, fill=fill)


def draw_speaker(draw, cx, cy, scale=1.0):
    s = scale
    body = [(cx - 13 * s, cy - 7 * s), (cx - 6 * s, cy - 7 * s), (cx + 3 * s, cy - 14 * s), (cx + 3 * s, cy + 14 * s), (cx - 6 * s, cy + 7 * s), (cx - 13 * s, cy + 7 * s)]
    draw.polygon(body, fill=(40, 46, 52))
    draw.arc((cx + 2 * s, cy - 13 * s, cx + 22 * s, cy + 13 * s), -48, 48, fill=(74, 197, 206), width=max(1, int(3 * s)))
    draw.arc((cx + 8 * s, cy - 20 * s, cx + 34 * s, cy + 20 * s), -42, 42, fill=(139, 225, 230), width=max(1, int(3 * s)))


def draw_trash(draw, cx, cy, scale=1.0):
    s = scale
    draw.rounded_rectangle((cx - 10 * s, cy - 11 * s, cx + 10 * s, cy + 13 * s), radius=2 * s, outline=(68, 68, 74), width=max(1, int(2 * s)))
    draw.line((cx - 13 * s, cy - 14 * s, cx + 13 * s, cy - 14 * s), fill=(68, 68, 74), width=max(1, int(2 * s)))
    draw.line((cx - 5 * s, cy - 17 * s, cx + 5 * s, cy - 17 * s), fill=(68, 68, 74), width=max(1, int(2 * s)))
    for dx in (-5, 0, 5):
        draw.line((cx + dx * s, cy - 7 * s, cx + dx * s, cy + 9 * s), fill=(108, 108, 112), width=max(1, int(1 * s)))


def draw_book(draw, x, y, scale=1.0):
    s = scale
    draw.rounded_rectangle((x, y, x + 28 * s, y + 24 * s), radius=2 * s, outline=(210, 72, 54), width=max(1, int(2 * s)))
    draw.line((x + 14 * s, y + 2 * s, x + 14 * s, y + 23 * s), fill=(90, 90, 90), width=max(1, int(1 * s)))
    for i in range(3):
        yy = y + (6 + i * 5) * s
        draw.line((x + 4 * s, yy, x + 11 * s, yy + 2 * s), fill=(130, 130, 130), width=max(1, int(1 * s)))
        draw.line((x + 17 * s, yy + 2 * s, x + 25 * s, yy), fill=(130, 130, 130), width=max(1, int(1 * s)))


def draw_status(draw, x, y, w):
    text(draw, (x + 34, y + 34), "04:29", font(22), fill=(64, 64, 64))
    text(draw, (x + w - 178, y + 34), "N  Bluetooth  4G  54", font(14), fill=(58, 58, 58))
    rounded(draw, (x + w - 92, y + 22, x + w - 52, y + 42), 5, None, outline=(66, 66, 66), width=2)
    rounded(draw, (x + w - 88, y + 26, x + w - 62, y + 38), 3, (85, 85, 85))


def mini_program_menu(draw, x, y, wide=False):
    ww = 176 if not wide else 222
    rounded(draw, (x, y, x + ww, y + 48), 24, (255, 255, 255), outline=(239, 232, 226), width=1)
    if wide:
        text(draw, (x + 48, y + 27), "翻译", cjk(20), fill=INK, anchor="mm")
        draw.line((x + 88, y + 10, x + 88, y + 38), fill=(239, 232, 226), width=1)
        text(draw, (x + 122, y + 27), "•••", font(24, True), fill=INK, anchor="mm")
        draw.line((x + 164, y + 10, x + 164, y + 38), fill=(239, 232, 226), width=1)
        draw.ellipse((x + 184, y + 11, x + 222 - 12, y + 37), outline=INK, width=5)
    else:
        text(draw, (x + 52, y + 25), "•••", font(24, True), fill=INK, anchor="mm")
        draw.line((x + 92, y + 10, x + 92, y + 38), fill=(239, 232, 226), width=1)
        draw.ellipse((x + 124, y + 11, x + 154, y + 41), outline=INK, width=5)


def card(draw, base, box, radius=18):
    shadow(base, box, radius=radius, offset=(0, 10), blur=18, alpha=28)
    rounded(draw, box, radius, CARD)


def story_card(draw, base, x, y, w, h, color, title, level, words):
    card(draw, base, (x, y, x + w, y + h), 18)
    rounded(draw, (x, y, x + w, y + 145), 18, color)
    draw.rectangle((x, y + 110, x + w, y + 145), fill=color)
    fit_text(draw, (x + 10, y + 20, x + w - 10, y + 125), title, font(26, True), fill=(64, 70, 70))
    left_fit_text(draw, (x + 24, y + 185), w - 48, title, 25, fill=INK)
    text(draw, (x + 24, y + 235), level, font(23), fill=INK)
    text(draw, (x + 112, y + 237), f"{words} words", font(18), fill=MUTED)


def phone_canvas(base, pos, scale=1.0, kind="home"):
    pw, ph = int(430 * scale), int(930 * scale)
    x, y = pos
    shadow(base, (x, y, x + pw, y + ph), radius=42, offset=(0, 20), blur=36, alpha=38)
    rounded(ImageDraw.Draw(base), (x, y, x + pw, y + ph), 42, BG)
    draw = ImageDraw.Draw(base)
    draw_status(draw, x, y + 10, pw)
    if kind == "home":
        mini_program_menu(draw, x + 210, y + 72, wide=True)
        draw_book(draw, x + 36, y + 173, 1.0)
        text(draw, (x + 76, y + 178), "今天读什么故事?", cjk(28, True), fill=INK)
        text(draw, (x + 34, y + 222), "选一个故事，大声读出来吧!", cjk(17), fill=(165, 158, 151))
        levels = [("L1", "Seed", GREEN), ("L2", "Leaf", (235, 229, 216)), ("L3", "Bird", (235, 229, 216)), ("L4", "River", (235, 229, 216))]
        for i, (a, b, col) in enumerate(levels):
            lx = x + 32 + i * 94
            rounded(draw, (lx, y + 270, lx + 72, y + 334), 16, col)
            text(draw, (lx + 36, y + 296), a, font(20, True), fill=INK, anchor="mm")
            text(draw, (lx + 36, y + 320), b, font(14), fill=(65, 65, 65), anchor="mm")
        text(draw, (x + 34, y + 390), "最近阅读", cjk(23, True), fill=INK)
        story_card(draw, base, x + 34, y + 440, 190, 254, (255, 183, 72), "The Friendly Dragon", "L4 River", 73)
        story_card(draw, base, x + 246, y + 440, 190, 254, BLUE, "The Magic Paintbrush", "L5 Cloud", 120)
        text(draw, (x + 34, y + 750), "L1 · Seed", font(28, True), fill=INK)
        story_card(draw, base, x + 34, y + 800, 176, 232, GREEN, "The Red Apple", "L1 Seed", 15)
        story_card(draw, base, x + 230, y + 800, 176, 232, GREEN, "My Cat", "L1 Seed", 16)
        draw.rectangle((x, y + ph - 74, x + pw, y + ph), fill=(255, 255, 255))
        text(draw, (x + pw * .27, y + ph - 38), "故事", cjk(22), fill=ORANGE, anchor="mm")
        text(draw, (x + pw * .73, y + ph - 38), "生词本", cjk(22), fill=(145, 145, 145), anchor="mm")
    elif kind == "vocab":
        mini_program_menu(draw, x + 226, y + 72)
        text(draw, (x + pw / 2, y + 118), "我的生词本", cjk(25), fill=(8, 8, 8), anchor="mm")
        items = [("see", "VERB", "看见"), ("red", "NOUN", "红色的"), ("the", "ADVERB", "With a comparative or with more\nand a verb phrase, establishes a\ncorrelation with one or more other\nsuch comparatives."), ("is", "", ""), ("big", "NOUN", "大的")]
        cy = y + 170
        for word, pos, meaning in items:
            h = 140 if word != "the" else 245
            card(draw, base, (x + 26, cy, x + pw - 26, cy + h), 18)
            text(draw, (x + 50, cy + 42), word, font(30, True), fill=INK)
            if pos:
                text(draw, (x + 50, cy + 76), pos, font(15, True), fill=ORANGE)
            if "\n" in meaning:
                yy = cy + 112
                for line in meaning.splitlines():
                    text(draw, (x + 50, yy), line, font(20), fill=(62, 62, 65))
                    yy += 34
            else:
                text(draw, (x + 50, cy + 112), meaning, cjk(21), fill=(62, 62, 65))
            draw.ellipse((x + pw - 88, cy + 36, x + pw - 50, cy + 74), fill=(248, 248, 248))
            draw_speaker(draw, x + pw - 69, cy + 55, 0.58)
            draw.ellipse((x + pw - 88, cy + 88, x + pw - 50, cy + 126), fill=(255, 241, 241))
            draw_trash(draw, x + pw - 69, cy + 107, 0.62)
            cy += h + 24
        draw.rectangle((x, y + ph - 74, x + pw, y + ph), fill=(255, 255, 255))
        text(draw, (x + pw * .27, y + ph - 38), "故事", cjk(22), fill=(145, 145, 145), anchor="mm")
        text(draw, (x + pw * .73, y + ph - 38), "生词本", cjk(22), fill=ORANGE, anchor="mm")
    elif kind == "reading":
        mini_program_menu(draw, x + 226, y + 72)
        text(draw, (x + 32, y + 122), "‹", font(44), fill=INK)
        rounded(draw, (x + 182, y + 88, x + 252, y + 120), 16, ORANGE_SOFT)
        text(draw, (x + 217, y + 105), "L1 Seed", font(15, True), fill=ORANGE, anchor="mm")
        text(draw, (x + 28, y + 172), "The Red Apple", font(36, True), fill=INK)
        lines = ["I  see  a  red  apple .", "The  apple  is  big .", "I  eat  the  apple .", "It  is  good !"]
        yy = y + 288
        for line in lines:
            text(draw, (x + 42, yy), line, font(30), fill=(37, 40, 40))
            yy += 118
        draw.rectangle((x, y + ph - 110, x + pw, y + ph), fill=(255, 250, 246))
        card(draw, base, (x + 20, y + ph - 94, x + 350, y + ph - 22), 34)
        draw.ellipse((x + 44, y + ph - 80, x + 104, y + ph - 20), fill=ORANGE)
        text(draw, (x + 76, y + ph - 50), "▶", font(30, True), fill=(255, 255, 255), anchor="mm")
        draw.line((x + 128, y + ph - 52, x + 326, y + ph - 52), fill=(235, 228, 216), width=5)
        text(draw, (x + 128, y + ph - 29), "0:00 / 0:00", font(14), fill=MUTED)
        draw_book(draw, x + 371, y + ph - 75, 0.88)
        text(draw, (x + 385, y + ph - 30), "生词本", cjk(14), fill=(112, 112, 112), anchor="mm")
    else:
        mini_program_menu(draw, x + 226, y + 72)
        text(draw, (x + 32, y + 122), "‹", font(44), fill=INK)
        rounded(draw, (x + 182, y + 88, x + 252, y + 120), 16, ORANGE_SOFT)
        text(draw, (x + 217, y + 105), "L1 Seed", font(15, True), fill=ORANGE, anchor="mm")
        text(draw, (x + 28, y + 172), "The Red Apple", font(36, True), fill=INK)
        text(draw, (x + 42, y + 288), "I  see  a  red  apple .", font(30), fill=(37, 40, 40))
        text(draw, (x + 42, y + 406), "The  apple  is", font(30), fill=(37, 40, 40))
        rounded(draw, (x + 250, y + 380, x + 306, y + 456), 10, ORANGE_SOFT)
        text(draw, (x + 278, y + 420), "big", font(30), fill=(202, 87, 12), anchor="mm")
        text(draw, (x + 310, y + 406), ".", font(30), fill=(37, 40, 40))
        text(draw, (x + 42, y + 524), "I  eat  the  apple .", font(30), fill=(37, 40, 40))
        text(draw, (x + 42, y + 642), "It  is  good !", font(30), fill=(37, 40, 40))
        card(draw, base, (x, y + ph - 270, x + pw, y + ph), 26)
        text(draw, (x + 36, y + ph - 205), "big", font(39, True), fill=INK)
        text(draw, (x + 128, y + ph - 194), "/big/", font(22), fill=(115, 115, 115))
        draw.ellipse((x + pw - 82, y + ph - 220, x + pw - 40, y + ph - 178), fill=(255, 243, 225))
        draw_speaker(draw, x + pw - 61, y + ph - 199, 0.58)
        text(draw, (x + 36, y + ph - 156), "NOUN", font(18, True), fill=ORANGE)
        text(draw, (x + 36, y + ph - 108), "大的", cjk(24), fill=INK)
        rounded(draw, (x + pw - 160, y + ph - 78, x + pw - 34, y + ph - 36), 20, (255, 244, 229))
        text(draw, (x + pw - 97, y + ph - 57), "★ 已收藏", cjk(17, True), fill=ORANGE, anchor="mm")


def main():
    img = Image.new("RGBA", (W, H), BG + (255,))
    draw = ImageDraw.Draw(img)
    for i, col in enumerate([(255, 236, 215, 180), (222, 241, 232, 160), (255, 245, 227, 180)]):
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        d.ellipse((120 + i * 540, 60 + i * 80, 900 + i * 540, 760 + i * 90), fill=col)
        img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(80)))

    text(draw, (86, 76), "英语小故事 · App UI Mockup", cjk(42, True), fill=INK)
    text(draw, (90, 132), "阅读分级、故事卡片、生词本与点词释义界面", cjk(22), fill=(105, 100, 94))

    phone_canvas(img, (82, 190), kind="home")
    phone_canvas(img, (540, 148), kind="vocab")
    phone_canvas(img, (998, 190), kind="reading")
    phone_canvas(img, (1456, 148), kind="popup")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(OUT, quality=95)
    print(OUT)


if __name__ == "__main__":
    main()

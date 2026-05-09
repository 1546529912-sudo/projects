from pathlib import Path
from random import Random
from math import sin, cos, radians

from PIL import Image, ImageDraw, ImageFilter


OUT_DIR = Path("/Users/linfeng/Desktop/project/英语小故事/miniprogram/images/story-covers")
W, H = 750, 420


COVERS = [
    "the-red-apple",
    "my-cat",
    "the-sun",
    "my-dog",
    "the-ball",
    "the-big-tree",
    "my-room",
    "the-fish",
    "i-can-move",
    "the-moon",
]


def a(rgb, alpha=255):
    return (*rgb, alpha)


def ellipse_layer(img, box, fill, blur=0):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse(box, fill=fill)
    if blur:
        layer = layer.filter(ImageFilter.GaussianBlur(blur))
    img.alpha_composite(layer)


def polygon_layer(img, points, fill, blur=0):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.polygon(points, fill=fill)
    if blur:
        layer = layer.filter(ImageFilter.GaussianBlur(blur))
    img.alpha_composite(layer)


def brush_line(img, points, fill, width=6, blur=0):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.line(points, fill=fill, width=width, joint="curve")
    if blur:
        layer = layer.filter(ImageFilter.GaussianBlur(blur))
    img.alpha_composite(layer)


def rounded_layer(img, box, radius, fill, blur=0):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle(box, radius=radius, fill=fill)
    if blur:
        layer = layer.filter(ImageFilter.GaussianBlur(blur))
    img.alpha_composite(layer)


def bg(seed, palette="warm"):
    rng = Random(seed)
    top, bottom = {
        "warm": ((255, 224, 161), (255, 242, 216)),
        "sky": ((183, 225, 246), (255, 240, 210)),
        "mint": ((203, 234, 210), (255, 239, 207)),
        "room": ((255, 232, 197), (247, 222, 190)),
        "water": ((112, 198, 227), (196, 236, 231)),
        "night": ((31, 54, 90), (28, 42, 72)),
    }[palette]
    img = Image.new("RGBA", (W, H), a(bottom))
    pix = img.load()
    for y in range(H):
        t = y / (H - 1)
        col = tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
        for x in range(W):
            pix[x, y] = a(col)

    for _ in range(28):
        cx = rng.randint(-120, W + 120)
        cy = rng.randint(-90, H + 90)
        rx = rng.randint(90, 260)
        ry = rng.randint(45, 145)
        col = rng.choice([(255, 255, 242), (255, 217, 151), (245, 240, 195), (208, 234, 220)])
        alpha = rng.randint(20, 58) if palette != "night" else rng.randint(10, 28)
        ellipse_layer(img, (cx - rx, cy - ry, cx + rx, cy + ry), a(col, alpha), blur=rng.randint(18, 42))

    if palette != "night":
        draw_clouds(img, alpha=120)
        ellipse_layer(img, (-90, 304, 840, 520), a((255, 235, 190), 90), blur=26)
    return img


def add_paper_texture(img, seed):
    rng = Random(seed)
    noise = Image.new("RGBA", img.size, (0, 0, 0, 0))
    p = noise.load()
    for y in range(H):
        for x in range(W):
            n = rng.randint(0, 255)
            if n < 80:
                p[x, y] = (120, 95, 58, 5)
            elif n > 225:
                p[x, y] = (255, 255, 255, 7)
    img.alpha_composite(noise.filter(ImageFilter.GaussianBlur(0.35)))


def shadow(img, box, alpha=55, blur=18, yoff=14):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse((box[0], box[1] + yoff, box[2], box[3] + yoff), fill=(105, 74, 38, alpha))
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(blur)))


def draw_clouds(img, alpha=145):
    d = ImageDraw.Draw(img)
    for x, y, s in [(44, 118, 1.25), (560, 140, 1.3), (470, 80, 0.72)]:
        col = a((255, 255, 245), alpha)
        d.ellipse((x, y + 28, x + 88 * s, y + 80 * s), fill=col)
        d.ellipse((x + 42 * s, y, x + 132 * s, y + 84 * s), fill=col)
        d.ellipse((x + 104 * s, y + 34, x + 190 * s, y + 88 * s), fill=col)


def paint_leaf(img, cx, cy, w, h, angle=-20, color=(91, 152, 78), alpha=230):
    d = ImageDraw.Draw(img)
    pts = []
    for i in range(18):
        t = i / 17
        x = -w / 2 + w * t
        y = -sin(t * 3.14159) * h / 2
        pts.append((x, y))
    for i in range(17, -1, -1):
        t = i / 17
        x = -w / 2 + w * t
        y = sin(t * 3.14159) * h / 2
        pts.append((x, y))
    ca, sa = cos(radians(angle)), sin(radians(angle))
    rot = [(cx + x * ca - y * sa, cy + x * sa + y * ca) for x, y in pts]
    polygon_layer(img, rot, a(color, alpha), blur=0.4)
    d.line((cx - w * 0.35 * ca, cy - w * 0.35 * sa, cx + w * 0.35 * ca, cy + w * 0.35 * sa), fill=a((66, 118, 61), 135), width=max(2, int(w / 20)))


def paint_flower(d, x, y, s=1.0):
    for deg in range(0, 360, 60):
        px = x + cos(radians(deg)) * 12 * s
        py = y + sin(radians(deg)) * 8 * s
        d.ellipse((px - 10 * s, py - 7 * s, px + 10 * s, py + 7 * s), fill=a((255, 250, 232), 220))
    d.ellipse((x - 6 * s, y - 6 * s, x + 6 * s, y + 6 * s), fill=a((238, 178, 58), 230))


def grass_field(img, seed, dense=False):
    rng = Random(seed)
    d = ImageDraw.Draw(img)
    ellipse_layer(img, (-70, 262, 820, 500), a((183, 216, 145), 160), blur=12)
    count = 90 if dense else 46
    for _ in range(count):
        x = rng.randint(-10, W + 10)
        y = rng.randint(266, H + 18)
        h = rng.randint(22, 80 if dense else 54)
        col = rng.choice([(99, 154, 74), (138, 181, 92), (174, 197, 112), (83, 134, 73)])
        d.line((x, y, x + rng.randint(-16, 16), y - h), fill=a(col, rng.randint(105, 190)), width=rng.randint(2, 5))
    if dense:
        for x, y, s in [(72, 332, 1.15), (128, 286, .9), (594, 328, 1.0), (646, 272, .75), (512, 358, .82)]:
            paint_flower(d, x, y, s)


def glossy_eye(d, x, y, size=26):
    d.ellipse((x, y, x + size, y + size), fill=a((40, 54, 48), 245))
    d.ellipse((x + size * 0.22, y + size * 0.18, x + size * 0.48, y + size * 0.44), fill=a((255, 255, 245), 230))


def blush(d, x, y, w=34):
    d.ellipse((x, y, x + w, y + w * 0.55), fill=a((246, 125, 103), 68))


def finish(img, name):
    add_paper_texture(img, name)
    out = Image.new("RGB", (W, H), (255, 246, 232))
    out.paste(img.convert("RGB"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / f"{name}.jpg"
    quality = 80
    out.save(path, "JPEG", quality=quality, optimize=True, progressive=True)
    while path.stat().st_size > 100 * 1024 and quality > 42:
        quality -= 4
        out.save(path, "JPEG", quality=quality, optimize=True, progressive=True)
    return path, quality, path.stat().st_size


def draw_apple(img):
    d = ImageDraw.Draw(img)
    ellipse_layer(img, (-80, -60, 420, 330), a((149, 190, 113), 70), blur=36)
    ellipse_layer(img, (300, 60, 760, 400), a((228, 239, 200), 86), blur=42)
    brush_line(img, [(0, 112), (116, 74), (246, 108), (388, 78)], a((92, 76, 45), 235), width=18, blur=.4)
    brush_line(img, [(0, 126), (118, 86), (248, 120), (386, 92)], a((151, 103, 55), 120), width=9, blur=.8)
    for leaf in [
        (62, 48, 122, 72, 30, (75, 139, 76)),
        (104, 122, 132, 84, -18, (90, 158, 78)),
        (210, 54, 104, 66, 12, (91, 151, 76)),
        (282, 112, 118, 74, -28, (119, 176, 91)),
        (28, 188, 124, 76, 24, (79, 143, 78)),
    ]:
        paint_leaf(img, *leaf)
    shadow(img, (256, 290, 512, 360), alpha=40)
    d.line((366, 128, 356, 76), fill=a((99, 70, 39), 245), width=12)
    d.line((374, 126, 364, 76), fill=a((174, 122, 66), 120), width=5)
    d.ellipse((256, 116, 404, 314), fill=a((221, 67, 48), 250))
    d.ellipse((344, 110, 502, 318), fill=a((207, 55, 43), 250))
    d.ellipse((300, 92, 456, 326), fill=a((234, 78, 52), 250))
    for box, col, blur in [
        ((294, 108, 392, 280), (255, 139, 82), 12),
        ((382, 126, 470, 320), (173, 43, 38), 14),
        ((276, 232, 382, 332), (173, 48, 38), 10),
    ]:
        ellipse_layer(img, box, a(col, 68), blur=blur)
    for x in [314, 344, 382]:
        d.arc((x, 118, x + 70, 298), 96, 238, fill=a((255, 174, 104), 54), width=6)
    ellipse_layer(img, (330, 126, 390, 214), a((255, 226, 165), 118), blur=8)
    paint_leaf(img, 406, 70, 96, 54, -6, (101, 168, 83), 240)
    d.ellipse((432, 112, 468, 134), fill=a((48, 38, 30), 245))
    d.ellipse((434, 108, 464, 132), fill=a((229, 82, 52), 245))
    d.line((449, 108, 449, 132), fill=a((55, 38, 30), 210), width=2)
    for lx in [438, 446, 456, 464]:
        d.line((lx, 128, lx - 6, 138), fill=a((45, 35, 28), 180), width=2)


def draw_cat(img):
    d = ImageDraw.Draw(img)
    ellipse_layer(img, (30, 24, 710, 372), a((201, 236, 190), 62), blur=32)
    grass_field(img, "cat-grass", dense=True)
    shadow(img, (248, 318, 522, 378), alpha=38)
    d.ellipse((282, 240, 496, 410), fill=a((104, 95, 78), 245))
    d.ellipse((326, 266, 452, 412), fill=a((238, 229, 207), 246))
    for x in [302, 338, 432, 468]:
        d.arc((x - 22, 238, x + 28, 410), 106, 242, fill=a((50, 47, 42), 130), width=7)
    d.ellipse((250, 122, 514, 350), fill=a((118, 103, 82), 248))
    d.polygon([(288, 154), (336, 42), (386, 166)], fill=a((120, 103, 84), 246))
    d.polygon([(414, 166), (472, 42), (504, 170)], fill=a((120, 103, 84), 246))
    d.polygon([(314, 146), (338, 82), (366, 154)], fill=a((245, 157, 132), 220))
    d.polygon([(440, 154), (468, 82), (488, 156)], fill=a((245, 157, 132), 220))
    d.ellipse((298, 158, 470, 344), fill=a((237, 226, 204), 252))
    ellipse_layer(img, (318, 242, 454, 356), a((255, 247, 226), 178), blur=3)
    for x, y, w in [(286, 122, 22), (312, 112, 18), (342, 120, 15), (410, 120, 15), (438, 112, 18), (468, 124, 22)]:
        d.arc((x, y, x + w, y + 148), 104, 244, fill=a((48, 47, 42), 145), width=6)
    for x in [326, 406]:
        d.ellipse((x, 196, x + 48, 248), fill=a((47, 65, 48), 255))
        d.ellipse((x + 7, 202, x + 40, 240), fill=a((116, 155, 78), 235))
        d.ellipse((x + 13, 205, x + 25, 218), fill=a((255, 255, 242), 245))
        d.ellipse((x + 28, 223, x + 35, 231), fill=a((255, 255, 242), 180))
    blush(d, 294, 252, 38)
    blush(d, 444, 252, 38)
    d.polygon([(380, 260), (398, 260), (389, 276)], fill=a((224, 120, 112), 245))
    d.arc((362, 270, 388, 294), 10, 170, fill=a((61, 53, 47), 215), width=4)
    d.arc((388, 270, 414, 294), 10, 170, fill=a((61, 53, 47), 215), width=4)
    for y in [258, 270, 282]:
        d.line((306, y, 244, y - 16), fill=a((64, 58, 51), 130), width=2)
        d.line((448, y, 512, y - 16), fill=a((64, 58, 51), 130), width=2)
    d.ellipse((318, 352, 374, 404), fill=a((232, 220, 199), 240))
    d.ellipse((410, 352, 466, 404), fill=a((232, 220, 199), 240))
    for x in [336, 352, 428, 444]:
        d.line((x, 378, x - 8, 398), fill=a((84, 72, 58), 90), width=2)
    for _x, _y, _s in [(214, 352, 1.0), (538, 342, .9), (586, 292, .72), (156, 304, .78)]:
        paint_flower(d, _x, _y, _s)
    for x in range(0, W, 18):
        h = 26 + (x * 9) % 58
        d.line((x, 420, x + ((x % 5) - 2) * 4, 420 - h), fill=a((85, 143, 72), 170), width=3)
    d.polygon([(622, 78), (650, 96), (630, 110)], fill=a((247, 210, 86), 180))
    d.polygon([(650, 96), (682, 80), (670, 112)], fill=a((247, 210, 86), 180))


def draw_sun(img):
    d = ImageDraw.Draw(img)
    ellipse_layer(img, (172, 30, 584, 376), a((255, 208, 82), 70), blur=24)
    shadow(img, (286, 282, 466, 330), alpha=30)
    cx, cy = 376, 176
    for deg in range(0, 360, 20):
        d.line(
            (
                cx + cos(radians(deg)) * 82,
                cy + sin(radians(deg)) * 82,
                cx + cos(radians(deg)) * 142,
                cy + sin(radians(deg)) * 142,
            ),
            fill=a((255, 183, 64), 135),
            width=12,
        )
    d.ellipse((260, 60, 492, 292), fill=a((255, 208, 80), 250))
    ellipse_layer(img, (302, 100, 454, 246), a((255, 233, 132), 125), blur=6)
    glossy_eye(d, 320, 152, 26)
    glossy_eye(d, 410, 152, 26)
    blush(d, 304, 196, 38)
    blush(d, 420, 196, 38)
    d.arc((332, 182, 424, 240), 20, 160, fill=a((138, 87, 42), 195), width=6)


def draw_dog(img):
    d = ImageDraw.Draw(img)
    ellipse_layer(img, (170, 58, 586, 386), a((255, 208, 133), 62), blur=26)
    shadow(img, (242, 306, 520, 370), alpha=42)
    d.ellipse((250, 142, 510, 350), fill=a((207, 142, 78), 248))
    d.ellipse((304, 172, 456, 336), fill=a((248, 216, 164), 250))
    d.ellipse((208, 148, 314, 292), fill=a((139, 92, 58), 240))
    d.ellipse((448, 148, 554, 292), fill=a((139, 92, 58), 240))
    for x in [322, 416]:
        glossy_eye(d, x, 204, 32)
    blush(d, 296, 248, 34)
    blush(d, 440, 248, 34)
    d.ellipse((350, 238, 414, 284), fill=a((83, 58, 43), 245))
    d.arc((342, 262, 382, 306), 10, 170, fill=a((65, 50, 42), 205), width=5)
    d.arc((382, 262, 422, 306), 10, 170, fill=a((65, 50, 42), 205), width=5)
    d.arc((452, 276, 576, 354), 205, 35, fill=a((194, 126, 66), 235), width=16)


def draw_ball(img):
    d = ImageDraw.Draw(img)
    ellipse_layer(img, (174, 54, 588, 382), a((255, 223, 149), 58), blur=26)
    shadow(img, (252, 282, 500, 348), alpha=38)
    d.ellipse((250, 72, 502, 324), fill=a((255, 252, 229), 250))
    d.pieslice((250, 72, 502, 324), 220, 320, fill=a((236, 78, 67), 248))
    d.pieslice((250, 72, 502, 324), 36, 140, fill=a((90, 159, 219), 248))
    d.pieslice((250, 72, 502, 324), 320, 36, fill=a((255, 202, 84), 248))
    d.pieslice((250, 72, 502, 324), 140, 220, fill=a((108, 185, 112), 248))
    d.ellipse((330, 154, 422, 246), fill=a((255, 252, 230), 250))
    d.arc((286, 104, 470, 306), 260, 40, fill=a((255, 255, 255), 118), width=10)


def draw_big_tree(img):
    d = ImageDraw.Draw(img)
    ellipse_layer(img, (110, 34, 650, 386), a((255, 215, 130), 48), blur=24)
    shadow(img, (238, 320, 526, 380), alpha=38)
    d.rounded_rectangle((338, 178, 414, 370), radius=34, fill=a((138, 92, 54), 248))
    d.line((354, 224, 300, 170), fill=a((138, 92, 54), 236), width=20)
    d.line((392, 216, 470, 150), fill=a((138, 92, 54), 236), width=20)
    for box, col in [
        ((208, 50, 438, 238), (118, 185, 91)),
        ((318, 32, 560, 238), (94, 166, 86)),
        ((260, 116, 526, 316), (139, 202, 105)),
        ((168, 144, 370, 320), (106, 180, 92)),
    ]:
        d.ellipse(box, fill=a(col, 240))
    for x, y in [(288, 102), (400, 86), (462, 160), (314, 226), (224, 198)]:
        ellipse_layer(img, (x, y, x + 40, y + 24), a((209, 231, 143), 118), blur=2)


def draw_room(img):
    d = ImageDraw.Draw(img)
    ellipse_layer(img, (110, 36, 652, 382), a((255, 220, 154), 68), blur=24)
    d.rectangle((0, 292, W, H), fill=a((236, 213, 185), 230))
    d.rounded_rectangle((78, 82, 266, 212), radius=18, fill=a((204, 232, 240), 248), outline=a((255, 255, 247), 190), width=8)
    d.line((172, 88, 172, 206), fill=a((255, 255, 247), 180), width=5)
    d.line((84, 148, 260, 148), fill=a((255, 255, 247), 180), width=5)
    shadow(img, (356, 300, 640, 362), alpha=28)
    d.rounded_rectangle((352, 168, 642, 328), radius=30, fill=a((154, 208, 168), 248))
    d.rectangle((382, 254, 612, 348), fill=a((255, 244, 224), 248))
    d.ellipse((408, 120, 518, 230), fill=a((255, 203, 94), 230))
    d.rounded_rectangle((104, 250, 308, 344), radius=22, fill=a((255, 171, 116), 248))
    d.rectangle((128, 220, 286, 274), fill=a((255, 238, 214), 248))
    d.ellipse((548, 104, 608, 164), fill=a((255, 212, 92), 230))


def draw_fish(img):
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        d.line((0, y, W, y), fill=a((int(105 + 70 * t), int(198 + 28 * t), int(226 + 10 * t))))
    for x in range(-40, W, 92):
        d.arc((x, 120, x + 94, 194), 210, 330, fill=a((255, 255, 255), 72), width=4)
    ellipse_layer(img, (170, 70, 580, 360), a((255, 220, 126), 34), blur=22)
    shadow(img, (218, 286, 548, 350), alpha=22)
    d.polygon([(492, 182), (622, 112), (622, 256)], fill=a((255, 155, 72), 242))
    d.ellipse((174, 108, 532, 306), fill=a((255, 197, 75), 248))
    d.polygon([(260, 108), (342, 44), (366, 150)], fill=a((255, 146, 74), 226))
    d.polygon([(284, 300), (374, 356), (378, 260)], fill=a((255, 146, 74), 226))
    glossy_eye(d, 424, 164, 34)
    blush(d, 396, 218, 36)
    d.arc((380, 210, 462, 262), 18, 120, fill=a((151, 84, 45), 170), width=5)
    d.arc((112, 132, 336, 302), 292, 68, fill=a((255, 255, 255), 70), width=9)


def draw_move(img):
    d = ImageDraw.Draw(img)
    ellipse_layer(img, (160, 48, 596, 384), a((255, 213, 126), 52), blur=26)
    shadow(img, (268, 322, 488, 376), alpha=32)
    d.ellipse((294, 80, 456, 242), fill=a((255, 204, 92), 248))
    glossy_eye(d, 326, 126, 32)
    glossy_eye(d, 386, 126, 32)
    blush(d, 308, 176, 34)
    blush(d, 416, 176, 34)
    d.arc((344, 166, 410, 210), 20, 160, fill=a((124, 75, 44), 200), width=5)
    d.line((374, 240, 374, 314), fill=a((88, 143, 221), 248), width=30)
    d.line((302, 264, 226, 214), fill=a((88, 143, 221), 235), width=18)
    d.line((446, 264, 526, 214), fill=a((88, 143, 221), 235), width=18)
    d.line((358, 314, 304, 368), fill=a((69, 116, 195), 235), width=18)
    d.line((392, 314, 464, 354), fill=a((69, 116, 195), 235), width=18)
    d.arc((198, 184, 278, 244), 195, 340, fill=a((255, 153, 83), 170), width=6)
    d.arc((496, 184, 576, 244), 195, 340, fill=a((255, 153, 83), 170), width=6)


def draw_moon(img):
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        d.line((0, y, W, y), fill=a((int(36 - 8 * t), int(58 - 14 * t), int(92 - 18 * t))))
    for x, y, r in [(110, 94, 9), (214, 54, 5), (590, 84, 7), (662, 194, 5), (152, 276, 6), (530, 318, 4)]:
        d.polygon([(x, y - r), (x + r, y), (x, y + r), (x - r, y)], fill=a((255, 224, 117), 230))
    ellipse_layer(img, (204, 44, 548, 334), a((255, 216, 118), 35), blur=24)
    d.ellipse((278, 64, 520, 306), fill=a((255, 224, 132), 248))
    d.ellipse((354, 30, 584, 260), fill=a((34, 56, 89), 255))
    d.ellipse((316, 128, 348, 160), fill=a((213, 173, 90), 95))
    d.ellipse((282, 210, 330, 252), fill=a((213, 173, 90), 75))
    d.arc((306, 128, 430, 244), 98, 226, fill=a((255, 255, 255), 48), width=5)
    d.ellipse((-30, 330, 780, 500), fill=a((48, 75, 83), 245))


DRAWERS = {
    "the-red-apple": (draw_apple, "warm"),
    "my-cat": (draw_cat, "sky"),
    "the-sun": (draw_sun, "sky"),
    "my-dog": (draw_dog, "sky"),
    "the-ball": (draw_ball, "sky"),
    "the-big-tree": (draw_big_tree, "mint"),
    "my-room": (draw_room, "room"),
    "the-fish": (draw_fish, "water"),
    "i-can-move": (draw_move, "sky"),
    "the-moon": (draw_moon, "night"),
}


def main():
    for name in COVERS:
        drawer, palette = DRAWERS[name]
        img = bg(name, palette)
        drawer(img)
        path, quality, size = finish(img, name)
        print(f"{path} quality={quality} size={size}")


if __name__ == "__main__":
    main()

"""
Generation assets HydroGateway v2 - design propre
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ASSETS = Path("assets")
ASSETS.mkdir(exist_ok=True)

NAVY  = (10,  35,  66,  255)
GOLD  = (201, 168, 87,  255)
WHITE = (255, 255, 255, 255)
BLUE  = (29,  200, 255, 255)
LIGHT = (160, 185, 210, 255)
TRANSP = (0,  0,   0,   0  )


def font(size, bold=False):
    for name in (["arialbd.ttf","DejaVuSans-Bold.ttf"] if bold
                 else ["arial.ttf","DejaVuSans.ttf"]):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default(size)


def alpha_draw(img, draw_fn):
    """Dessine sur un overlay transparent puis alpha-composite sur img."""
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    draw_fn(d)
    return Image.alpha_composite(img, overlay)


def draw_drop(img, cx, cy_center, r, color):
    """Goutte d'eau : cercle bas + triangle vers le haut."""
    def fn(d):
        tip_y    = cy_center - r - r // 2
        left_x   = cx - r
        right_x  = cx + r
        join_y   = cy_center - r // 4
        # Triangle (pointe en haut, base au centre du cercle)
        d.polygon([(cx, tip_y), (left_x, join_y), (right_x, join_y)], fill=color)
        # Cercle bas arrondi
        d.ellipse([cx - r, cy_center - r, cx + r, cy_center + r], fill=color)
    return alpha_draw(img, fn)


def draw_wifi(img, cx, cy, max_r, color, lw=14):
    """Arcs WiFi concentriques (ouverture vers le bas)."""
    def fn(d):
        for scale in [0.45, 0.70, 1.0]:
            rr = int(max_r * scale)
            d.arc([cx - rr, cy - rr, cx + rr, cy + rr],
                  start=215, end=325, fill=color, width=lw)
        # Point central
        dp = lw // 2 + 2
        d.ellipse([cx - dp, cy - dp, cx + dp, cy + dp], fill=color)
    return alpha_draw(img, fn)


def draw_ring(img, cx, cy, r, color, width=4):
    def fn(d):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=width)
    return alpha_draw(img, fn)


def centered_text(img, text, y, fnt, color):
    W = img.width
    tmp = ImageDraw.Draw(img)
    bb = tmp.textbbox((0, 0), text, font=fnt)
    x = (W - (bb[2] - bb[0])) // 2

    def fn(d):
        d.text((x, y), text, font=fnt, fill=color)
    return alpha_draw(img, fn)


# ─────────────────────────────────────────────
# ICON 1024x1024
# ─────────────────────────────────────────────
def make_icon(path, transparent_bg=False):
    W = H = 1024
    bg = TRANSP if transparent_bg else NAVY
    img = Image.new("RGBA", (W, H), bg)

    cx = W // 2   # 512

    # ── Anneau or subtil (ne déborde pas) ──
    img = draw_ring(img, cx, cx, 430, (*GOLD[:3], 55), width=3)

    # ── Goutte bleue : cercle bas centré à y=500, r=200 ──
    # Tip de la goutte : y = 500 - 200 - 100 = 200  (marge haut = 200px)
    # Bas de la goutte : y = 500 + 200 = 700
    drop_r  = 200
    drop_cy = 500
    img = draw_drop(img, cx, drop_cy, drop_r, (*BLUE[:3], 235))

    # ── Reflet discret (haut-gauche de la goutte) ──
    def reflet(d):
        d.ellipse([cx - 90, drop_cy - 150, cx - 30, drop_cy - 90],
                  fill=(*WHITE[:3], 50))
    img = alpha_draw(img, reflet)

    # ── Arcs WiFi blancs dans la partie haute de la goutte ──
    # Centré à y = 500 - 200 + 80 = 380  (bien à l'intérieur)
    wifi_cy = drop_cy - drop_r + 80   # 380
    img = draw_wifi(img, cx, wifi_cy, 95, (*WHITE[:3], 215), lw=12)

    # ── Texte "HG" en or : baseline y=740 ──
    # Bas du texte ≈ 740+130=870  →  marge basse = 154px
    fnt_hg = font(130, bold=True)
    text_y = drop_cy + drop_r + 40   # 740
    img = centered_text(img, "HG", text_y, fnt_hg, GOLD)

    img.save(path, "PNG")
    print(f"OK {path}  (1024x1024)")


# ─────────────────────────────────────────────
# SPLASH 1284x2778
# ─────────────────────────────────────────────
def make_splash(path):
    W, H = 1284, 2778
    img = Image.new("RGBA", (W, H), NAVY)

    cx = W // 2
    mid_y = H // 2 - 160   # contenu centré visuellement (légèrement au-dessus du centre)

    # Goutte
    drop_r  = 160
    drop_cy = mid_y + 40
    img = draw_drop(img, cx, drop_cy, drop_r, (*BLUE[:3], 235))

    # Reflet
    def ref2(d):
        d.ellipse([cx - drop_r//2, drop_cy - drop_r//2 - 10,
                   cx - drop_r//6, drop_cy - drop_r//6 - 10],
                  fill=(*WHITE[:3], 50))
    img = alpha_draw(img, ref2)

    # Arcs WiFi blancs
    wifi_cy = drop_cy - drop_r + 40
    img = draw_wifi(img, cx, wifi_cy, 75, (*WHITE[:3], 200), lw=9)

    # Titre
    title_y = drop_cy + drop_r + 50
    fnt_title = font(105, bold=True)
    img = centered_text(img, "HydroGateway", title_y, fnt_title, WHITE)

    # Sous-titre or
    sub_y = title_y + 125
    fnt_sub = font(54)
    img = centered_text(img, "Paiements Mobile Money CI", sub_y, fnt_sub, GOLD)

    # Ligne or
    line_y = sub_y + 90
    def bar(d):
        bw = 260
        d.rounded_rectangle([(cx - bw//2, line_y), (cx + bw//2, line_y + 6)],
                             radius=3, fill=GOLD)
    img = alpha_draw(img, bar)

    # Bas de page
    fnt_by = font(46)
    img = centered_text(img, "by HYDROSCOPE PRO", H - 200, fnt_by, LIGHT)

    img.save(path, "PNG")
    print(f"OK {path}  (1284x2778)")


# ─────────────────────────────────────────────
make_icon(ASSETS / "icon.png",          transparent_bg=False)
make_icon(ASSETS / "adaptive-icon.png", transparent_bg=True)
make_splash(ASSETS / "splash.png")
print("Done.")

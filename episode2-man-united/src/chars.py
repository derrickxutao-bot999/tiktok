"""Cut-out characters in a vintage editorial style.

Every figure is built from flat polygons with an irregular ink outline that is
slightly out of register with the fill, like an old two-pass print. A pose is a
dict of joint positions in figure units (adult ~700 tall, y down, origin at the
pelvis); `Figure.svg` maps it to screen pixels.

Views: "back" (seen from behind), "front" (three-quarter front, nose to the
left), "side" (profile, facing left). Mirror with flip=True.
"""
import math, random
from style import C

INK_PX = 2.6     # outline width on screen
JIT_PX = 0.7     # outline wobble on screen
REG = (1.6, 1.1) # fill offset from ink, screen px


def _shade(hexcol, k=0.8):
    h = hexcol.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return "#%02X%02X%02X" % (int(r * k), int(g * k * .97), int(b * k * .97))


def _pts(p):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in p)


class Canvas:
    def __init__(self):
        self.parts = []

    def add(self, s):
        self.parts.append(s)


class Figure:
    def __init__(self, kind):
        self.kind = kind
        k = kind
        self.hair = C["hair"]
        self.skin = C["skin"]
        self.shirt = C["red"]
        self.trouser = C["charcoal"]
        self.shoe = C["ink"]
        self.hairstyle = "flick"
        self.head_s = 1.32
        self.body_s = 1.0
        self.nose = 1.0
        self.scarf = False
        self.collar = C["paper"]
        self.cap = False
        self.tache = False
        if k == "child":
            self.head_s = 1.6; self.body_s = 0.6; self.nose = 0.7; self.trouser = "#4F5A63"
        elif k == "teen":
            self.head_s = 1.4; self.body_s = 0.95; self.nose = 0.9; self.trouser = "#4A4E55"
        elif k == "father":
            self.shirt = C["red_d"]; self.hairstyle = "short"; self.hair = C["hair_f"]
            self.cap = True; self.tache = True; self.nose = 1.15; self.trouser = "#5E574E"
            self.coat = C["ochre"]
        elif k == "oldfather":   # the father in 2026: grey, no cap, a little smaller
            self.shirt = C["red_d"]; self.hairstyle = "short"; self.hair = "#B8B2A8"
            self.tache = True; self.nose = 1.15; self.trouser = "#5E574E"; self.coat = "#6E655A"
            self.body_s = 0.96
        elif k == "mate1":
            self.shirt = "#5D6B73"; self.hairstyle = "bowl"; self.hair = "#6B4A2E"; self.nose = 0.9
            self.skin = "#E8C29C"; self.collar = None
        elif k == "mate2":
            self.shirt = C["ochre_d"]; self.hairstyle = "curly"; self.hair = "#1F1A18"; self.nose = 1.05
            self.skin = "#B98760"; self.collar = None

    # ---------------------------------------------------------------- drawing
    def svg(self, pose, x, y, s, view="back", flip=False, seed=0, expr=None, extra=None):
        """Return SVG fragment for this figure at screen (x, y), scale s."""
        s = s * self.body_s
        self._x, self._y, self._s, self._f = x, y, s, (-1 if flip else 1)
        self._rng = random.Random(seed * 7919 + hash(self.kind) % 1000)
        self._out = []
        self.view = view
        self.expr = expr or {}
        draw = {"back": self._draw_back, "front": self._draw_front, "side": self._draw_side}[view]
        draw(pose)
        if extra:
            extra(self, pose)
        return "\n".join(self._out)

    def tr(self, p):
        return (self._x + self._f * p[0] * self._s, self._y + p[1] * self._s)

    def poly(self, pts, fill, ink=True, inkw=1.0, close=True):
        sp = [self.tr(p) for p in pts]
        if fill:
            fp = [(a + REG[0], b + REG[1]) for a, b in sp]
            self._out.append(f'<polygon points="{_pts(fp)}" fill="{fill}"/>')
        if ink:
            j = lambda: self._rng.uniform(-JIT_PX, JIT_PX)
            ip = [(a + j(), b + j()) for a, b in sp]
            tag = "polygon" if close else "polyline"
            self._out.append(f'<{tag} points="{_pts(ip)}" fill="none" stroke="{C["ink"]}" '
                             f'stroke-width="{INK_PX * inkw:.2f}" stroke-linejoin="miter" stroke-miterlimit="3" stroke-linecap="round"/>')

    def line(self, a, b, w=1.0, col=None):
        self.poly([a, b], None, ink=True, inkw=w, close=False)

    def dot(self, p, r):
        x, y = self.tr(p)
        self._out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r * self._s:.2f}" fill="{C["ink"]}"/>')

    # ---------------------------------------------------------------- helpers
    @staticmethod
    def _limb(a, b, wa, wb):
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L, dx / L
        return [(a[0] + nx * wa, a[1] + ny * wa), (b[0] + nx * wb, b[1] + ny * wb),
                (b[0] - nx * wb, b[1] - ny * wb), (a[0] - nx * wa, a[1] - ny * wa)]

    def _head_tf(self, pose, pts):
        """Place head-local points at the neck with tilt and head scale."""
        nx, ny = pose["neck"]
        a = math.radians(pose.get("tilt", 0))
        s = self.head_s
        ca, sa = math.cos(a), math.sin(a)
        return [(nx + (px * ca - py * sa) * s, ny + (px * sa + py * ca) * s) for px, py in pts]

    def _arm(self, sh, el, ha, sleeve=True, coat=None):
        top = coat or self.shirt
        if sleeve and not coat:
            mid = ((sh[0] + el[0]) / 2 + (el[0] - sh[0]) * .15, (sh[1] + el[1]) / 2 + (el[1] - sh[1]) * .15)
            self.poly(self._limb(mid, el, 9, 8), self.skin)
            self.poly(self._limb(el, ha, 8, 6.5), self.skin)
            self.poly(self._limb(sh, mid, 15, 13), top)
            if self.collar:
                self.line(self._limb(sh, mid, 15, 13)[1], self._limb(sh, mid, 15, 13)[2], .8)
        else:
            self.poly(self._limb(sh, el, 14, 12), top)
            self.poly(self._limb(el, ha, 12, 10), top)
        # mitten hand
        dx, dy = ha[0] - el[0], ha[1] - el[1]
        L = math.hypot(dx, dy) or 1
        ux, uy = dx / L, dy / L
        nx, ny = -uy, ux
        h = [(ha[0] + nx * 7, ha[1] + ny * 7), (ha[0] + ux * 20 + nx * 6, ha[1] + uy * 20 + ny * 6),
             (ha[0] + ux * 24 - nx * 2, ha[1] + uy * 24 - ny * 2), (ha[0] + ux * 10 - nx * 8, ha[1] + uy * 10 - ny * 8),
             (ha[0] - nx * 7, ha[1] - ny * 7)]
        self.poly(h, self.skin)

    def _leg(self, hip, kn, ft, facing=-1, sole=True):
        self.poly(self._limb(hip, kn, 17, 13), self.trouser)
        self.poly(self._limb(kn, ft, 13, 10), self.trouser)
        if sole:
            fx, fy = ft
            shoe = [(fx - 10 * (facing < 0) - 6, fy - 6), (fx + 10, fy - 8), (fx + 12, fy + 6)] if False else None
            if facing == 0:  # seen from front/back: short wedge
                shoe = [(fx - 13, fy - 4), (fx + 13, fy - 4), (fx + 15, fy + 9), (fx - 15, fy + 9)]
            else:
                d = facing
                shoe = [(fx - 12 * d, fy - 6), (fx + 8 * d, fy - 8), (fx + 34 * d, fy + 4), (fx + 34 * d, fy + 10), (fx - 14 * d, fy + 10)]
            self.poly(shoe, self.shoe)

    def _torso(self, pose, front=0.0, sw=46, ww=36, hw=40, length_extra=0, col=None):
        nx, ny = pose["neck"]; px, py = pose["pelvis"]
        dx, dy = nx - px, ny - py
        L = math.hypot(dx, dy) or 1
        ux, uy = dx / L, dy / L          # up the spine
        rx, ry = -uy, ux                  # to figure's right (screen left when facing camera)
        P = lambda a, b: (px + ux * a + rx * b, py + uy * a + ry * b)
        f = front
        pts = [P(L, -14 + f), P(L - 8, -sw + f * .6), P(L - 46, -ww - 2 + f), P(L * .45, -ww + f * .7),
               P(-length_extra, -hw), P(-length_extra, hw), P(L * .45, ww - f * .2), P(L - 46, ww + 2 - f * .3),
               P(L - 8, sw - f * .2), P(L, 14 - f * .2)]
        self.poly(pts, col or self.shirt)
        # flat shadow panel on the figure's left flank + one ink fold
        base = col or self.shirt
        sh = _shade(base)
        self.poly([P(L - 10, sw - 12 - f * .2), P(L - 46, ww - 4 - f * .3), P(L * .45, ww - 8 - f * .2),
                   P(-length_extra, hw - 12), P(-length_extra, hw), P(L * .45, ww - f * .2),
                   P(L - 46, ww + 2 - f * .3), P(L - 8, sw - f * .2)], sh, ink=False)
        self.line(P(L * .62, -ww * .35 + f * .5), P(L * .2, -ww * .2 + f * .5), .55)
        return P

    # ----------------------------------------------------------------- heads
    def _hair_pts(self, view):
        st = self.hairstyle
        if view == "back":
            if st == "flick":
                return [(-30, -36), (-31, -62), (-22, -80), (-14, -86), (-2, -110), (14, -116), (8, -92), (20, -82), (29, -66),
                        (30, -38), (19, -31), (0, -29), (-19, -31)]
            if st == "short":
                return [(-30, -40), (-30, -66), (-16, -84), (14, -84), (30, -66), (30, -40), (0, -34)]
            if st == "bowl":
                return [(-33, -40), (-32, -70), (-14, -88), (14, -88), (32, -70), (33, -40), (18, -36), (0, -35), (-18, -36)]
            if st == "curly":
                return [(-34, -36), (-38, -58), (-30, -80), (-14, -94), (6, -96), (26, -86), (38, -64), (36, -38), (16, -32), (-12, -32)]
        if view == "front":
            if st == "flick":
                return [(-31, -60), (-29, -76), (-48, -110), (-16, -90), (8, -91), (27, -78), (32, -58), (31, -40),
                        (24, -50), (18, -66), (0, -70), (-16, -67)]
            if st == "short":
                return [(-30, -62), (-26, -80), (-6, -88), (18, -84), (30, -66), (31, -44), (22, -58), (-6, -70)]
            if st == "bowl":
                return [(-33, -50), (-30, -76), (-10, -90), (16, -88), (32, -72), (33, -46), (22, -60), (-12, -62)]
            if st == "curly":
                return [(-34, -56), (-36, -78), (-20, -96), (6, -98), (28, -88), (38, -66), (36, -42), (24, -58), (-10, -68)]
        if view == "side":
            if st == "flick":
                return [(-27, -68), (-31, -76), (-54, -106), (-22, -91), (4, -95), (26, -88), (38, -72), (38, -50),
                        (31, -40), (25, -54), (12, -62), (2, -70), (-12, -72)]
            if st == "short":
                return [(-26, -70), (-18, -84), (6, -90), (28, -82), (37, -64), (36, -46), (26, -52), (10, -66), (-10, -72)]
            if st == "bowl":
                return [(-28, -64), (-24, -84), (0, -92), (26, -84), (38, -64), (37, -42), (20, -50), (-6, -62)]
            if st == "curly":
                return [(-26, -70), (-20, -90), (2, -98), (28, -90), (40, -70), (38, -44), (24, -50), (-6, -70)]
        return []

    def _cap(self, view):
        if view == "back":
            return [(-33, -58), (-30, -80), (-12, -92), (16, -92), (32, -80), (34, -58), (0, -54)]
        if view == "front":
            return [(-58, -66), (-30, -72), (-26, -88), (-6, -96), (22, -92), (34, -76), (33, -62), (0, -66)]
        return [(-62, -68), (-28, -74), (-22, -90), (6, -98), (32, -90), (40, -72), (38, -62), (0, -66)]

    def _draw_head(self, pose, view):
        n = self.nose
        e = self.expr
        if view == "back":
            skin = [(-14, 0), (14, 0), (22, -18), (30, -42), (28, -66), (16, -82), (0, -86), (-16, -82), (-28, -66), (-30, -42), (-22, -18)]
            self.poly(self._head_tf(pose, [(-29, -40), (-38, -44), (-39, -55), (-30, -57)]), self.skin)
            self.poly(self._head_tf(pose, [(29, -40), (38, -44), (39, -55), (30, -57)]), self.skin)
            self.poly(self._head_tf(pose, skin), self.skin)
            self.poly(self._head_tf(pose, self._hair_pts("back")), self.hair)
            if self.cap:
                self.poly(self._head_tf(pose, self._cap("back")), "#6A5F52")
            return
        if view == "front":
            nt = (-30 - 24 * n, -44)
            skin = [(-12, 0), (12, 0), (24, -20), (30, -46), (28, -70), (14, -84), (-6, -86), (-24, -78), (-30, -62),
                    (-30, -52), nt, (-28, -38), (-26, -24), (-20, -12)]
            self.poly(self._head_tf(pose, [(27, -40), (36, -44), (36, -56), (28, -58)]), self.skin)
            self.poly(self._head_tf(pose, skin), self.skin)
            self.poly(self._head_tf(pose, self._hair_pts("front")), self.hair)
            if self.cap:
                self.poly(self._head_tf(pose, self._cap("front")), "#6A5F52")
            ey = -56 + e.get("eye_dy", 0)
            for ex in (-21, 2):
                if e.get("closed"):
                    a, b = self._head_tf(pose, [(ex - 5, ey), (ex + 5, ey + 1)])
                    self.line(a, b, .8)
                else:
                    self.dot(self._head_tf(pose, [(ex, ey)])[0], 3.2)
                br = e.get("brow", 0)
                a, b = self._head_tf(pose, [(ex - 7, ey - 9 - br), (ex + 6, ey - 9 + br * .3)])
                self.line(a, b, .8)
            if self.tache:
                self.poly(self._head_tf(pose, [(-30, -36), (-12, -37), (-10, -31), (-30, -30)]), C["hair_f"])
            m = e.get("mouth", 0)
            a, b = self._head_tf(pose, [(-24, -26 + m), (-12, -26)])
            self.line(a, b, .7)
            return
        # side profile facing left
        nt = (-30 - 34 * n, -45 + 2 * (1 - n))
        skin = [(10, 0), (-8, 0), (-14, -14), (-24, -20), (-22, -26), (-30, -32), (-27, -38), nt, (-31, -53),
                (-31, -60), (-27, -74), (-8, -86), (18, -84), (32, -70), (34, -48), (24, -30), (14, -18)]
        self.poly(self._head_tf(pose, skin), self.skin)
        self.poly(self._head_tf(pose, self._hair_pts("side")), self.hair)
        self.poly(self._head_tf(pose, [(6, -44), (14, -46), (16, -58), (8, -60)]), self.skin)
        if self.cap:
            self.poly(self._head_tf(pose, self._cap("side")), "#6A5F52")
        ey = -57 + e.get("eye_dy", 0)
        if e.get("closed"):
            a, b = self._head_tf(pose, [(-27, ey + 1), (-18, ey + 2)])
            self.line(a, b, .8)
        elif e.get("lid"):
            self.dot(self._head_tf(pose, [(-22, ey + 1)])[0], 3.0)
            a, b = self._head_tf(pose, [(-28, ey - 1), (-16, ey - 2)])
            self.line(a, b, .8)
        else:
            self.dot(self._head_tf(pose, [(-22, ey)])[0], 3.3)
        br = e.get("brow", 0)
        a, b = self._head_tf(pose, [(-31, ey - 9 - br), (-15, ey - 10 + br * .4)])
        self.line(a, b, .85)
        if self.tache:
            self.poly(self._head_tf(pose, [(-31, -38), (-18, -37), (-16, -31), (-30, -31)]), C["hair_f"])
        m = e.get("mouth", 0)
        a, b = self._head_tf(pose, [(-27, -27 + m), (-19, -26)])
        self.line(a, b, .7)

    # ----------------------------------------------------------------- views
    def _draw_back(self, pose):
        # far arm, torso, near arm; legs only when standing (pose has feet)
        if "ft_l" in pose:
            self._leg(pose["hip_l"], pose["kn_l"], pose["ft_l"], facing=0)
            self._leg(pose["hip_r"], pose["kn_r"], pose["ft_r"], facing=0)
        coat = getattr(self, "coat", None) if self.kind in ("father", "oldfather") else None
        for side in ("l", "r"):
            if pose.get(f"arm_{side}_front"):
                continue
            self._arm(pose[f"sh_{side}"], pose[f"el_{side}"], pose[f"ha_{side}"], coat=coat)
        P = self._torso(pose, sw=pose.get("sw", 46), ww=pose.get("ww", 36), hw=pose.get("hw", 40),
                        length_extra=pose.get("hem", 0), col=coat)
        if self.collar and not coat:
            nx, ny = pose["neck"]
            self.poly([(nx - 15, ny + 1), (nx + 15, ny + 1), (nx + 12, ny + 8), (nx - 12, ny + 8)], self.collar)
        if self.scarf:
            self._scarf_back(pose)
        self._draw_head(pose, "back")
        for side in ("l", "r"):
            if pose.get(f"arm_{side}_front"):
                self._arm(pose[f"sh_{side}"], pose[f"el_{side}"], pose[f"ha_{side}"], coat=coat)
        if pose.get("remote"):
            hx, hy = pose["ha_r"]
            self.poly([(hx - 4, hy + 4), (hx + 26, hy - 4), (hx + 28, hy + 3), (hx - 2, hy + 11)], C["ink"])

    def _draw_front(self, pose):
        coat = getattr(self, "coat", None) if self.kind in ("father", "oldfather") else None
        self._leg(pose["hip_r"], pose["kn_r"], pose["ft_r"], facing=-1)
        self._arm(pose["sh_r"], pose["el_r"], pose["ha_r"], coat=coat)
        self._leg(pose["hip_l"], pose["kn_l"], pose["ft_l"], facing=-1)
        self._torso(pose, front=-6, sw=pose.get("sw", 42), ww=34, hw=36, length_extra=pose.get("hem", 0), col=coat)
        nx, ny = pose["neck"]
        if coat:
            self.poly([(nx - 10, ny + 2), (nx + 10, ny + 2), (nx + 2, ny + 60)], self.shirt)
            self.line((nx - 22, ny + 4), (nx - 4, ny + 50), .8)
        elif self.collar:
            self.poly([(nx - 16, ny + 1), (nx + 12, ny + 1), (nx - 2, ny + 22)], self.collar)
            self.poly([(nx - 9, ny + 2), (nx + 6, ny + 2), (nx - 2, ny + 12)], self.skin, ink=False)
        if self.scarf:
            self._scarf_front(pose)
        self._draw_head(pose, "front")
        self._arm(pose["sh_l"], pose["el_l"], pose["ha_l"], coat=coat)

    def _draw_side(self, pose):
        coat = getattr(self, "coat", None) if self.kind in ("father", "oldfather") else None
        if "ft_r" in pose:
            self._leg(pose["hip_r"], pose["kn_r"], pose["ft_r"], facing=-1)
        if not pose.get("arm_r_front"):
            self._arm(pose["sh_r"], pose["el_r"], pose["ha_r"], coat=coat)
        if "ft_l" in pose:
            self._leg(pose["hip_l"], pose["kn_l"], pose["ft_l"], facing=-1)
        self._torso(pose, front=-10, sw=26, ww=30, hw=34, length_extra=pose.get("hem", 0), col=coat)
        if self.collar and not coat:
            nx, ny = pose["neck"]
            self.poly([(nx - 18, ny), (nx + 8, ny - 2), (nx + 10, ny + 6), (nx - 16, ny + 9)], self.collar)
        if self.scarf:
            self._scarf_side(pose)
        self._draw_head(pose, "side")
        if pose.get("phone"):
            hx, hy = pose["ha_l"]
            self.poly([(hx - 6, hy - 30), (hx + 6, hy - 32), (hx + 8, hy + 6), (hx - 4, hy + 8)], C["ink"])
        self._arm(pose["sh_l"], pose["el_l"], pose["ha_l"], coat=coat)
        if pose.get("arm_r_front"):
            self._arm(pose["sh_r"], pose["el_r"], pose["ha_r"], coat=coat)

    # ----------------------------------------------------------------- scarf
    def _stripes(self, a, b, w, n=5):
        """Green/gold striped band from a to b (figure units)."""
        for i in range(n):
            t0, t1 = i / n, (i + 1) / n
            p0 = (a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0)
            p1 = (a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1)
            self.poly(self._limb(p0, p1, w, w), C["green"] if i % 2 == 0 else C["gold"], ink=False)
        self.poly(self._limb(a, b, w, w), None)

    def _scarf_front(self, pose):
        nx, ny = pose["neck"]
        self.poly([(nx - 24, ny - 6), (nx + 22, ny - 6), (nx + 24, ny + 10), (nx - 26, ny + 12)], C["green"])
        self._stripes((nx - 10, ny + 6), (nx - 18, ny + 120), 9, 6)
        self._stripes((nx + 6, ny + 6), (nx + 12, ny + 96), 9, 5)

    def _scarf_back(self, pose):
        nx, ny = pose["neck"]
        self.poly([(nx - 26, ny - 8), (nx + 26, ny - 8), (nx + 28, ny + 10), (nx - 28, ny + 10)], C["green"])
        self.poly([(nx - 26, ny + 2), (nx + 26, ny + 2), (nx + 27, ny + 6), (nx - 27, ny + 6)], C["gold"], ink=False)

    def _scarf_side(self, pose):
        nx, ny = pose["neck"]
        self.poly([(nx - 22, ny - 8), (nx + 14, ny - 8), (nx + 16, ny + 10), (nx - 24, ny + 10)], C["green"])
        self._stripes((nx - 18, ny + 4), (nx - 28, ny + 110), 9, 6)


# ====================================================================== poses
def seated_back(lean=0.0, head_drop=0.0, arm="rest", breathe=0.0, tilt=0.0):
    """Seated, seen from behind. origin = seat centre. Only upper body matters."""
    nk = (lean * 30, -228 + breathe * 2 + lean * 25)
    pose = dict(pelvis=(0, 0), neck=nk, tilt=tilt, sw=48, ww=38, hw=44, hem=20)
    pose["neck"] = (nk[0], nk[1] + head_drop * 14)
    shy = nk[1] + 14
    pose.update(sh_l=(nk[0] - 40, shy), sh_r=(nk[0] + 40, shy))
    if arm == "rest":
        pose.update(el_l=(-58, -110), ha_l=(-40, -40), el_r=(58, -110), ha_r=(40, -40))
    elif arm == "remote":
        pose.update(el_l=(-58, -110), ha_l=(-40, -40), el_r=(66, -150), ha_r=(70, -195), remote=True)
    elif arm == "remote_low":
        pose.update(el_l=(-58, -110), ha_l=(-40, -40), el_r=(62, -110), ha_r=(48, -45), remote=True)
    elif arm == "up":
        pose.update(el_l=(-80, nk[1] - 60), ha_l=(-96, nk[1] - 150), el_r=(80, nk[1] - 60), ha_r=(96, nk[1] - 150))
    elif arm == "chin":
        pose.update(el_l=(-58, -110), ha_l=(-40, -40), el_r=(50, -120), ha_r=(16, nk[1] - 10))
    return pose


def standing_back(phase=None, lean=0.0):
    """Standing / walking away from camera. origin = ground between feet."""
    hip_y = -372
    bob = 0 if phase is None else -6 * abs(math.cos(phase * 2 * math.pi))
    nk = (lean * 20, -598 + bob)
    pose = dict(pelvis=(0, hip_y + bob), neck=nk, sw=46, ww=36, hw=40, hem=6)
    pose.update(hip_l=(-20, hip_y + bob), hip_r=(20, hip_y + bob))
    if phase is None:
        pose.update(kn_l=(-22, -195), ft_l=(-24, 0), kn_r=(22, -195), ft_r=(24, 0))
        sw = 0
    else:
        s = math.sin(phase * 2 * math.pi)
        # away from camera: legs alternate up/down a little
        pose.update(kn_l=(-22, -195 - 14 * max(0, s)), ft_l=(-24, -26 * max(0, s)),
                    kn_r=(22, -195 - 14 * max(0, -s)), ft_r=(24, -26 * max(0, -s)))
        sw = s
    shy = nk[1] + 14
    pose.update(sh_l=(nk[0] - 40, shy), sh_r=(nk[0] + 40, shy),
                el_l=(-54, shy + 140), ha_l=(-50 - 6 * sw, shy + 260),
                el_r=(54, shy + 140), ha_r=(50 + 6 * sw, shy + 260))
    return pose


def walking_front(phase, stride=1.0, arm_l=None, scale_body=1.0):
    """Three-quarter front walk, heading screen-left/toward camera. origin=ground."""
    s = math.sin(phase * 2 * math.pi)
    c = math.cos(phase * 2 * math.pi)
    hip_y = -372 - 8 * abs(c)
    nk = (-6, -600 - 8 * abs(c))
    pose = dict(pelvis=(0, hip_y), neck=nk, tilt=-3, sw=44, hem=6)
    st = 70 * stride
    pose.update(hip_l=(-14, hip_y), hip_r=(16, hip_y),
                kn_l=(-14 - st * .55 * s, -195 + 10 * max(0, -s)), ft_l=(-12 - st * s, 0 - 18 * max(0, -s)),
                kn_r=(16 + st * .55 * s, -195 + 10 * max(0, s)), ft_r=(18 + st * s, 0 - 18 * max(0, s)))
    shy = nk[1] + 16
    pose.update(sh_l=(nk[0] - 38, shy), sh_r=(nk[0] + 38, shy),
                el_l=(-48 + 22 * s, shy + 140), ha_l=(-44 + 50 * s, shy + 250),
                el_r=(50 - 22 * s, shy + 140), ha_r=(48 - 50 * s, shy + 250))
    if arm_l:
        pose.update(el_l=arm_l[0], ha_l=arm_l[1])
    return pose


def seated_side(arm="lap", head_drop=0.0, lean=0.0, tilt=0.0):
    """Seated in profile, facing left. origin = seat point."""
    nk = (-10 - lean * 40, -228 + lean * 20 + head_drop * 10)
    pose = dict(pelvis=(0, 0), neck=nk, tilt=tilt - head_drop * 12, hem=10)
    shy = nk[1] + 18
    pose.update(sh_l=(nk[0] + 4, shy), sh_r=(nk[0] + 10, shy))
    pose.update(hip_l=(-6, -8), kn_l=(-150, -14), ft_l=(-150, 160),
                hip_r=(4, -6), kn_r=(-140, -10), ft_r=(-136, 162))
    if arm == "lap":
        pose.update(el_l=(nk[0] - 6, -80), ha_l=(-90, -36), el_r=(nk[0] + 6, -84), ha_r=(-80, -40))
    elif arm == "low":   # for close-ups: forearms out of frame
        pose.update(el_l=(nk[0] + 2, -30), ha_l=(-70, 30), el_r=(nk[0] + 8, -30), ha_r=(-60, 30))
    elif arm == "phone":
        pose.update(el_l=(nk[0] - 36, -110), ha_l=(nk[0] - 10, nk[1] - 30), phone=True,
                    el_r=(nk[0] + 6, -84), ha_r=(-80, -40))
    return pose


def standing_side(arm="down", phase=None, head_drop=0.0):
    """Standing in profile facing left. origin=ground under hips."""
    hip_y = -372
    nk = (-8, -598 + head_drop * 8)
    pose = dict(pelvis=(0, hip_y), neck=nk, tilt=-head_drop * 10, hem=6)
    pose.update(hip_l=(-4, hip_y), hip_r=(4, hip_y), kn_l=(-12, -192), ft_l=(-8, 0), kn_r=(6, -192), ft_r=(12, 0))
    shy = nk[1] + 18
    pose.update(sh_l=(nk[0] + 2, shy), sh_r=(nk[0] + 8, shy))
    if arm == "down":
        pose.update(el_l=(-4, shy + 140), ha_l=(-14, shy + 250), el_r=(14, shy + 140), ha_r=(10, shy + 250))
    elif arm == "scarf":  # both hands at the throat, tying
        pose.update(el_l=(-60, shy + 90), ha_l=(-34, shy - 6), el_r=(-40, shy + 100), ha_r=(-22, shy + 8), arm_r_front=False)
    elif arm == "scarf2":
        pose.update(el_l=(-56, shy + 110), ha_l=(-40, shy + 40), el_r=(-30, shy + 120), ha_r=(-26, shy + 30))
    return pose

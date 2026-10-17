"""Blender set builder: the living room across four eras, rendered flat.

Run:  blender -b -P blender_room.py -- <era> <mode> [extra]
  era   : 2026 | 1999 | 2013 | 2019
  mode  : plates   -> layered stills (bg, sofa, door leaf angles) + anchors.json
          pullback -> per-frame camera pull-back from the TV (2026 opening)
          side     -> profile-angle plate for close shots

All surfaces are matte emission with a fake two-tone shade from the face normal,
plus Freestyle ink lines with noise, so the result sits next to the SVG figures.
"""
import bpy, bmesh, json, math, os, sys
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["2026", "plates"]
ERA, MODE = argv[0], argv[1]
EXTRA = argv[2:] if len(argv) > 2 else []
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "build", "blender", ERA)
os.makedirs(OUT, exist_ok=True)

def hx(h, k=1.0):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x * k) ** 2.2 for x in c)  # sRGB -> linear

# ------------------------------------------------------------------ palettes
ERAS = {
    "2026": dict(wall="#CDBFA2", wall2="#BFB194", floor="#7C6B57", trim="#E6DCC6", sofa="#5E564D", sofa2="#4C453E",
                 door="#8B6B48", hall="#3E3936", window="#33404C", cab="#4A3B30", tv="flat", rug="#8A3B33",
                 lamp="#B8893B", stripe=None, ceiling="#D8CDB5", extras=["frame", "lamp", "plant"]),
    "1999": dict(wall="#DDBA7E", wall2="#CDA868", floor="#7A5A3E", trim="#EADBB8", sofa="#7E4A35", sofa2="#683B2A",
                 door="#9A7148", hall="#E5C07A", window="#2F3A4A", cab="#5C3F2B", tv="crt", rug="#5E6B4F",
                 lamp="#C9A23F", stripe="#C99E5E", ceiling="#E8D6AE", extras=["frame", "lamp", "clock", "shelf"]),
    "2013": dict(wall="#C9C7B3", wall2="#B8B6A1", floor="#8A8070", trim="#E4E0CF", sofa="#4E5A63", sofa2="#3F4A52",
                 door="#A39274", hall="#5A5650", window="#3A4654", cab="#7A6A55", tv="small", rug="#6B6155",
                 lamp="#B8893B", stripe=None, ceiling="#DCD8C6", extras=["posters", "bunk", "desk"]),
    "2019": dict(wall="#D3CDBE", wall2="#C2BCAC", floor="#857865", trim="#E8E2D2", sofa="#6C6A64", sofa2="#5A5852",
                 door="#958168", hall="#4A4642", window="#3B4552", cab="#9C8463", tv="flat_small", rug=None,
                 lamp="#B8893B", stripe=None, ceiling="#DED8C8", extras=["boxes", "bulb"]),
}
P = ERAS[ERA]

# ------------------------------------------------------------------ scene setup
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "CYCLES"
sc.cycles.device = "CPU"
sc.cycles.samples = 10
sc.cycles.use_denoising = False
sc.cycles.max_bounces = 0
sc.cycles.transparent_max_bounces = 8
sc.cycles.pixel_filter_type = "BLACKMAN_HARRIS"
sc.cycles.filter_width = 1.6
sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
sc.render.fps = 24
sc.view_settings.view_transform = "Standard"
sc.view_settings.look = "None"
sc.render.image_settings.file_format = "PNG"
sc.render.image_settings.color_mode = "RGBA"
world = bpy.data.worlds.new("w"); sc.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (*hx("#1A1817"), 1)

# Freestyle ink
sc.render.use_freestyle = True
sc.render.line_thickness_mode = "ABSOLUTE"
sc.render.line_thickness = 1.6
vl = sc.view_layers[0]
fs = vl.freestyle_settings
fs.crease_angle = math.radians(140)
ls = fs.linesets.new("ink") if len(fs.linesets) == 0 else fs.linesets[0]
ls.select_by_visibility = True
ls.select_silhouette = ls.select_border = ls.select_crease = True
ls.select_by_collection = False
lst = bpy.data.linestyles.new("inkstyle") if ls.linestyle is None else ls.linestyle
ls.linestyle = lst
lst.color = hx("#2A2522")
lst.thickness = 1.9
lst.chaining = "PLAIN"
lst.caps = "ROUND"
gm = lst.geometry_modifiers.new("wob", "PERLIN_NOISE_1D")
gm.amplitude, gm.frequency, gm.octaves = 0.8, 5.0, 2
tm = lst.thickness_modifiers.new("var", "NOISE")
tm.amplitude, tm.period = 0.8, 40.0

# ------------------------------------------------------------------ materials
_mats = {}
def mat(col, shade=0.84, stripe=None, sid=None):
    key = (col, shade, stripe)
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(f"m{len(_mats)}")
    m.use_nodes = True
    nt = m.node_tree; n = nt.nodes; n.clear()
    out = n.new("ShaderNodeOutputMaterial")
    em = n.new("ShaderNodeEmission")
    geo = n.new("ShaderNodeNewGeometry")
    sep = n.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Normal"], sep.inputs[0])
    # shade factor: side faces (|nx|) darker, tops a touch lighter
    ab = n.new("ShaderNodeMath"); ab.operation = "ABSOLUTE"
    nt.links.new(sep.outputs[0], ab.inputs[0])
    st = n.new("ShaderNodeMath"); st.operation = "GREATER_THAN"; st.inputs[1].default_value = 0.5
    nt.links.new(ab.outputs[0], st.inputs[0])
    mix = n.new("ShaderNodeMix"); mix.data_type = "RGBA"
    nt.links.new(st.outputs[0], mix.inputs["Factor"])
    base = hx(col)
    if stripe:
        tc = n.new("ShaderNodeTexCoord")
        sx = n.new("ShaderNodeSeparateXYZ")
        nt.links.new(tc.outputs["Object"], sx.inputs[0])
        mul = n.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; mul.inputs[1].default_value = 7.0
        nt.links.new(sx.outputs[0], mul.inputs[0])
        fr = n.new("ShaderNodeMath"); fr.operation = "FRACT"
        nt.links.new(mul.outputs[0], fr.inputs[0])
        gt = n.new("ShaderNodeMath"); gt.operation = "GREATER_THAN"; gt.inputs[1].default_value = 0.78
        nt.links.new(fr.outputs[0], gt.inputs[0])
        mx2 = n.new("ShaderNodeMix"); mx2.data_type = "RGBA"
        mx2.inputs["A"].default_value = (*base, 1); mx2.inputs["B"].default_value = (*hx(stripe), 1)
        nt.links.new(gt.outputs[0], mx2.inputs["Factor"])
        nt.links.new(mx2.outputs["Result"], mix.inputs["A"])
        mul2 = n.new("ShaderNodeMix"); mul2.data_type = "RGBA"; mul2.blend_type = "MULTIPLY"
        mul2.inputs["Factor"].default_value = 1.0
        nt.links.new(mx2.outputs["Result"], mul2.inputs["A"])
        mul2.inputs["B"].default_value = (shade, shade, shade, 1)
        nt.links.new(mul2.outputs["Result"], mix.inputs["B"])
    else:
        mix.inputs["A"].default_value = (*base, 1)
        mix.inputs["B"].default_value = (*hx(col, shade), 1)
    nt.links.new(mix.outputs["Result"], em.inputs["Color"])
    nt.links.new(em.outputs[0], out.inputs[0])
    _mats[key] = m
    return m

def img_mat(path, sequence=False, frames=1, offset=0):
    m = bpy.data.materials.new("img" + os.path.basename(path))
    m.use_nodes = True
    nt = m.node_tree; n = nt.nodes; n.clear()
    out = n.new("ShaderNodeOutputMaterial")
    em = n.new("ShaderNodeEmission")
    tr = n.new("ShaderNodeBsdfTransparent")
    mx = n.new("ShaderNodeMixShader")
    tex = n.new("ShaderNodeTexImage")
    img = bpy.data.images.load(path)
    if sequence:
        img.source = "SEQUENCE"
        tex.image_user.frame_duration = frames
        tex.image_user.frame_offset = offset
        tex.image_user.use_auto_refresh = True
    tex.image = img
    tex.interpolation = "Cubic"
    nt.links.new(tex.outputs["Color"], em.inputs["Color"])
    nt.links.new(tex.outputs["Alpha"], mx.inputs[0])
    nt.links.new(tr.outputs[0], mx.inputs[1])
    nt.links.new(em.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs[0])
    return m

COLS = {}
def coll(name):
    if name not in COLS:
        c = bpy.data.collections.new(name); sc.collection.children.link(c); COLS[name] = c
    return COLS[name]

def box(name, center, size, col, cname="set", shade=0.84, stripe=None, rot=None, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=center)
    o = bpy.context.object; o.name = name
    o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    if rot:
        o.rotation_euler = rot
    o.data.materials.append(mat(col, shade, stripe))
    for c in o.users_collection:
        c.objects.unlink(o)
    coll(cname).objects.link(o)
    if bevel:
        b = o.modifiers.new("b", "BEVEL"); b.width = bevel; b.segments = 1
    return o

def cyl(name, center, r, h, col, cname="set", verts=8, r2=None):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r if r2 is None else r2, depth=h, location=center)
    o = bpy.context.object; o.name = name
    o.data.materials.append(mat(col))
    for c in o.users_collection:
        c.objects.unlink(o)
    coll(cname).objects.link(o)
    return o

def plane(name, center, size, material, rot=(math.pi / 2, 0, 0), cname="set"):
    bpy.ops.mesh.primitive_plane_add(location=center)
    o = bpy.context.object; o.name = name
    o.scale = (size[0] / 2, size[1] / 2, 1)
    o.rotation_euler = rot
    o.data.materials.append(material)
    for c in o.users_collection:
        c.objects.unlink(o)
    coll(cname).objects.link(o)
    return o

# ------------------------------------------------------------------ geometry
RW, BACK, FRONT, HGT = 2.4, 3.0, -6.8, 2.75
DOOR_X0, DOOR_X1, DOOR_H = 0.55, 1.40, 2.05
TV_X = -0.55
SEAT = Vector((-0.30, -0.55, 0.47))   # protagonist's spot, never moves
SEAT_R = Vector((0.38, -0.55, 0.47))  # father / roommate
SEAT_L = Vector((-0.98, -0.55, 0.47)) # roommate

box("floor", (0, -0.75, -0.05), (2 * RW, BACK - FRONT, 0.1), P["floor"])
box("ceiling", (0, -0.75, HGT + 0.05), (2 * RW, BACK - FRONT, 0.1), P["ceiling"])
# back wall with a door opening
wall_kw = dict(stripe=P["stripe"])
wb = box("wall_b", (0, BACK + 0.05, HGT / 2), (2 * RW, 0.1, HGT), P["wall"], **wall_kw)
cut = box("cut", ((DOOR_X0 + DOOR_X1) / 2, BACK + 0.05, DOOR_H / 2 - 0.05), (DOOR_X1 - DOOR_X0, 0.4, DOOR_H + 0.1), "#000000", cname="tmp")
bo = wb.modifiers.new("door", "BOOLEAN"); bo.operation = "DIFFERENCE"; bo.object = cut
bpy.context.view_layer.objects.active = wb; bpy.ops.object.modifier_apply(modifier="door")
bpy.data.objects.remove(cut)
box("wall_l", (-RW - 0.05, -0.75, HGT / 2), (0.1, BACK - FRONT, HGT), P["wall2"], **wall_kw)
box("wall_r", (RW + 0.05, -0.75, HGT / 2), (0.1, BACK - FRONT, HGT), P["wall2"], **wall_kw)
box("skirting", (0, BACK - 0.01, 0.06), (2 * RW, 0.04, 0.12), P["trim"])
# door frame + hallway behind
for nm, cx, w in (("jamb_l", DOOR_X0 - 0.04, 0.08), ("jamb_r", DOOR_X1 + 0.04, 0.08)):
    box(nm, (cx, BACK - 0.02, DOOR_H / 2), (w, 0.06, DOOR_H + 0.08), P["trim"])
box("lintel", ((DOOR_X0 + DOOR_X1) / 2, BACK - 0.02, DOOR_H + 0.04), (DOOR_X1 - DOOR_X0 + 0.16, 0.06, 0.08), P["trim"])
box("hall_floor", ((DOOR_X0 + DOOR_X1) / 2, BACK + 1.2, -0.05), (2.0, 2.2, 0.1), P["hall"], shade=0.7)
box("hall_back", ((DOOR_X0 + DOOR_X1) / 2, BACK + 2.3, HGT / 2), (2.0, 0.1, HGT), P["hall"], shade=0.9)
box("hall_l", (DOOR_X0 - 0.4, BACK + 1.2, HGT / 2), (0.1, 2.2, HGT), P["hall"], shade=0.75)
box("hall_r", (DOOR_X1 + 0.4, BACK + 1.2, HGT / 2), (0.1, 2.2, HGT), P["hall"], shade=0.75)
# door leaf, hinged on the right jamb, opening into the room
bpy.ops.object.empty_add(location=(DOOR_X1, BACK - 0.02, 0)); hinge = bpy.context.object; hinge.name = "hinge"
leaf = box("door_leaf", ((DOOR_X0 + DOOR_X1) / 2, BACK - 0.02, DOOR_H / 2), (DOOR_X1 - DOOR_X0 - 0.01, 0.045, DOOR_H - 0.01), P["door"], cname="door")
knob = cyl("knob", (DOOR_X0 + 0.09, BACK - 0.07, 1.0), 0.03, 0.05, "#C9A23F", cname="door")
knob.rotation_euler = (math.pi / 2, 0, 0)
panel = box("door_panel", ((DOOR_X0 + DOOR_X1) / 2, BACK - 0.05, 1.45), (0.5, 0.01, 0.6), P["door"], cname="door", shade=0.9)
panel2 = box("door_panel2", ((DOOR_X0 + DOOR_X1) / 2, BACK - 0.05, 0.55), (0.5, 0.01, 0.7), P["door"], cname="door", shade=0.9)
for o in (leaf, knob, panel, panel2):
    o.parent = hinge
    o.matrix_parent_inverse = hinge.matrix_world.inverted()

# window on the left wall
box("win_frame", (-RW + 0.02, 0.6, 1.55), (0.06, 1.3, 1.25), P["trim"])
box("win_glass", (-RW + 0.05, 0.6, 1.55), (0.02, 1.1, 1.05), P["window"], shade=1.0)
box("win_bar_v", (-RW + 0.07, 0.6, 1.55), (0.02, 0.05, 1.05), P["trim"])
box("win_bar_h", (-RW + 0.07, 0.6, 1.55), (0.02, 1.1, 0.05), P["trim"])
box("win_sill", (-RW + 0.1, 0.6, 0.95), (0.2, 1.4, 0.05), P["trim"])
if P["rug"]:
    box("rug", (TV_X + 0.25, 0.9, 0.005), (2.4, 2.6, 0.012), P["rug"], shade=1.0)

# TV + cabinet
TVZ = 0.62
if P["tv"] in ("flat", "flat_small"):
    k = 1.0 if P["tv"] == "flat" else 0.72
    box("cabinet", (TV_X, BACK - 0.3, 0.25), (1.7 * k + .1, 0.42, 0.5), P["cab"])
    box("cab_line", (TV_X, BACK - 0.515, 0.25), (1.7 * k + .1, 0.005, 0.012), P["cab"], shade=.6)
    tvw, tvh = 1.25 * k, 0.72 * k
    box("tv_body", (TV_X, BACK - 0.35, TVZ + tvh / 2 + 0.05), (tvw + 0.05, 0.05, tvh + 0.05), "#1E1C1B")
    box("tv_stand", (TV_X, BACK - 0.35, 0.53), (0.3, 0.18, 0.04), "#1E1C1B")
    SCREEN = (Vector((TV_X, BACK - 0.38, TVZ + tvh / 2 + 0.05)), tvw, tvh)
elif P["tv"] == "crt":
    box("cabinet", (TV_X, BACK - 0.35, 0.3), (1.2, 0.55, 0.6), P["cab"], bevel=0.01)
    box("cab_door_l", (TV_X - 0.29, BACK - 0.625, 0.3), (0.5, 0.01, 0.46), P["cab"], shade=0.9)
    box("cab_door_r", (TV_X + 0.29, BACK - 0.625, 0.3), (0.5, 0.01, 0.46), P["cab"], shade=0.9)
    box("tv_body", (TV_X, BACK - 0.35, 0.92), (0.82, 0.55, 0.64), "#9B9384", bevel=0.03)
    box("tv_bezel", (TV_X, BACK - 0.63, 0.94), (0.70, 0.02, 0.52), "#2B2826")
    box("tv_knobs", (TV_X + 0.33, BACK - 0.63, 0.75), (0.08, 0.02, 0.1), "#2B2826")
    SCREEN = (Vector((TV_X - 0.04, BACK - 0.645, 0.95)), 0.56, 0.42)
    cyl("antenna_a", (TV_X + 0.1, BACK - 0.35, 1.38), 0.008, 0.5, "#2B2826").rotation_euler = (0, 0.5, 0)
    cyl("antenna_b", (TV_X + 0.2, BACK - 0.35, 1.38), 0.008, 0.5, "#2B2826").rotation_euler = (0, -0.3, 0)
elif P["tv"] == "small":
    box("cabinet", (TV_X, BACK - 0.3, 0.37), (1.3, 0.55, 0.74), P["cab"])
    box("tv_body", (TV_X, BACK - 0.35, 1.06), (0.84, 0.05, 0.52), "#1E1C1B")
    SCREEN = (Vector((TV_X, BACK - 0.38, 1.06)), 0.78, 0.45)

# screen plane (filled by content later: emission image)
scr_c, scr_w, scr_h = SCREEN
scr_mat = mat("#141312", 1.0)
screen = plane("screen", scr_c, (scr_w, scr_h), scr_mat, cname="screen")

# sofa (its own collection: foreground occluder for seated figures)
SO = "sofa"
sx, sy = -0.05, -0.55
sw_ = 2.1 if ERA in ("2026", "1999") else 1.9
box("sofa_seat", (sx, sy + 0.05, 0.3), (sw_ - 0.3, 0.8, 0.22), P["sofa"], cname=SO)
box("sofa_base", (sx, sy + 0.05, 0.12), (sw_, 0.85, 0.22), P["sofa2"], cname=SO)
box("sofa_back", (sx, sy - 0.38, 0.5), (sw_, 0.22, 0.62), P["sofa"], cname=SO, bevel=0.02)
box("sofa_arm_l", (sx - sw_ / 2 + 0.12, sy + 0.05, 0.45), (0.24, 0.85, 0.42), P["sofa"], cname=SO, bevel=0.02)
box("sofa_arm_r", (sx + sw_ / 2 - 0.12, sy + 0.05, 0.45), (0.24, 0.85, 0.42), P["sofa"], cname=SO, bevel=0.02)
for i in range(3 if sw_ > 2.1 else 2):
    n = 3 if sw_ > 2.1 else 2
    w = (sw_ - 0.5) / n
    box(f"cushion{i}", (sx - (sw_ - 0.5) / 2 + w * (i + .5), sy - 0.22, 0.7), (w - 0.04, 0.14, 0.36), P["sofa"], cname=SO, shade=0.9, bevel=0.03)

# extras
ex = P["extras"]
if "lamp" in ex:
    cyl("lamp_pole", (-1.75, 2.45, 0.75), 0.015, 1.5, "#2B2826")
    cyl("lamp_base", (-1.75, 2.45, 0.02), 0.16, 0.04, "#2B2826", verts=10)
    cyl("lamp_shade", (-1.75, 2.45, 1.55), 0.26, 0.36, P["lamp"], verts=10, r2=0.14)
if "frame" in ex:
    box("frame", (TV_X - 0.05, BACK - 0.02, 1.85), (0.42, 0.03, 0.32), "#2B2826")
    box("frame_pic", (TV_X - 0.05, BACK - 0.04, 1.85), (0.34, 0.01, 0.24), "#B9AE98", shade=1)
    box("frame2", (TV_X + 0.42, BACK - 0.02, 1.95), (0.22, 0.03, 0.28), "#2B2826")
    box("frame2_pic", (TV_X + 0.42, BACK - 0.04, 1.95), (0.16, 0.01, 0.22), "#A3262B", shade=1)
if "plant" in ex:
    cyl("pot", (1.95, 2.55, 0.18), 0.17, 0.36, "#8E6527", verts=8, r2=0.13)
    for i, (a, h) in enumerate(((0.0, 0.9), (0.6, 0.75), (-0.5, 0.7), (1.2, 0.6))):
        lf = box(f"leaf{i}", (1.95 + 0.12 * math.sin(a), 2.55, 0.36 + h / 2), (0.08, 0.02, h), "#4F6A4A", shade=0.8)
        lf.rotation_euler = (0, a * 0.5, a)
if "clock" in ex:
    cyl("clock", (1.85, BACK - 0.03, 2.0), 0.17, 0.03, "#EADBB8", verts=16).rotation_euler = (math.pi / 2, 0, 0)
if "shelf" in ex:
    box("shelf", (1.95, BACK - 0.15, 1.3), (0.7, 0.25, 0.03), P["cab"])
    for i in range(5):
        box(f"book{i}", (1.7 + i * 0.1, BACK - 0.15, 1.42), (0.07, 0.18, 0.22 - 0.02 * (i % 3)), ["#7A1C21", "#3F5B3B", "#B8893B", "#2B2826", "#8C8273"][i])
if "posters" in ex:
    box("poster1", (TV_X - 0.3, BACK - 0.02, 1.85), (0.5, 0.01, 0.7), "#A3262B", shade=1)
    box("poster1b", (TV_X - 0.3, BACK - 0.03, 1.95), (0.3, 0.01, 0.3), "#EADBB8", shade=1)
    box("poster2", (-1.6, BACK - 0.02, 1.7), (0.45, 0.01, 0.6), "#B8893B", shade=1)
if "bunk" in ex:
    for x in (1.9, 2.3):
        for y in (1.2, 2.8):
            box(f"bpost{x}{y}", (x, y, 1.0), (0.05, 0.05, 2.0), "#4A4E55")
    box("bunk_low", (2.1, 2.0, 0.45), (0.5, 1.7, 0.18), "#8C8273")
    box("bunk_high", (2.1, 2.0, 1.55), (0.5, 1.7, 0.18), "#8C8273")
if "desk" in ex:
    box("desk", (-1.85, 2.4, 0.74), (1.0, 0.6, 0.04), P["cab"])
    box("desk_leg", (-2.3, 2.4, 0.37), (0.04, 0.5, 0.74), P["cab"])
    box("laptop", (-1.85, 2.5, 0.88), (0.36, 0.02, 0.24), "#2B2826")
    box("mug", (-1.55, 2.3, 0.8), (0.07, 0.07, 0.1), "#A3262B")
if "boxes" in ex:
    box("box1", (1.9, 2.4, 0.22), (0.6, 0.5, 0.44), "#B08A5A")
    box("box2", (1.95, 2.4, 0.62), (0.5, 0.45, 0.36), "#BE9866")
    box("box3", (-1.9, 2.5, 0.2), (0.5, 0.5, 0.4), "#B08A5A")
if "bulb" in ex:
    cyl("cord", (0.0, 1.2, 2.45), 0.006, 0.6, "#2B2826")
    cyl("bulb", (0.0, 1.2, 2.12), 0.05, 0.12, "#F2E3B5", verts=10)
if "bulb" not in ex:
    # ceiling pendant over the room
    cyl("pend_cord", (TV_X + 0.4, 0.9, 2.55), 0.006, 0.4, "#2B2826")
    cyl("pend_shade", (TV_X + 0.4, 0.9, 2.3), 0.22, 0.16, P["lamp"], verts=10, r2=0.05)

# ------------------------------------------------------------------ camera
def make_cam(loc, look, focal=34.0):
    cam_data = bpy.data.cameras.new("cam")
    cam_data.sensor_fit = "VERTICAL"
    cam_data.sensor_height = 36
    cam_data.lens = focal
    cam = bpy.data.objects.new("cam", cam_data)
    sc.collection.objects.link(cam)
    cam.location = loc
    d = Vector(look) - Vector(loc)
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    sc.camera = cam
    return cam

WIDE_LOC, WIDE_LOOK = (0.12, -5.6, 2.25), (0.12, 3.0, 0.62)
cam = make_cam(WIDE_LOC, WIDE_LOOK, 42)

def proj(p):
    v = world_to_camera_view(sc, sc.camera, Vector(p))
    return [v.x * sc.render.resolution_x, (1 - v.y) * sc.render.resolution_y, v.z]

def px_per_m(p):
    a = proj(p); b = proj(Vector(p) + Vector((0, 0, 1)))
    return abs(a[1] - b[1])

def anchors():
    sc.frame_set(sc.frame_current)
    A = {}
    for nm, p in (("seat", SEAT), ("seat_r", SEAT_R), ("seat_l", SEAT_L)):
        A[nm] = proj(p) + [px_per_m(p)]
    c = scr_c
    A["screen"] = [proj(c + Vector((dx * scr_w / 2, -0.001, dz * scr_h / 2)))[:2] for dx, dz in ((-1, 1), (1, 1), (1, -1), (-1, -1))]
    A["door_open"] = [proj(Vector(p))[:2] for p in ((DOOR_X0, BACK, DOOR_H), (DOOR_X1, BACK, DOOR_H), (DOOR_X1, BACK, 0), (DOOR_X0, BACK, 0))]
    # floor path points for walking figures (ground-level projections + scale)
    pts = {"door_in": (0.97, BACK + 0.6, 0), "door_thr": (0.97, BACK - 0.05, 0), "room_mid": (0.75, 1.2, 0),
           "behind_sofa": (0.2, 0.25, 0), "sofa_side_r": (1.45, -0.3, 0), "stand_seat": (-0.30, 0.1, 0),
           "hall_far": (0.97, BACK + 1.6, 0)}
    for k, p in pts.items():
        A[k] = proj(p) + [px_per_m(p)]
    A["sofa_top"] = proj((SEAT.x, sy - 0.48, 0.81))
    A["cam"] = dict(mw_inv=[list(r) for r in sc.camera.matrix_world.inverted()], lens=sc.camera.data.lens, sensor_h=36)
    return A

# ------------------------------------------------------------------ render helpers
def show(names_visible):
    for n, c in COLS.items():
        c.hide_render = n not in names_visible

def render(path, transparent=False):
    sc.render.film_transparent = transparent
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)

if MODE == "plates":
    pre = ""
    if "medium" in EXTRA:
        # over-the-shoulder: closer, lower, the TV still in frame
        pre = "m_"
        cam.location = (-0.05, -2.9, 1.78)
        d = Vector((-0.3, 3.0, 0.62)) - cam.location
        cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        cam.data.lens = 38
    json.dump(anchors(), open(os.path.join(OUT, pre + "anchors.json"), "w"), indent=1)
    show({"set", "screen", "door"}); render(os.path.join(OUT, pre + "bg.png"))
    if not pre:
        show({"set", "screen"}); render(os.path.join(OUT, "bg_nodoor.png"))
    show({"sofa"}); render(os.path.join(OUT, pre + "sofa.png"), transparent=True)
    if "door" in EXTRA:
        # door leaf alone at a range of angles, holdout everything else
        show({"door"})
        for i, ang in enumerate(range(0, 101, 4)):
            hinge.rotation_euler = (0, 0, math.radians(-ang))
            render(os.path.join(OUT, f"door_{ang:03d}.png"), transparent=True)
        hinge.rotation_euler = (0, 0, 0)

elif MODE == "pullback":
    # Camera starts filling the frame with the TV screen and eases back to WIDE.
    tv_seq = EXTRA[0]; char_png = EXTRA[1]; n_frames = int(EXTRA[2])
    hold = int(EXTRA[3]) if len(EXTRA) > 3 else 0
    m = img_mat(tv_seq, sequence=True, frames=n_frames + hold)
    screen.data.materials.clear(); screen.data.materials.append(m)
    # protagonist as a camera-facing card on the seat, behind the sofa back
    ch = bpy.data.images.load(char_png)
    cw, chh = ch.size
    hm = 1.45  # card height in metres (head top above seat incl. margin)
    card = plane("hero", (0, 0, 0), (hm * cw / chh, hm), img_mat(char_png), rot=(math.pi / 2, 0, 0), cname="hero")
    card.location = (SEAT.x, SEAT.y - 0.02, SEAT.z - 0.62 + hm / 2)
    sc.frame_start, sc.frame_end = 1, n_frames + hold
    # framing the screen: vertical frame shows the middle of a 16:9 screen
    close_loc = scr_c + Vector((0, -0.62, 0))
    close_look = scr_c
    cam.data.lens = 34
    import mathutils
    def key(frame, loc, look, lens):
        cam.location = loc
        d = Vector(look) - Vector(loc)
        cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        cam.data.lens = lens
        cam.keyframe_insert("location", frame=frame); cam.keyframe_insert("rotation_euler", frame=frame)
        cam.data.keyframe_insert("lens", frame=frame)
    key(1, close_loc, close_look, 34)
    key(hold + 1, close_loc, close_look, 34)
    key(n_frames + hold, Vector(WIDE_LOC), Vector(WIDE_LOOK), 34)
    for fc in (cam.animation_data.action.fcurves if cam.animation_data else []):
        for kp in fc.keyframe_points:
            kp.interpolation = "BEZIER"; kp.easing = "AUTO"
    if "dump" in EXTRA:
        quads = {}
        for f in range(1, n_frames + hold + 1):
            sc.frame_set(f)
            quads[f] = [proj(scr_c + Vector((dx * scr_w / 2, -0.001, dz * scr_h / 2)))[:2]
                        for dx, dz in ((-1, 1), (1, 1), (1, -1), (-1, -1))]
        json.dump(quads, open(os.path.join(OUT, "pull_quads.json"), "w"))
        sys.exit(0)
    show({"set", "screen", "door", "sofa", "hero"})
    sc.render.filepath = os.path.join(OUT, "pull_")
    sc.render.film_transparent = False
    fs_ = int(EXTRA[4]) if len(EXTRA) > 4 else 1
    sc.frame_start = fs_
    bpy.ops.render.render(animation=True)

elif MODE == "side":
    # profile angle from the left wall towards the sofa (figures face left)
    cam.location = (-2.05, -0.62, 1.08)
    d = Vector((0.9, -0.2, 0.86)) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = 36
    sc.frame_set(1)
    A = {"seat": proj(SEAT) + [px_per_m(SEAT)],
         "cam": dict(mw_inv=[list(r) for r in sc.camera.matrix_world.inverted()], lens=sc.camera.data.lens, sensor_h=36)}
    json.dump(A, open(os.path.join(OUT, "anchors_side.json"), "w"), indent=1)
    show({"set", "screen", "door", "sofa"}); render(os.path.join(OUT, "side_bg.png"))

if MODE == "orbit":
    # One continuous camera move behind the sofa; each era renders its own slice
    # of the same path, so cuts between eras keep the motion seamless.
    #   EXTRA: f0 f1 tv_seq_first_png card_spec...   card_spec = path@x,y,z
    f0, f1, tvp = int(EXTRA[0]), int(EXTRA[1]), EXTRA[2]
    N_ORBIT = 240
    if tvp != "none":
        m = img_mat(tvp, sequence=True, frames=f1 - f0 + 1)
        screen.data.materials.clear(); screen.data.materials.append(m)
    cards = []
    for spec in EXTRA[3:]:
        path, xyz = spec.split("@")
        x, y, z = (float(v) for v in xyz.split(","))
        ch = bpy.data.images.load(path)
        cw, chh = ch.size
        hm = 1.45
        c = plane("card", (0, 0, 0), (hm * cw / chh, hm), img_mat(path), rot=(math.pi / 2, 0, 0), cname="hero")
        c.location = (x, y - 0.02, z - 0.62 + hm / 2)
        cards.append(c)
    # ink lines only on the set, never on the figure cards
    ls.select_by_collection = True
    ls.collection = coll("hero")
    ls.collection_negation = "EXCLUSIVE"
    pivot = Vector((-0.30, -0.55, 0.0))
    target0 = Vector((-0.30, -0.15, 1.0))
    for f in range(f0, f1 + 1):
        u = f / (N_ORBIT - 1)
        th = math.radians(-26 + 50 * u)
        R = 3.5 - 0.6 * u
        loc = pivot + Vector((R * math.sin(th), -R * math.cos(th), 1.72 - 0.1 * u))
        cam.location = loc
        d = target0 - loc
        cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        cam.data.lens = 28 + 3 * u
        cam.keyframe_insert("location", frame=f - f0 + 1)
        cam.keyframe_insert("rotation_euler", frame=f - f0 + 1)
        cam.data.keyframe_insert("lens", frame=f - f0 + 1)
        for c in cards:
            c.rotation_euler = (math.pi / 2, 0, th)
            c.keyframe_insert("rotation_euler", frame=f - f0 + 1)
    for fc in cam.animation_data.action.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
    sc.frame_start, sc.frame_end = 1, f1 - f0 + 1
    show({"set", "screen", "door", "sofa", "hero"})
    sc.render.film_transparent = False
    os.makedirs(os.path.join(HERE, "..", "build", "orbit"), exist_ok=True)
    sc.render.filepath = os.path.join(HERE, "..", "build", "orbit", f"o{ERA}_")
    bpy.ops.render.render(animation=True)

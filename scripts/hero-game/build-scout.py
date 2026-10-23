"""Builds the scout, the hero game's publisher NPC, as a skinned GLB.

Run headless:  blender -b --python scripts/hero-game/build-scout.py

A soft clay chibi like the programmer, about 0.88 tall, feet at the origin
and facing -Y (+Z in glTF): a friendly businessman with dark wavy hair swept
back and up, silver at the temples, round black glasses, a navy two-piece
suit over a white shirt and a red tie, a red pocket square, brown dress shoes
and a steel watch on his left wrist. Every part the scene may recolour is its
own named mesh: skin, hair, eyes, glasses, suit, shirt, tie, pocket_square,
buttons, shoes and watch.

The parts that bend (jacket body and sleeves, trousers) are lathed quad shells
with edge loops at the joints and one level of subdivision; the lapels, shirt
front, tie and pockets are panels laid on the jacket and weighted to the same
bones, so they ride it. Weights are computed here, as for the sage.

He stands guard by a chest and never walks. The armature carries three
looping idles, `idle_breathe` (6 s), `idle_tie` (4 s) and `idle_watch` (4 s),
which all start and end on one neutral pose with both hands loose at his
sides, so the scene can crossfade any of them into any other.
"""

import math
import os

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector, geometry, noise

OUT_DIR = os.path.join(os.path.dirname(__file__), "../../public/models/hero-game")

HEIGHT = 0.88
FPS = 24
HEAD = Vector((0, 0, 0.7))
HEAD_R = 0.152
# The head is a little wider than deep: a chibi's cheeks.
HEAD_SCALE = (1.1, 1.0, 0.96)

ARM_DROP = math.radians(45)
SHOULDER_Z = 0.48
UPPER_ARM, FOREARM, HAND_REACH = 0.115, 0.1, 0.038
LEG_X = 0.068

# Where the neutral pose puts the hands: both loose at his sides.
IDLE_HAND_R = Vector((-0.198, -0.02, 0.25))
IDLE_HAND_L = Vector((0.198, -0.02, 0.25))

# The jacket's V: the shirt shows from the top button up to the collar.
V_LOW, V_HIGH, V_HALF = 0.385, 0.535, 0.62
TIE_KNOT = Vector((0, -0.068, 0.522))

COLOURS = {
    "skin": "#F2B49B",
    "cheeks": "#EE8F80",
    "hair": "#3A2A22",
    "hair_grey": "#9C9B97",
    "eyes": "#1B1716",
    "glasses": "#1A1917",
    "suit": "#232838",
    "shirt": "#F7F5F0",
    "tie": "#E2372B",
    "pocket_square": "#E2372B",
    "buttons": "#1A1917",
    "shoes": "#3B2418",
    "watch": "#B9B7B3",
    "watch_face": "#1A1917",
}


def arm_points(side):
    """Shoulder, elbow, wrist and hand centre of one A-pose arm (side -1 is
    his right, toward -X)."""
    shoulder = Vector((side * 0.112, 0, SHOULDER_Z))
    down = Vector((side * math.cos(ARM_DROP), 0, -math.sin(ARM_DROP)))
    elbow = shoulder + down * UPPER_ARM
    wrist = elbow + down * FOREARM
    return shoulder, elbow, wrist, wrist + down * HAND_REACH


def skeleton():
    """name: (head, tail, parent), in modelling units; only `root` does not
    deform."""
    bones = {
        "root": ((0, 0, 0), (0, 0.12, 0), None),
        "hips": ((0, 0, 0.27), (0, 0, 0.34), "root"),
        "spine": ((0, 0, 0.34), (0, 0, 0.43), "hips"),
        "chest": ((0, 0, 0.43), (0, 0, 0.53), "spine"),
        "neck": ((0, 0, 0.53), (0, 0, 0.57), "chest"),
        "head": ((0, 0, 0.57), (0, 0, 0.86), "neck"),
    }
    for side, tag in ((1, "L"), (-1, "R")):
        shoulder, elbow, wrist, _ = arm_points(side)
        x = side * LEG_X
        bones.update({
            f"shoulder.{tag}": ((side * 0.03, 0, SHOULDER_Z), tuple(shoulder), "chest"),
            f"upper_arm.{tag}": (tuple(shoulder), tuple(elbow), f"shoulder.{tag}"),
            f"forearm.{tag}": (tuple(elbow), tuple(wrist), f"upper_arm.{tag}"),
            f"hand.{tag}": (tuple(wrist), tuple(wrist + (wrist - elbow).normalized() * 0.076), f"forearm.{tag}"),
            f"thigh.{tag}": ((x, 0, 0.29), (x, 0, 0.17), "hips"),
            f"shin.{tag}": ((x, 0, 0.17), (x, 0, 0.06), f"thigh.{tag}"),
            f"foot.{tag}": ((x, 0, 0.06), (x, -0.09, 0.02), f"shin.{tag}"),
        })
    return bones


BONES = skeleton()
BODY = ["hips", "spine", "chest", "neck"]
LEGS = ["thigh.L", "thigh.R"]
JACKET_BONES = BODY + LEGS + ["shoulder.L", "shoulder.R"]


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = FPS


def srgb(hex_colour):
    """Hex to the linear RGBA that a Principled base colour takes."""
    channels = [int(hex_colour[i : i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
    return (*linear, 1)


def material(name, roughness=0.8, emission=0.0):
    mat = bpy.data.materials.new(name)
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    colour = srgb(COLOURS[name])
    bsdf.inputs["Base Color"].default_value = colour
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        bsdf.inputs["Emission Color"].default_value = colour
        bsdf.inputs["Emission Strength"].default_value = emission
    mat.diffuse_color = colour
    return mat


def activate(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def apply_modifiers(obj):
    activate(obj)
    for mod in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)


def subdivide(obj, levels=1):
    mod = obj.modifiers.new("subsurf", "SUBSURF")
    mod.levels = levels
    mod.render_levels = levels
    apply_modifiers(obj)


def bevel(obj, width, segments=2):
    mod = obj.modifiers.new("bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    apply_modifiers(obj)


def triangles(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def decimate(obj, target):
    """Collapses `obj` down to about `target` triangles; rigid parts only."""
    count = triangles(obj)
    if count <= target:
        return
    mod = obj.modifiers.new("decimate", "DECIMATE")
    mod.decimate_type = "COLLAPSE"
    mod.ratio = target / count
    apply_modifiers(obj)


def join(objects, name):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = name
    joined.data.name = name
    return joined


def bind(obj, bones, power=4, keep=3):
    """Weights `obj` to `bones`: one bone makes it rigid; several share each
    vertex among its `keep` nearest by inverse distance to the bone segment."""
    groups = {name: obj.vertex_groups.get(name) or obj.vertex_groups.new(name=name) for name in bones}
    if len(bones) == 1:
        groups[bones[0]].add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
        return obj
    segments = {name: (Vector(BONES[name][0]), Vector(BONES[name][1])) for name in bones}
    for v in obj.data.vertices:
        scores = []
        for name, (a, b) in segments.items():
            closest, t = geometry.intersect_point_line(v.co, a, b)
            closest = a if t < 0 else b if t > 1 else closest
            scores.append((1 / max((v.co - closest).length, 1e-4) ** power, name))
        scores = sorted(scores, reverse=True)[:keep]
        total = sum(s for s, _ in scores)
        for s, name in scores:
            if s / total > 0.02:
                groups[name].add([v.index], s / total, "REPLACE")
    return obj


def mesh_object(name, mesh):
    bmesh.ops.recalc_face_normals(mesh, faces=mesh.faces)
    data = bpy.data.meshes.new(name)
    mesh.to_mesh(data)
    mesh.free()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return obj


def lathe(name, rings, segments=20, caps=(False, False)):
    """A quad shell swept round the Z axis through elliptical rings.

    Each ring is (z, rx, ry) or (z, rx, ry, dy), dy shifting it along Y; every
    ring is an edge loop, so rings are placed where the shell must bend.
    """
    mesh = bmesh.new()
    rows = []
    for ring in rings:
        z, rx, ry = ring[:3]
        dy = ring[3] if len(ring) > 3 else 0
        angles = [2 * math.pi * k / segments for k in range(segments)]
        rows.append([mesh.verts.new((rx * math.sin(a), -ry * math.cos(a) + dy, z)) for a in angles])
    for low, high in zip(rows, rows[1:]):
        for k in range(segments):
            k2 = (k + 1) % segments
            mesh.faces.new((low[k], low[k2], high[k2], high[k]))
    if caps[0]:
        mesh.faces.new(list(reversed(rows[0])))
    if caps[1]:
        mesh.faces.new(rows[-1])
    return mesh_object(name, mesh)


def sweep(name, points, normals, width, thickness, segments=8):
    """An oval tube along `points`, its cross-section `width` across and
    `thickness` along each point's normal; closed at both ends."""
    mesh = bmesh.new()
    rows = []
    for i, (p, n) in enumerate(zip(points, normals)):
        ahead = points[min(i + 1, len(points) - 1)] - points[max(i - 1, 0)]
        side = ahead.cross(n).normalized()
        rows.append([
            mesh.verts.new(p + side * (width / 2) * math.cos(a) + n * (thickness / 2) * math.sin(a))
            for a in (2 * math.pi * k / segments for k in range(segments))
        ])
    for low, high in zip(rows, rows[1:]):
        for k in range(segments):
            k2 = (k + 1) % segments
            mesh.faces.new((low[k], low[k2], high[k2], high[k]))
    mesh.faces.new(list(reversed(rows[0])))
    mesh.faces.new(rows[-1])
    return mesh_object(name, mesh)


def along(start, end):
    """Matrix taking the +Z axis from the origin onto the segment start-end."""
    direction = Vector(end) - Vector(start)
    rotation = direction.to_track_quat("Z", "Y").to_matrix().to_4x4()
    return Matrix.Translation(start) @ rotation


def sphere(location, scale, segments=16, rings=10, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=1)
    obj = bpy.context.active_object
    obj.data.transform(Matrix.LocRotScale(location, Euler(rotation), scale))
    return obj


def cylinder(start, end, radius, vertices=8):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=1)
    obj = bpy.context.active_object
    length = (Vector(end) - Vector(start)).length
    obj.data.transform(Matrix.Translation((0, 0, 0.5)))
    obj.data.transform(along(Vector(start), Vector(end)) @ Matrix.Diagonal((1, 1, length, 1)))
    return obj


def blobs(name, elements, resolution=0.009, target=None):
    """Metaball clumps turned into one smooth mesh; each element is (centre,
    half-extents) or (centre, half-extents, rotation)."""
    meta = bpy.data.metaballs.new(name)
    meta.resolution = resolution
    meta.render_resolution = resolution
    meta.threshold = 0.6
    obj = bpy.data.objects.new(name, meta)
    bpy.context.collection.objects.link(obj)
    for element in elements:
        centre, half = element[0], element[1]
        rotation = element[2] if len(element) > 2 else (0, 0, 0)
        base = min(half)
        el = meta.elements.new(type="ELLIPSOID")
        el.co = centre
        el.radius = base / 0.57
        el.size_x, el.size_y, el.size_z = (h / base for h in half)
        el.rotation = Euler(rotation).to_quaternion()
    activate(obj)
    bpy.ops.object.convert(target="MESH")
    mesh_obj = bpy.context.active_object
    mesh_obj.name = name
    bpy.data.metaballs.remove(meta)
    if target:
        decimate(mesh_obj, target)
    return mesh_obj


def on_head(x, z, inset=0.0):
    """The point on the face at (x, z), pulled `inset` inward, and the
    rotation that points an object's +Z out of the face there."""
    sx, _, sz = HEAD_SCALE
    dx, dz = (x - HEAD.x) / sx, (z - HEAD.z) / sz
    dy = -math.sqrt(max(HEAD_R**2 - dx * dx - dz * dz, 0))
    normal = Vector((dx / sx, dy, dz / sz)).normalized()
    surface = HEAD + Vector((dx * sx, dy, dz * sz))
    point = surface - normal * inset
    rotation = normal.to_track_quat("Z", "Y").to_euler()
    return point, rotation



def tuft(root, direction, length, width, curl=0.25, flat=0.6, up=Vector((0, 0, 1)), segments=6):
    """One pointed lock of hair: a flattened teardrop from `root` along
    `direction`, its tip curled toward `up` by `curl` of its length."""
    profile = [(0, 0.7), (0.12, 0.95), (0.3, 1), (0.5, 0.8), (0.7, 0.52), (0.86, 0.26), (1, 0.02)]
    mesh = bmesh.new()
    rows = []
    for t, f in profile:
        r = width * f
        rows.append([
            mesh.verts.new((r * math.cos(a), r * flat * math.sin(a) + curl * length * t * t, t * length))
            for a in (2 * math.pi * k / segments for k in range(segments))
        ])
    for low, high in zip(rows, rows[1:]):
        for k in range(segments):
            k2 = (k + 1) % segments
            mesh.faces.new((low[k], low[k2], high[k2], high[k]))
    mesh.faces.new(list(reversed(rows[0])))
    mesh.faces.new(rows[-1])
    obj = mesh_object("tuft", mesh)
    z = direction.normalized()
    y = (up - up.dot(z) * z).normalized()
    x = y.cross(z)
    orient = Matrix((x, y, z)).transposed().to_4x4()
    obj.data.transform(Matrix.Translation(root) @ orient)
    return obj


def head_point(azimuth, elevation, radius=1.0):
    """A point on the head's ellipsoid, azimuth from the front (-Y) toward +X,
    elevation up from the ear line, scaled by `radius`."""
    sx, sy, sz = HEAD_SCALE
    c = math.cos(elevation)
    d = Vector((math.sin(azimuth) * c * sx, -math.cos(azimuth) * c * sy, math.sin(elevation) * sz))
    return HEAD + d * HEAD_R * radius



def painted(obj, mat):
    obj.data.materials.append(mat)
    return obj


def build_skin():
    skin = material("skin", roughness=0.7)
    head = sphere(HEAD, tuple(HEAD_R * s for s in HEAD_SCALE), segments=22, rings=14)
    nose_at, _ = on_head(0, HEAD.z - 0.03, inset=0.01)
    nose = sphere(nose_at, (0.022, 0.02, 0.018), segments=10, rings=6)
    ears = []
    for side in (-1, 1):
        ear = sphere(Vector((side * 0.163, 0.006, HEAD.z - 0.018)), (0.02, 0.03, 0.036), segments=10, rings=7, rotation=(0, side * 0.25, 0))
        ears.append(ear)
    face = bind(join([head, nose] + ears, "face"), ["head"])
    painted(face, skin)
    rosy = material("cheeks", roughness=0.8)
    blush = []
    for side in (-1, 1):
        point, rotation = on_head(side * 0.098, HEAD.z - 0.05, inset=-0.0005)
        blush.append(painted(sphere(point, (0.024, 0.017, 0.004), segments=10, rings=5, rotation=rotation), rosy))
    cheeks = bind(join(blush, "cheeks"), ["head"])
    neck = painted(lathe("neck", [(0.5, 0.045, 0.045), (0.6, 0.045, 0.045)], segments=10), skin)
    neck = bind(neck, ["neck", "head"], keep=2)
    hands = []
    for side, tag in ((-1, "R"), (1, "L")):
        shoulder, _, wrist, centre = arm_points(side)
        axis = (wrist - shoulder).normalized()
        palm = sphere(Vector(), (0.034, 0.03, 0.042), segments=12, rings=8)
        # The thumb sits forward, as on a mitten.
        thumb = sphere(Vector((-0.004, -0.028, 0.004)), (0.014, 0.014, 0.022), segments=8, rings=6, rotation=(0.3, 0, 0))
        hand = join([palm, thumb], f"hand_{tag}")
        hand.data.transform(along(centre, centre + axis))
        hands.append(painted(bind(hand, [f"hand.{tag}"]), skin))
    return join([face, cheeks, neck] + hands, "skin")


def build_eyes():
    """Glossy dark eyes with a small white glint, and the smile: the one part
    with two materials."""
    dark = material("eyes", roughness=0.2)
    glint = bpy.data.materials.new("eyes_glint")
    bsdf = glint.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bsdf.inputs["Emission Color"].default_value = (1, 1, 1, 1)
    bsdf.inputs["Emission Strength"].default_value = 0.6
    parts = []
    for side in (-1, 1):
        point, rotation = on_head(side * 0.06, HEAD.z + 0.002, inset=0.006)
        eye = sphere(point, (0.024, 0.028, 0.011), segments=12, rings=7, rotation=rotation)
        eye.data.materials.append(dark)
        spark_at, spark_rot = on_head(side * 0.06 + 0.009, HEAD.z + 0.015, inset=-0.004)
        spark = sphere(spark_at, (0.007, 0.007, 0.003), segments=8, rings=4, rotation=spark_rot)
        spark.data.materials.append(glint)
        parts += [eye, spark]
    # A gentle, centred smile.
    points, normals = [], []
    for i in range(9):
        t = i / 8 - 0.5
        point, _ = on_head(t * 0.046, HEAD.z - 0.068 - 0.011 * (1 - 4 * t * t), inset=-0.001)
        points.append(point)
        normals.append((point - HEAD).normalized())
    smile = sweep("smile", points, normals, 0.007, 0.004, segments=6)
    smile.data.materials.append(dark)
    parts.append(smile)
    return bind(join(parts, "eyes"), ["head"])


def build_glasses():
    """Round black rims over the eyes, a bridge, and temples running back to
    the tops of the ears."""
    parts = []
    rims = []
    for side in (-1, 1):
        point, _ = on_head(side * 0.062, HEAD.z + 0.002, inset=-0.016)
        normal = (point - HEAD).normalized().lerp(Vector((0, -1, 0)), 0.55).normalized()
        bpy.ops.mesh.primitive_torus_add(major_segments=24, minor_segments=6, major_radius=0.045, minor_radius=0.0075)
        rim = bpy.context.active_object
        rim.data.transform(Matrix.LocRotScale(point, normal.to_track_quat("Z", "Y"), (1, 0.97, 1.15)))
        parts.append(rim)
        rims.append((point, normal))
    (pr, _), (pl, _) = rims
    inner_r = pr + Vector((0.045, 0, 0.006))
    inner_l = pl + Vector((-0.045, 0, 0.006))
    mid = (inner_r + inner_l) / 2 + Vector((0, -0.006, 0.006))
    parts.append(sweep("bridge", [inner_r, mid, inner_l], [Vector((0, -1, 0))] * 3, 0.011, 0.009, segments=6))
    for side, (point, _) in ((-1, rims[0]), (1, rims[1])):
        outer = point + Vector((side * 0.044, 0.004, 0.006))
        bend_at = Vector((side * 0.172, -0.03, HEAD.z + 0.01))
        ear_top = Vector((side * 0.171, 0.012, HEAD.z + 0.016))
        parts.append(sweep("temple", [outer, bend_at, ear_top], [Vector((0, 0, 1))] * 3, 0.0085, 0.008, segments=6))
    return bind(join(parts, "glasses"), ["head"])


def crown_point(x, theta, radius):
    """A point over the head at `x` across, `theta` along the arc from the
    forehead (0) over the crown (pi/2) to the back, `radius` times the head."""
    sx, sy, sz = HEAD_SCALE
    r = HEAD_R * radius
    across = math.sqrt(max(1 - (x / (r * sx)) ** 2, 0.05))
    return HEAD + Vector((x, -math.cos(theta) * r * sy * across, math.sin(theta) * r * sz * across))


def build_hair():
    """A low cap and, over it, soft rolls of hair swept up off the forehead
    and back over the crown, fullest at the front; silver streaks over the
    temples, the back kept short and neat."""
    dark = material("hair", roughness=0.85)
    grey = material("hair_grey", roughness=0.8)
    cap_at = HEAD + Vector((0, 0.03, 0.028))
    cap = (HEAD_R * HEAD_SCALE[0] * 1.04, HEAD_R * 1.06, HEAD_R * HEAD_SCALE[2] * 1.04)
    elements = []
    # Five waves side by side, each a row of ellipsoids along the arc, so the
    # grooves between them read as combed-back waves.
    for k, x in enumerate((-0.104, -0.054, 0.0, 0.054, 0.104)):
        edge = abs(x) > 0.08
        for theta, radius, thick in ((0.95, 1.13, 0.042), (1.3, 1.15, 0.045), (1.68, 1.11, 0.04), (2.06, 1.06, 0.034), (2.42, 1.0, 0.03)):
            wave = 0.006 * math.sin(theta * 5 + k * 1.7)
            centre = crown_point(x * (1 + 0.1 * (theta - 1)), theta, radius + wave - (0.05 if edge else 0))
            half = (0.03 if not edge else 0.026, 0.056, thick * (0.8 if edge else 1))
            elements.append((tuple(centre), half, (math.pi / 2 - theta, 0, -x * 0.8)))
    # The sides, swept back above the ears.
    for side in (-1, 1):
        for y, z, half in ((0.02, 0.05, (0.026, 0.06, 0.04)), (0.085, 0.03, (0.03, 0.055, 0.045))):
            elements.append(((side * 0.15, y, HEAD.z + z), half, (0.25, 0, 0)))
    waves = painted(blobs("mb_waves", elements, resolution=0.008, target=2600), dark)
    streaks = []
    for side in (-1, 1):
        streaks += [
            ((side * 0.155, -0.045, HEAD.z + 0.055), (0.022, 0.05, 0.026), (0.45, side * 0.15, 0)),
            ((side * 0.14, -0.06, HEAD.z + 0.095), (0.02, 0.042, 0.022), (0.7, side * 0.3, 0)),
        ]
    grey_streaks = painted(blobs("mb_streaks", streaks, resolution=0.006, target=500), grey)

    brows = []
    for side in (-1, 1):
        point, _ = on_head(side * 0.06, HEAD.z + 0.068, inset=-0.006)
        brows.append((tuple(point), (0.034, 0.016, 0.014), (0, -side * 0.1, 0)))
    brow = painted(blobs("mb_brows", brows, resolution=0.004, target=300), dark)
    cap = painted(sphere(cap_at, cap, segments=22, rings=12), dark)
    return bind(join([cap, waves, brow, grey_streaks], "hair"), ["head"])


# The jacket's body: (z, rx, ry, dy), hem to the top of the shoulders.
JACKET = [
    (0.212, 0.13, 0.114, 0.006),
    (0.222, 0.135, 0.119, 0.006),
    (0.262, 0.136, 0.12, 0.006),
    (0.3, 0.136, 0.12, 0.006),
    (0.34, 0.136, 0.12, 0.006),
    (0.4, 0.139, 0.122, 0.006),
    (0.45, 0.137, 0.118, 0.006),
    (0.49, 0.124, 0.107, 0.008),
    (0.515, 0.095, 0.085, 0.012),
    (0.535, 0.062, 0.06, 0.012),
]


def jacket_surface(z, angle):
    """The point on the jacket body at height z and angle from the front
    (positive toward his left, +X)."""
    z = min(max(z, JACKET[0][0]), JACKET[-1][0])
    for low, high in zip(JACKET, JACKET[1:]):
        if low[0] <= z <= high[0]:
            t = (z - low[0]) / (high[0] - low[0])
            rx, ry, dy = (low[i] + (high[i] - low[i]) * t for i in (1, 2, 3))
            return Vector((rx * math.sin(angle), -ry * math.cos(angle) + dy, z))
    raise ValueError(z)


def jacket_normal(z, angle):
    dz = 0.003
    z = min(max(z, JACKET[0][0] + dz), JACKET[-1][0] - dz)
    across = jacket_surface(z, angle + 0.01) - jacket_surface(z, angle - 0.01)
    up = jacket_surface(z + dz, angle) - jacket_surface(z - dz, angle)
    return across.cross(up).normalized()


def v_half(z):
    """Half-angle of the jacket's V opening at height z."""
    return V_HALF * min(max((z - V_LOW) / (V_HIGH - V_LOW), 0), 1)


def panel(name, rows, lift, columns=8, depth=0.004):
    """A closed slab lying on the jacket: each row is (z, angle_from,
    angle_to); its outer face stands `lift` proud of the body and its inner
    face sinks `depth` into it, so no gap shows at the edge."""
    mesh = bmesh.new()
    outer, inner = [], []
    for z, a0, a1 in rows:
        o_row, i_row = [], []
        for i in range(columns + 1):
            a = a0 + (a1 - a0) * i / columns
            p, n = jacket_surface(z, a), jacket_normal(z, a)
            o_row.append(mesh.verts.new(p + n * lift))
            i_row.append(mesh.verts.new(p - n * depth))
        outer.append(o_row)
        inner.append(i_row)
    last_row, last_col = len(rows) - 1, columns
    for j in range(last_row):
        for i in range(columns):
            mesh.faces.new((outer[j][i], outer[j][i + 1], outer[j + 1][i + 1], outer[j + 1][i]))
            mesh.faces.new((inner[j + 1][i], inner[j + 1][i + 1], inner[j][i + 1], inner[j][i]))
    for j in range(last_row):
        mesh.faces.new((outer[j][0], outer[j + 1][0], inner[j + 1][0], inner[j][0]))
        mesh.faces.new((inner[j][last_col], inner[j + 1][last_col], outer[j + 1][last_col], outer[j][last_col]))
    for i in range(columns):
        mesh.faces.new((inner[0][i], inner[0][i + 1], outer[0][i + 1], outer[0][i]))
        mesh.faces.new((outer[last_row][i], outer[last_row][i + 1], inner[last_row][i + 1], inner[last_row][i]))
    return mesh_object(name, mesh)


def lapel_rows(side, steps=8):
    """One lapel from the top button up to the notch, widest at the top: its
    inner edge tucks under the V's edge, its outer edge flares out."""
    rows = []
    for k in range(steps + 1):
        z = V_LOW + (0.5 - V_LOW) * k / steps
        t = (z - V_LOW) / (0.5 - V_LOW)
        a_in = v_half(z) - 0.035
        a_out = v_half(z) + 0.44 * t**0.8
        rows.append((z, a_in, a_out) if side > 0 else (z, -a_out, -a_in))
    return rows


def build_suit():
    """Jacket, lapels, collar, pockets, sleeves and trousers: one navy mesh."""
    body = lathe("jacket", JACKET, segments=16, caps=(False, True))
    subdivide(body)
    bind(body, JACKET_BONES)
    parts = [body]
    for side in (-1, 1):
        lapel = panel("lapel", lapel_rows(side), 0.009, columns=6)
        # The collar, above the notch, round the back of the neck.
        collar_rows = []
        for z in (0.505, 0.52, 0.534):
            a_in = v_half(z) - 0.03
            collar_rows.append((z, a_in, math.pi) if side > 0 else (z, -math.pi, -a_in))
        collar = panel("collar", collar_rows, 0.009, columns=12)
        flap = panel("flap", [(0.262, side * 0.72, side * 1.22), (0.276, side * 0.7, side * 1.24), (0.29, side * 0.7, side * 1.24)], 0.006, columns=6)
        bevel(flap, 0.002, 1)
        parts += [bind(lapel, JACKET_BONES), bind(collar, JACKET_BONES), bind(flap, JACKET_BONES)]
    welt = panel("welt", [(0.43, 0.56, 0.86), (0.442, 0.56, 0.86)], 0.004, columns=5)
    parts.append(bind(welt, JACKET_BONES))

    for side, tag in ((-1, "R"), (1, "L")):
        shoulder, _, wrist, _ = arm_points(side)
        length = (wrist - shoulder).length
        mid = UPPER_ARM
        sleeve = lathe(
            "sleeve",
            [
                (-0.035, 0.033, 0.033),
                (-0.012, 0.05, 0.05),
                (0.04, 0.052, 0.052),
                (mid - 0.02, 0.05, 0.05),
                (mid, 0.049, 0.049),
                (mid + 0.02, 0.048, 0.048),
                (length - 0.03, 0.045, 0.045),
                (length - 0.012, 0.044, 0.044),
                (length - 0.012, 0.036, 0.036),
            ],
            segments=10,
            caps=(True, True),
        )
        sleeve.data.transform(along(shoulder, wrist))
        subdivide(sleeve)
        parts.append(bind(sleeve, [f"shoulder.{tag}", f"upper_arm.{tag}", f"forearm.{tag}"], keep=2))

    for side, tag in ((1, "L"), (-1, "R")):
        leg = lathe(
            "leg",
            [
                (0.044, 0.049, 0.049),
                (0.05, 0.053, 0.053),
                (0.09, 0.053, 0.053),
                (0.105, 0.055, 0.055),
                (0.15, 0.057, 0.057),
                (0.17, 0.057, 0.057),
                (0.19, 0.058, 0.058),
                (0.25, 0.061, 0.061),
                (0.31, 0.061, 0.061),
            ],
            segments=10,
            caps=(True, True),
        )
        leg.data.transform(Matrix.Translation((side * LEG_X, 0, 0)))
        subdivide(leg)
        parts.append(bind(leg, ["hips", f"thigh.{tag}", f"shin.{tag}"], keep=2))
    return join(parts, "suit")


def build_shirt():
    """The white shirt front in the V, its collar and the cuffs."""
    parts = []
    rows = [(z, -max(v_half(z), 0.03), max(v_half(z), 0.03)) for z in (V_LOW - 0.005, 0.41, 0.44, 0.47, 0.5, 0.52, V_HIGH)]
    parts.append(bind(panel("front", rows, 0.003, columns=6), JACKET_BONES))
    for side in (-1, 1):
        rows = [(0.5, 0.05, 0.12), (0.515, 0.045, 0.3), (0.53, 0.04, 0.46), (0.537, 0.04, 0.5)]
        rows = [(z, side * a0, side * a1) if side > 0 else (z, side * a1, side * a0) for z, a0, a1 in rows]
        parts.append(bind(panel("collar_point", rows, 0.013, columns=5, depth=0.0), JACKET_BONES))
    bpy.ops.mesh.primitive_torus_add(major_segments=18, minor_segments=6, major_radius=0.05, minor_radius=0.01)
    band = bpy.context.active_object
    band.data.transform(Matrix.Translation((0, 0.004, 0.546)))
    parts.append(bind(band, ["chest", "neck"], keep=2))
    for side, tag in ((-1, "R"), (1, "L")):
        shoulder, _, wrist, _ = arm_points(side)
        length = (wrist - shoulder).length
        cuff = lathe(
            "cuff",
            [(length - 0.03, 0.037, 0.037), (length + 0.004, 0.037, 0.037), (length + 0.006, 0.031, 0.031)],
            segments=12,
            caps=(True, True),
        )
        cuff.data.transform(along(shoulder, wrist))
        parts.append(bind(cuff, [f"forearm.{tag}"]))
    return join(parts, "shirt")


def build_tie():
    knot_at = jacket_surface(TIE_KNOT.z, 0) + jacket_normal(TIE_KNOT.z, 0) * 0.012
    knot = sphere(knot_at, (0.016, 0.011, 0.014), segments=10, rings=7, rotation=(0.5, 0, 0))
    rows = []
    for z in (V_LOW + 0.004, 0.41, 0.44, 0.47, 0.5, 0.512):
        t = (z - V_LOW) / (0.512 - V_LOW)
        half = (0.018 - 0.007 * t) / jacket_surface(z, math.pi / 2).x
        rows.append((z, -half, half))
    blade = panel("blade", rows, 0.0065, columns=4)
    return bind(join([knot, blade], "tie"), JACKET_BONES)


def build_pocket_square():
    """Three red points peeking out of the breast pocket."""
    parts = []
    for k, (a, length, lean) in enumerate(((0.6, 0.026, -0.3), (0.7, 0.032, 0.0), (0.8, 0.025, 0.3))):
        root = jacket_surface(0.436, a) + jacket_normal(0.436, a) * 0.003
        normal = jacket_normal(0.436, a)
        up = jacket_surface(0.45, a) - jacket_surface(0.43, a)
        direction = Matrix.Rotation(lean, 3, normal) @ up.normalized()
        parts.append(tuft(root, direction, length, 0.012, curl=0.05, flat=0.35, up=normal))
    return bind(join(parts, "pocket_square"), JACKET_BONES)


def build_buttons():
    parts = []
    for z in (0.365, 0.315):
        p, n = jacket_surface(z, 0), jacket_normal(z, 0)
        parts.append(cylinder(p + n * 0.002, p + n * 0.008, 0.0105, vertices=12))
    return bind(join(parts, "buttons"), JACKET_BONES)


SHOE = (Vector((0, -0.032, 0.03)), (0.046, 0.088, 0.034))


def build_shoes():
    shoes = []
    for side, tag in ((1, "L"), (-1, "R")):
        x = side * LEG_X
        centre, half = SHOE
        upper = sphere(centre + Vector((x, 0, 0)), half, segments=16, rings=10)
        for v in upper.data.vertices:
            v.co.z = max(v.co.z, 0.014)
        sole = sphere(centre + Vector((x, -0.002, -0.026)), (half[0] + 0.004, half[1] + 0.005, 0.03), segments=16, rings=8)
        for v in sole.data.vertices:
            v.co.z = min(max(v.co.z, 0.0), 0.014)
        shoes.append(bind(join([upper, sole], "shoe"), [f"foot.{tag}"]))
    return join(shoes, "shoes")


def watch_frame():
    """Centre of the watch on his left wrist, the arm's axis there, and the
    direction its face looks in the rest pose: the back of the wrist."""
    _, elbow, wrist, _ = arm_points(1)
    axis = (wrist - elbow).normalized()
    back = Vector((math.sin(ARM_DROP), 0, math.cos(ARM_DROP)))
    return wrist + axis * 0.008, axis, back


def build_watch():
    centre, axis, back = watch_frame()
    bpy.ops.mesh.primitive_torus_add(major_segments=16, minor_segments=5, major_radius=0.033, minor_radius=0.0065)
    band = bpy.context.active_object
    band.data.transform(Matrix.LocRotScale(centre, axis.to_track_quat("Z", "Y"), (1, 1, 1.3)))
    case = cylinder(centre + back * 0.033, centre + back * 0.043, 0.015, vertices=16)
    steel = material("watch", roughness=0.3)
    painted(band, steel)
    painted(case, steel)
    dial = painted(cylinder(centre + back * 0.04, centre + back * 0.0445, 0.011, vertices=16), material("watch_face", roughness=0.3))
    return bind(join([band, case, dial], "watch"), ["hand.L"])


def finish(obj, name, **shading):
    """Names, smooths and colours one exported part. No textures, so the UVs
    go too: they would only split vertices along seams."""
    obj.name = name
    obj.data.name = name
    while obj.data.uv_layers:
        obj.data.uv_layers.remove(obj.data.uv_layers[0])
    if not obj.data.materials:
        obj.data.materials.append(material(name, **shading))
    activate(obj)
    bpy.ops.object.shade_smooth()
    return obj


def build_armature(scale):
    data = bpy.data.armatures.new("rig")
    rig = bpy.data.objects.new("scout", data)
    bpy.context.collection.objects.link(rig)
    activate(rig)
    bpy.ops.object.mode_set(mode="EDIT")
    for name, (head, tail, parent) in BONES.items():
        bone = data.edit_bones.new(name)
        bone.head = Vector(head) * scale
        bone.tail = Vector(tail) * scale
        bone.use_deform = name != "root"
        if parent:
            bone.parent = data.edit_bones[parent]
            # Hands stay loose so a reach can place them exactly.
            bone.use_connect = Vector(BONES[parent][1]) == Vector(head) and not name.startswith("hand")
    bpy.ops.object.mode_set(mode="OBJECT")
    for bone in rig.pose.bones:
        bone.rotation_mode = "QUATERNION"
    return rig


def aim(bone, head, direction):
    """Poses `bone` (armature space) so it starts at `head` and points along
    `direction`, by the shortest turn from its rest direction: no twist."""
    rest = bone.bone.matrix_local.to_3x3()
    turn = rest.col[1].rotation_difference(direction.normalized()).to_matrix()
    matrix = (turn @ rest).to_4x4()
    matrix.translation = head
    bone.matrix = matrix
    bpy.context.view_layer.update()


def turn(bone, axis, angle):
    """Turns a posed bone about an armature-space axis through its head."""
    head = bone.head.copy()
    bone.matrix = Matrix.Translation(head) @ Matrix.Rotation(angle, 4, axis) @ Matrix.Translation(-head) @ bone.matrix
    bpy.context.view_layer.update()


def bend(upper, lower, target, pole, reach_past=0.0):
    """Two-bone IK by hand: bends upper and lower so that a point
    `reach_past` beyond the lower bone's tail lands on `target`, the middle
    joint swinging toward `pole`. Returns the middle joint."""
    root = upper.head.copy()
    a = upper.length
    b = lower.length + reach_past
    offset = target - root
    c = min(offset.length, (a + b) * 0.999)
    u = offset.normalized()
    w = (pole - pole.dot(u) * u).normalized()
    angle = math.acos(max(-1, min(1, (a * a + c * c - b * b) / (2 * a * c))))
    joint = root + a * (math.cos(angle) * u + math.sin(angle) * w)
    aim(upper, root, joint - root)
    aim(lower, joint, target - joint)
    return joint


def reach(rig, tag, target, pole, point=None):
    """Puts the centre of a hand on `target`, the hand in line with the
    forearm, or pointing at `point` when given."""
    bones = rig.pose.bones
    hand = bones[f"hand.{tag}"]
    elbow = bend(bones[f"upper_arm.{tag}"], bones[f"forearm.{tag}"], target, pole, hand.length / 2)
    wrist = bones[f"forearm.{tag}"].tail.copy()
    aim(hand, wrist, (point - wrist) if point is not None else target - elbow)


def clear_pose(rig):
    for bone in rig.pose.bones:
        bone.rotation_quaternion = (1, 0, 0, 0)
        bone.location = (0, 0, 0)
    bpy.context.view_layer.update()


def delta(bone):
    """The armature-space move a posed bone has made from its rest."""
    return bone.matrix @ bone.bone.matrix_local.inverted()


def pulse(t, start, end):
    """0 outside [start, end], easing up to 1 and back down inside it."""
    if not start < t < end:
        return 0.0
    return math.sin(math.pi * (t - start) / (end - start)) ** 2


def ease(t, start, end):
    """0 before `start`, 1 after `end`, smoothstepped in between."""
    x = min(max((t - start) / (end - start), 0), 1)
    return x * x * (3 - 2 * x)


def plant_feet(rig, k, feet=None):
    """Puts each ankle on its target (rest by default) by two-bone IK, the
    foot keeping its rest orientation turned by an optional pitch."""
    bones = rig.pose.bones
    for tag in ("L", "R"):
        rest_ankle = Vector(BONES[f"shin.{tag}"][1]) * k
        ankle, pitch = (rest_ankle, 0.0) if feet is None else feet[tag]
        bend(bones[f"thigh.{tag}"], bones[f"shin.{tag}"], ankle, Vector((0, -1, 0)))
        foot = bones[f"foot.{tag}"]
        matrix = Matrix.Rotation(pitch, 4, "X") @ foot.bone.matrix_local.copy()
        matrix.translation = ankle
        foot.matrix = matrix
        bpy.context.view_layer.update()



LEFT_POLE = Vector((1, 0.6, 0.1))
RIGHT_POLE = Vector((-1, 0.6, 0.1))
# The right hand at the knot comes in from his right, the elbow out to the
# side, so the sleeve clears the jacket's front.
TIE_POLE = Vector((-1, 0.1, -0.5))
TIE_HAND = Vector((-0.04, -0.05, -0.006))
# The left wrist brought up in front of his chest, forearm across the body.
WATCH_HAND = Vector((0.04, -0.21, 0.44))
WATCH_POLE = Vector((1, -0.1, -0.7))
# How far the left hand turns over on the raise so the watch face looks up.
WATCH_TWIST = 2.4


def pose(rig, k, breath=0.0, sway=0.0, nod=0.0, tilt=0.0, look=0.0, tie=0.0, tug=0.0, chin=0.0, watch=0.0, peek=0.0):
    """Poses him from a few channels, each 0 in the shared neutral pose every
    idle starts and ends on, so any idle can follow any other.

    breath and sway run -1..1: the chest rises as the hips dip, the weight
    rocks over one leg then the other. nod dips the head, tilt rolls it, look
    turns it, chin lifts it. tie brings the right hand to the knot, tug
    wiggles it there; watch raises the left wrist in front of his chest and
    peek bends his head down to it. The feet stay planted.
    """
    bones = rig.pose.bones
    clear_pose(rig)

    hips = bones["hips"]
    dip = -0.008 - 0.006 * (1 + breath) / 2
    hips.matrix = Matrix.Translation(Vector((0.014 * sway, 0, dip)) * k) @ hips.matrix
    bpy.context.view_layer.update()
    turn(hips, "Y", -0.05 * sway)
    turn(bones["spine"], "Y", 0.08 * sway)
    turn(bones["chest"], "X", -0.06 * breath - 0.04 * chin + 0.04 * peek)
    turn(bones["chest"], "Y", -0.03 * sway)
    turn(bones["chest"], "Z", 0.06 * watch)
    turn(bones["shoulder.L"], "Y", -0.07 * breath)
    turn(bones["shoulder.R"], "Y", 0.07 * breath + 0.12 * tie)
    turn(bones["neck"], "X", 0.035 * breath)
    head = bones["head"]
    turn(head, "X", 0.16 * nod - 0.16 * chin + 0.3 * peek)
    turn(head, "Z", 0.12 * look + 0.22 * peek)
    turn(head, "Y", 0.04 * sway + 0.1 * tilt - 0.08 * peek)

    chest = delta(bones["chest"])
    knot = chest @ ((TIE_KNOT + TIE_HAND + Vector((0.008 * tug, 0, 0.004 * abs(tug)))) * k)
    knot_tip = chest @ ((TIE_KNOT + Vector((0, -0.016, 0.012))) * k)
    rest = (IDLE_HAND_R + Vector((0, 0, 0.004 * breath))) * k
    target = rest.lerp(knot, tie)
    point = knot_tip if tie > 0 else None
    if point is not None:
        free = target + (target - bones["upper_arm.R"].head) * 0.5
        point = free.lerp(point, tie)
    reach(rig, "R", target, RIGHT_POLE.lerp(TIE_POLE, tie), point)

    rest = (IDLE_HAND_L + Vector((0, 0, 0.004 * breath))) * k
    raised = chest @ (WATCH_HAND * k)
    target = rest.lerp(raised, watch)
    point = None
    if watch > 0:
        free = target + (target - bones["upper_arm.L"].head) * 0.5
        point = free.lerp(chest @ ((WATCH_HAND + Vector((-0.08, -0.01, 0.005))) * k), watch)
    reach(rig, "L", target, LEFT_POLE.lerp(WATCH_POLE, watch), point)
    if watch:
        hand = bones["hand.L"]
        turn(hand, (hand.tail - hand.head).normalized(), WATCH_TWIST * watch)

    plant_feet(rig, k)


def breathe(t):
    return dict(breath=math.sin(4 * math.pi * t), sway=math.sin(2 * math.pi * t), look=0.4 * math.sin(2 * math.pi * t + 0.8))


def straighten_tie(t):
    held = ease(t, 0.08, 0.26) * (1 - ease(t, 0.58, 0.76))
    wiggle = math.sin(4 * math.pi * (t - 0.26) / 0.3) * pulse(t, 0.26, 0.56)
    return dict(
        breath=0.6 * math.sin(4 * math.pi * t),
        sway=0.25 * math.sin(2 * math.pi * t),
        tie=held,
        tug=wiggle,
        chin=0.8 * held,
        nod=0.7 * pulse(t, 0.7, 0.88),
    )


def check_watch(t):
    raised = ease(t, 0.08, 0.28) * (1 - ease(t, 0.66, 0.86))
    reading = ease(t, 0.2, 0.32) * (1 - ease(t, 0.52, 0.62))
    return dict(
        breath=0.6 * math.sin(4 * math.pi * t),
        sway=0.25 * math.sin(2 * math.pi * t),
        watch=raised,
        peek=reading,
        chin=0.6 * pulse(t, 0.55, 0.9),
    )


IDLES = {"idle_breathe": (breathe, 6), "idle_tie": (straighten_tie, 4), "idle_watch": (check_watch, 4)}


def fcurves(action):
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                yield from bag.fcurves


def animate(rig, name, frames, step, posing):
    """Keys one looping action every `step` frames, densely enough for the IK
    paths to survive interpolation; the last key repeats the first.
    Quaternions are kept on one hemisphere from key to key, or the
    interpolation would spin a bone the long way round. The action is left
    unassigned with a fake user; the exporter's ACTIONS mode writes every
    action that animates this armature as its own animation."""
    data = rig.animation_data or rig.animation_data_create()
    data.action = None
    last = {}
    for frame in range(0, frames + 1, step):
        posing(frame / frames % 1)
        for bone in rig.pose.bones:
            q = bone.rotation_quaternion.copy()
            if bone.name in last and last[bone.name].dot(q) < 0:
                q.negate()
                bone.rotation_quaternion = q
            last[bone.name] = q
            bone.keyframe_insert("rotation_quaternion", frame=frame)
            bone.keyframe_insert("location", frame=frame)
    action = data.action
    action.name = name
    # Cyclic curves get cycle-aware handles, so the velocity carries straight
    # through the seam instead of easing to a stop on the first and last key.
    for curve in fcurves(action):
        curve.modifiers.new("CYCLES")
        curve.update()
    action.use_fake_user = True
    data.action = None



def bake_occlusion(parts, skip, distance=0.1, strength=0.6, floor=0.55):
    """Bakes a light ambient occlusion into each part's `ao` vertex colours,
    with the whole figure present so the hair shades the face under it and
    the arms his sides. Kept light: open surfaces stay white, the deepest
    creases come out near `floor`."""
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 64
    scene.world = scene.world or bpy.data.worlds.new("world")
    scene.world.light_settings.distance = distance
    for obj in parts:
        if obj.name in skip:
            continue
        colours = obj.data.color_attributes.new("ao", "BYTE_COLOR", "POINT")
        obj.data.color_attributes.active_color = colours
        activate(obj)
        bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
        for c in colours.data:
            shade = max(1 - strength * (1 - c.color[0]), floor)
            c.color = (shade, shade, shade, 1)


def export(rig, meshes, name):
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    os.makedirs(OUT_DIR, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT_DIR, f"{name}.glb"),
        export_format="GLB",
        use_selection=True,
        export_skins=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_def_bones=False,
        # The ao colours, as COLOR_0, multiply the base colour in glTF.
        export_vertex_color="ACTIVE",
        # Keys every 2 frames: smooth idles at half the size.
        export_frame_step=2,
        export_all_vertex_colors=False,
    )



def build_scout():
    reset()
    parts = [
        finish(build_skin(), "skin"),
        finish(build_hair(), "hair"),
        finish(build_eyes(), "eyes"),
        finish(build_glasses(), "glasses", roughness=0.4),
        finish(build_suit(), "suit", roughness=0.75),
        finish(build_shirt(), "shirt", roughness=0.8),
        finish(build_tie(), "tie", roughness=0.6),
        finish(build_pocket_square(), "pocket_square", roughness=0.7),
        finish(build_buttons(), "buttons", roughness=0.4),
        finish(build_shoes(), "shoes", roughness=0.45),
        finish(build_watch(), "watch"),
    ]

    # Modelled by eye, then sized so he stands exactly HEIGHT tall.
    top = max(v.co.z for obj in parts for v in obj.data.vertices)
    scale = HEIGHT / top
    for obj in parts:
        obj.data.transform(Matrix.Scale(scale, 4))

    rig = build_armature(scale)
    for obj in parts:
        obj.parent = rig
        obj.modifiers.new("rig", "ARMATURE").object = rig
    # Baked in the neutral pose every idle passes through, which is what is
    # seen, not the A-pose.
    pose(rig, scale)
    bake_occlusion(parts, skip={"eyes", "glasses"})
    for name, (channels, seconds) in IDLES.items():
        animate(rig, name, seconds * FPS, 3, lambda t, c=channels: pose(rig, scale, **c(t)))
    clear_pose(rig)

    for obj in parts:
        print(f"{obj.name:14s} {triangles(obj):6d} tris")
    print(f"{'total':14s} {sum(triangles(o) for o in parts):6d} tris")
    export(rig, parts, "scout")


build_scout()

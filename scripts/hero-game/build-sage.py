"""Builds the old sage, the hero game's first character, as a skinned GLB.

Run headless:  blender -b --python scripts/hero-game/build-sage.py

A soft clay chibi, 0.9 tall on a one-unit board cell, feet at the origin and
facing -Y (+Z in glTF). Every part the scene may recolour from its palette is
its own named mesh with a plain material: skin, hair, eyes, cloak, tunic,
belt, gold, trousers, boots, staff_wood, staff_wrap and orb.

The parts that bend (cloak, sleeves, tunic, belt, trousers) are lathed quad
shells with edge loops at the joints and one level of subdivision. The rigid
parts (head, hands, hair, feet, staff) ride a single bone each, so their
meshes are free to be metaballs or decimated.

The rest pose is a relaxed A-pose. The armature carries one looping action,
`idle` (two seconds of breathing and sway), which brings the hands in and
holds the staff upright beside the right leg; the staff is skinned to the
right hand, so in the bare rest pose it hangs from that hand at an angle.

Weights are computed here, not by Blender's heat solver: each part lists the
bones it may follow, and within that set a vertex is shared between its
nearest bones by inverse distance. The beard can never follow an arm because
the beard only knows the head.
"""

import math
import os

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector, geometry, noise

OUT_DIR = os.path.join(os.path.dirname(__file__), "../../public/models/hero-game")

HEIGHT = 0.9
FPS = 24
HEAD = Vector((0, 0, 0.675))
HEAD_R = 0.15

# The A-pose arms: 45 degrees down from the shoulder.
ARM_DROP = math.radians(45)
UPPER_ARM, FOREARM, HAND_REACH = 0.1, 0.09, 0.035

# Where the idle pose puts the hands; the right one grips the staff.
IDLE_HAND_R = Vector((-0.25, -0.09, 0.35))
IDLE_HAND_L = Vector((0.225, -0.07, 0.29))
STAFF_AT = Vector((IDLE_HAND_R.x - 0.005, IDLE_HAND_R.y, 0))

COLOURS = {
    "skin": "#F2B49B",
    "hair": "#C9C6C3",
    "eyes": "#1B1716",
    "cloak": "#E2372B",
    "tunic": "#8A5A3B",
    "belt": "#4E3022",
    "gold": "#D9A441",
    "trousers": "#2E2C2B",
    "boots": "#4A2E22",
    "staff_wood": "#9A5B33",
    "staff_wrap": "#3E2A20",
    "orb": "#FFBB55",
}


def arm_points(side):
    """Shoulder, elbow, wrist and hand centre of one A-pose arm (side -1 is
    the sage's right, toward -X)."""
    shoulder = Vector((side * 0.16, 0, 0.48))
    down = Vector((side * math.cos(ARM_DROP), 0, -math.sin(ARM_DROP)))
    elbow = shoulder + down * UPPER_ARM
    wrist = elbow + down * FOREARM
    return shoulder, elbow, wrist, wrist + down * HAND_REACH


def skeleton():
    """name: (head, tail, parent), in modelling units; only `root` does not
    deform."""
    bones = {
        "root": ((0, 0, 0), (0, 0.12, 0), None),
        "hips": ((0, 0, 0.22), (0, 0, 0.3), "root"),
        "spine": ((0, 0, 0.3), (0, 0, 0.4), "hips"),
        "chest": ((0, 0, 0.4), (0, 0, 0.52), "spine"),
        "neck": ((0, 0, 0.52), (0, 0, 0.56), "chest"),
        "head": ((0, 0, 0.56), (0, 0, 0.84), "neck"),
    }
    for side, tag in ((1, "L"), (-1, "R")):
        shoulder, elbow, wrist, _ = arm_points(side)
        x = side * 0.075
        bones.update({
            f"shoulder.{tag}": ((side * 0.03, 0, 0.48), tuple(shoulder), "chest"),
            f"upper_arm.{tag}": (tuple(shoulder), tuple(elbow), f"shoulder.{tag}"),
            f"forearm.{tag}": (tuple(elbow), tuple(wrist), f"upper_arm.{tag}"),
            f"hand.{tag}": (tuple(wrist), tuple(wrist + (wrist - elbow).normalized() * 0.07), f"forearm.{tag}"),
            f"thigh.{tag}": ((x, 0, 0.24), (x, 0, 0.13), "hips"),
            f"shin.{tag}": ((x, 0, 0.13), (x, 0, 0.05), f"thigh.{tag}"),
            f"foot.{tag}": ((x, 0, 0.05), (x, -0.09, 0.02), f"shin.{tag}"),
        })
    return bones


BONES = skeleton()
BODY = ["hips", "spine", "chest", "neck"]
LEGS = ["thigh.L", "thigh.R"]


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


def lathe(name, rings, segments=20, gap=None, caps=(False, False)):
    """A quad shell swept round the Z axis through elliptical rings.

    Each ring is (z, rx, ry) or (z, rx, ry, dy), dy shifting it along Y; every
    ring is an edge loop, so rings are placed where the shell must bend. The
    angle runs from the front (-Y); with `gap`, a function of the ring's index
    giving a half-angle, the shell is left open down the front, as a cloak is.
    """
    mesh = bmesh.new()
    rows = []
    for i, ring in enumerate(rings):
        z, rx, ry = ring[:3]
        dy = ring[3] if len(ring) > 3 else 0
        if gap is None:
            angles = [2 * math.pi * k / segments for k in range(segments)]
        else:
            g = gap(i)
            angles = [g + (2 * math.pi - 2 * g) * k / segments for k in range(segments + 1)]
        rows.append([mesh.verts.new((rx * math.sin(a), -ry * math.cos(a) + dy, z)) for a in angles])
    span = len(rows[0]) if gap is None else len(rows[0]) - 1
    for low, high in zip(rows, rows[1:]):
        for k in range(span):
            k2 = (k + 1) % len(low)
            mesh.faces.new((low[k], low[k2], high[k2], high[k]))
    if gap is None:
        if caps[0]:
            mesh.faces.new(list(reversed(rows[0])))
        if caps[1]:
            mesh.faces.new(rows[-1])
    bmesh.ops.recalc_face_normals(mesh, faces=mesh.faces)
    data = bpy.data.meshes.new(name)
    mesh.to_mesh(data)
    mesh.free()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return obj


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


def blobs(name, elements, resolution=0.009, target=None):
    """Metaball clumps turned into one smooth mesh.

    Each element is (centre, half-extents) or (centre, half-extents, rotation).
    A lone ball's surface sits at 0.57 of its radius at this threshold, so the
    radius is scaled up to make the half-extents come out as given (before
    neighbours swell it).
    """
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
    """The point on the head's front at (x, z), pulled `inset` inward, and the
    rotation that points an object's +Z out of the face there."""
    dx, dz = x - HEAD.x, z - HEAD.z
    dy = -math.sqrt(max(HEAD_R**2 - dx * dx - dz * dz, 0))
    normal = Vector((dx, dy, dz)).normalized()
    point = HEAD + normal * (HEAD_R - inset)
    rotation = normal.to_track_quat("Z", "Y").to_euler()
    return point, rotation


def build_skin():
    head = sphere(HEAD, (HEAD_R * 1.04, HEAD_R, HEAD_R * 0.98), segments=22, rings=14)
    nose_at, _ = on_head(0, HEAD.z - 0.022, inset=0.012)
    nose = sphere(nose_at, (0.04, 0.036, 0.036), segments=12, rings=8)
    ears = [
        sphere(HEAD + Vector((s * 0.15, 0.01, -0.01)), (0.02, 0.03, 0.035), segments=8, rings=6)
        for s in (-1, 1)
    ]
    head = bind(join([head, nose] + ears, "face"), ["head"])
    hands = []
    for side, tag in ((-1, "R"), (1, "L")):
        _, _, wrist, centre = arm_points(side)
        mitten = sphere(centre, (0.038, 0.036, 0.04), segments=12, rings=8)
        # The thumb sits forward, as on a mitten.
        thumb = sphere(centre + Vector((-side * 0.012, -0.03, 0.01)), (0.016, 0.016, 0.02), segments=8, rings=6)
        hands.append(bind(join([mitten, thumb], f"hand_{tag}"), [f"hand.{tag}"]))
    return join([head] + hands, "skin")


def build_eyes():
    """Glossy dark ovals, each with a small white glint: the one part with two
    materials."""
    dark = material("eyes", roughness=0.15)
    glint = bpy.data.materials.new("eyes_glint")
    bsdf = glint.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bsdf.inputs["Emission Color"].default_value = (1, 1, 1, 1)
    bsdf.inputs["Emission Strength"].default_value = 0.6
    parts = []
    for side in (-1, 1):
        # Pointed along the face normal, an oval's local Y runs up the face.
        point, rotation = on_head(side * 0.056, HEAD.z + 0.02, inset=0.01)
        eye = sphere(point, (0.025, 0.033, 0.014), segments=10, rings=7, rotation=rotation)
        eye.data.materials.append(dark)
        spark_at, spark_rot = on_head(side * 0.056 + 0.009, HEAD.z + 0.034, inset=-0.003)
        spark = sphere(spark_at, (0.007, 0.007, 0.004), segments=8, rings=4, rotation=spark_rot)
        spark.data.materials.append(glint)
        parts += [eye, spark]
    return bind(join(parts, "eyes"), ["head"])


def lock(centre, half, angle, tilt, roll=0.0, segments=10, rings=6):
    """One clump of hair, its broad side facing out from the head at `angle`
    (from the front), its tip flicked outward by `tilt` and swung by `roll`."""
    return sphere(centre, half, segments=segments, rings=rings, rotation=(-tilt, roll, angle))


def around_head(angle, radius, dz):
    return HEAD + Vector((radius * math.sin(angle), -radius * math.cos(angle), dz))


def build_hair():
    h = HEAD
    # The cap sits back and up from the head, so the hairline falls where the
    # two surfaces cross and the face is left bare.
    parts = [sphere(h + Vector((0, 0.03, 0.022)), (0.163, 0.16, 0.148), segments=26, rings=16)]
    # Long locks round the back in two staggered rows, ending on the shoulders.
    # A little noise in each one's size, height and swing keeps the rows from
    # reading as a comb.
    upper = 9
    for k in range(upper):
        a = math.radians(80 + k * 200 / (upper - 1))
        n = noise.noise(Vector((k * 1.3, 0.5, 0.2)))
        parts.append(
            lock(around_head(a, 0.13, -0.05 + n * 0.012), (0.056 + n * 0.006, 0.05, 0.1), a, 0.12, n * 0.4)
        )
    lower = 7
    for k in range(lower):
        a = math.radians(98 + k * 164 / (lower - 1))
        n = noise.noise(Vector((k * 1.7, 2.5, 0.9)))
        parts.append(
            lock(around_head(a, 0.128, -0.165 + n * 0.02), (0.062, 0.05, 0.068 + n * 0.01), a, 0.45, n * 0.6)
        )
    # Already low; only the metaball parts are thinned out.
    locks = join(parts, "locks")

    beard = blobs(
        "mb_beard",
        [
            (h + Vector((-0.118, -0.05, -0.065)), (0.038, 0.05, 0.065)),
            (h + Vector((0.118, -0.05, -0.065)), (0.038, 0.05, 0.065)),
            (h + Vector((0, -0.1, -0.125)), (0.11, 0.075, 0.075)),
            (h + Vector((-0.06, -0.12, -0.18)), (0.065, 0.06, 0.075)),
            (h + Vector((0.06, -0.12, -0.18)), (0.065, 0.06, 0.075)),
            (h + Vector((0, -0.14, -0.235)), (0.06, 0.05, 0.065)),
        ],
        target=1000,
    )
    moustache = blobs(
        "mb_stache",
        [
            (h + Vector((s * 0.042, -0.15, -0.07)), (0.046, 0.026, 0.021), (0, s * 0.3, 0))
            for s in (-1, 1)
        ]
        + [(h + Vector((s * 0.082, -0.13, -0.09)), (0.026, 0.02, 0.022)) for s in (-1, 1)],
        resolution=0.006,
        target=500,
    )
    brows = []
    for side in (-1, 1):
        point, _ = on_head(side * 0.056, HEAD.z + 0.068, inset=0.002)
        # Sloping down at the outer end: kindly, not stern.
        brows.append((tuple(point), (0.038, 0.018, 0.017), (0, side * 0.15, 0)))
    brow = blobs("mb_brows", brows, resolution=0.005, target=300)
    return bind(join([locks, beard, moustache, brow], "hair"), ["head"])


def build_tunic():
    tunic = lathe(
        "tunic",
        [
            (0.17, 0.125, 0.11),
            (0.19, 0.15, 0.13),
            (0.24, 0.155, 0.135),
            (0.3, 0.155, 0.135),
            (0.36, 0.155, 0.133),
            (0.43, 0.15, 0.125),
            (0.49, 0.13, 0.11),
            (0.53, 0.08, 0.07),
            (0.55, 0.05, 0.05),
        ],
        segments=12,
        # The hem is open: nothing sees up the tunic.
        caps=(False, True),
    )
    subdivide(tunic)
    bind(tunic, BODY + LEGS)
    cuffs = []
    for side, tag in ((-1, "R"), (1, "L")):
        shoulder, _, wrist, _ = arm_points(side)
        end = (wrist - shoulder).length
        cuff = lathe(
            "cuff",
            [
                (end - 0.032, 0.062, 0.062),
                (end - 0.026, 0.073, 0.073),
                (end + 0.002, 0.073, 0.073),
                (end + 0.008, 0.06, 0.06),
                (end + 0.008, 0.045, 0.045),
            ],
            segments=10,
            caps=(True, True),
        )
        cuff.data.transform(along(shoulder, wrist))
        subdivide(cuff)
        cuffs.append(bind(cuff, [f"forearm.{tag}"]))
    return join([tunic] + cuffs, "tunic")


def build_cloak():
    # Open down the front: narrow at the collar, wider at the hem. Loops at
    # the shoulders, the chest and the hips, where it is pulled.
    rings = [
        (0.56, 0.085, 0.075, 0.01),
        (0.53, 0.14, 0.12, 0.01),
        (0.49, 0.175, 0.145, 0.01),
        (0.42, 0.185, 0.155, 0.01),
        (0.33, 0.197, 0.167, 0.01),
        (0.24, 0.212, 0.18, 0.01),
        (0.16, 0.232, 0.196, 0.01),
        (0.1, 0.255, 0.215, 0.01),
        (0.09, 0.25, 0.21, 0.01),
    ]
    gaps = [0.5, 0.55, 0.6, 0.65, 0.72, 0.8, 0.88, 0.95, 0.95]
    cloak = lathe("cloak", rings, segments=18, gap=lambda i: gaps[i])
    solidify = cloak.modifiers.new("cloth", "SOLIDIFY")
    solidify.thickness = 0.014
    solidify.offset = 1
    apply_modifiers(cloak)
    subdivide(cloak)
    bind(cloak, BODY + LEGS + ["shoulder.L", "shoulder.R"])

    sleeves = []
    for side, tag in ((-1, "R"), (1, "L")):
        shoulder, elbow, wrist, _ = arm_points(side)
        length = (wrist - shoulder).length
        mid = UPPER_ARM
        sleeve = lathe(
            "sleeve",
            [
                (-0.03, 0.03, 0.03),
                (-0.01, 0.052, 0.052),
                (mid - 0.02, 0.056, 0.056),
                (mid, 0.057, 0.057),
                (mid + 0.02, 0.059, 0.059),
                (length - 0.01, 0.066, 0.066),
                (length - 0.005, 0.05, 0.05),
            ],
            segments=10,
            caps=(True, True),
        )
        sleeve.data.transform(along(shoulder, wrist))
        subdivide(sleeve)
        sleeves.append(bind(sleeve, [f"shoulder.{tag}", f"upper_arm.{tag}", f"forearm.{tag}"], keep=2))

    # The hood, down: a soft roll round the neck and a gathered fold hanging
    # behind it, both under the hair.
    bpy.ops.mesh.primitive_torus_add(major_segments=16, minor_segments=6, major_radius=0.1, minor_radius=0.038)
    roll = bpy.context.active_object
    roll.data.transform(Matrix.LocRotScale((0, 0.035, 0.535), Euler((-0.25, 0, 0)), (1, 0.95, 1)))
    fold = sphere((0, 0.16, 0.46), (0.11, 0.05, 0.08), segments=12, rings=7)
    hood = bind(join([roll, fold], "hood"), ["chest"])
    return join([cloak, hood] + sleeves, "cloak")


def build_belt():
    belt = lathe(
        "belt",
        [
            (0.29, 0.158, 0.138),
            (0.3, 0.166, 0.146),
            (0.33, 0.166, 0.146),
            (0.34, 0.158, 0.138),
        ],
        segments=16,
    )
    subdivide(belt)
    return bind(belt, ["hips", "spine"])


def build_gold():
    bpy.ops.mesh.primitive_cube_add(size=1)
    buckle = bpy.context.active_object
    buckle.data.transform(Matrix.LocRotScale((0, -0.15, 0.315), None, (0.045, 0.02, 0.04)))
    bevel = buckle.modifiers.new("bevel", "BEVEL")
    bevel.width = 0.008
    bevel.segments = 2
    apply_modifiers(buckle)
    parts = [bind(buckle, ["hips", "spine"])]
    for side in (-1, 1):
        bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=0.022, depth=0.012)
        clasp = bpy.context.active_object
        clasp.data.transform(
            Matrix.LocRotScale((side * 0.135, -0.1, 0.48), Euler((math.pi / 2 - 0.3, 0, side * 0.6)), None)
        )
        bevel = clasp.modifiers.new("bevel", "BEVEL")
        bevel.width = 0.004
        bevel.segments = 2
        apply_modifiers(clasp)
        parts.append(bind(clasp, ["chest"]))
    return join(parts, "gold")


def build_legs():
    legs, parts = [], []
    for side, tag in ((1, "L"), (-1, "R")):
        x = side * 0.075
        leg = lathe(
            "leg",
            [(0.06, 0.04, 0.04), (0.1, 0.043, 0.043), (0.13, 0.045, 0.045), (0.16, 0.046, 0.046), (0.25, 0.05, 0.05)],
            segments=8,
            caps=(True, True),
        )
        leg.data.transform(Matrix.Translation((x, 0, 0)))
        subdivide(leg)
        legs.append(bind(leg, ["hips", f"thigh.{tag}", f"shin.{tag}"], keep=2))

        foot = sphere((x, -0.03, 0.03), (0.058, 0.085, 0.05), segments=12, rings=7)
        # A flat sole: everything below the ground is pressed onto it.
        for v in foot.data.vertices:
            v.co.z = max(v.co.z, 0.0)
        shaft = lathe(
            "shaft",
            [(0.0, 0.05, 0.05), (0.06, 0.05, 0.05), (0.1, 0.048, 0.048), (0.11, 0.04, 0.04)],
            segments=10,
            caps=(True, True),
        )
        shaft.data.transform(Matrix.Translation((x, 0, 0)))
        bpy.ops.mesh.primitive_torus_add(
            major_segments=12, minor_segments=6, major_radius=0.05, minor_radius=0.02, location=(x, 0, 0.11)
        )
        cuff = bpy.context.active_object
        bpy.ops.object.transform_apply(location=True)
        parts += [bind(foot, [f"foot.{tag}"]), bind(join([shaft, cuff], "shaft"), [f"shin.{tag}"])]
    return join(legs, "trousers"), join(parts, "boots")


def build_staff():
    """A crooked shaft rising to a spiral that curls outward and back round the
    orb. Built standing in the idle pose's right hand, which it is moved into
    the rest pose's hand from once the rig exists."""
    height = 1.035
    radius = 0.02
    curl = 0.07
    centre_z = height - curl - radius
    points = []
    for i in range(12):
        t = i / 11
        z = t * centre_z
        wobble = noise.noise(Vector((t * 3, 1.7, 0.3))) * 0.008
        points.append((Vector((wobble, wobble * 0.6, z)), 0.8 + 0.15 * t))
    centre = Vector((-curl, 0, centre_z))
    for i in range(1, 30):
        t = i / 29
        angle = t * math.radians(300)
        r = curl * (1 - 0.3 * t)
        points.append((centre + Vector((r * math.cos(angle), 0, r * math.sin(angle))), 0.95 - 0.35 * t))

    curve = bpy.data.curves.new("staff", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    curve.use_fill_caps = True
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, (co, r) in zip(spline.points, points):
        point.co = (*co, 1)
        point.radius = r
    wood = bpy.data.objects.new("staff_wood", curve)
    bpy.context.collection.objects.link(wood)
    activate(wood)
    bpy.ops.object.convert(target="MESH")
    wood = bpy.context.active_object
    # A knotted, hand-cut look: a slow noise pushes the surface in and out.
    for v in wood.data.vertices:
        v.co += noise.noise_vector(v.co * 18) * 0.003

    wrap_z = centre_z - 0.12
    wrap = lathe(
        "staff_wrap",
        [
            (wrap_z - 0.035, 0.022, 0.022),
            (wrap_z - 0.03, 0.026, 0.026),
            (wrap_z - 0.012, 0.025, 0.025),
            (wrap_z, 0.027, 0.027),
            (wrap_z + 0.012, 0.025, 0.025),
            (wrap_z + 0.03, 0.026, 0.026),
            (wrap_z + 0.035, 0.022, 0.022),
        ],
        segments=12,
        caps=(True, True),
    )
    wrap.data.transform(Matrix.Translation((points[9][0].x, points[9][0].y, 0)))

    orb = sphere(centre + Vector((0, 0, -0.004)), (0.043, 0.043, 0.043), segments=16, rings=10)
    placement = Matrix.Translation(STAFF_AT) @ Matrix.Rotation(-0.35, 4, "Z")
    for obj in (wood, wrap, orb):
        obj.data.transform(placement)
        bind(obj, ["hand.R"])
    return wood, wrap, orb


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
    rig = bpy.data.objects.new("sage", data)
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
            bone.use_connect = Vector(BONES[parent][1]) == Vector(head)
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


def reach(rig, tag, target, pole):
    """Two-bone IK by hand: bends the arm so the hand's centre lands on
    `target`, the elbow swinging toward `pole`."""
    bones = rig.pose.bones
    shoulder = bones[f"upper_arm.{tag}"].head.copy()
    a = bones[f"upper_arm.{tag}"].length
    b = bones[f"forearm.{tag}"].length + bones[f"hand.{tag}"].length / 2
    offset = target - shoulder
    c = min(offset.length, (a + b) * 0.999)
    u = offset.normalized()
    w = (pole - pole.dot(u) * u).normalized()
    angle = math.acos(max(-1, min(1, (a * a + c * c - b * b) / (2 * a * c))))
    elbow = shoulder + a * (math.cos(angle) * u + math.sin(angle) * w)
    aim(bones[f"upper_arm.{tag}"], shoulder, elbow - shoulder)
    aim(bones[f"forearm.{tag}"], elbow, target - elbow)
    aim(bones[f"hand.{tag}"], bones[f"forearm.{tag}"].tail.copy(), target - elbow)


def idle_pose(rig, t, scale):
    """The idle at phase t (0..1): a breath through the chest, a slow sway
    and nod, the right hand held on the staff and the left drifting."""
    wave = math.sin(2 * math.pi * t)
    bones = rig.pose.bones
    for bone in bones:
        bone.rotation_quaternion = (1, 0, 0, 0)
        bone.location = (0, 0, 0)
    bones["spine"].rotation_quaternion = Euler((0, 0.025 * wave, 0)).to_quaternion()
    bones["chest"].rotation_quaternion = Euler((-0.03 * wave, 0, 0)).to_quaternion()
    bones["head"].rotation_quaternion = Euler((0.04 * math.cos(2 * math.pi * t), -0.02 * wave, 0)).to_quaternion()
    bones["shoulder.L"].rotation_quaternion = Euler((0, 0, 0.03 * wave)).to_quaternion()
    bones["shoulder.R"].rotation_quaternion = Euler((0, 0, -0.03 * wave)).to_quaternion()
    bpy.context.view_layer.update()
    reach(rig, "R", IDLE_HAND_R * scale, Vector((-1, 0.6, 0)))
    reach(rig, "L", (IDLE_HAND_L + Vector((0, -0.006 * wave, 0.004 * wave))) * scale, Vector((1, 0.6, 0)))


def animate_idle(rig, scale, keys=5):
    """Keys the loop over two seconds; the last key repeats the first."""
    rig.animation_data_create()
    frames = 2 * FPS
    for k in range(keys):
        t = k / (keys - 1)
        idle_pose(rig, t % 1, scale)
        for bone in rig.pose.bones:
            bone.keyframe_insert("rotation_quaternion", frame=1 + t * frames)
            bone.keyframe_insert("location", frame=1 + t * frames)
    action = rig.animation_data.action
    action.name = "idle"
    scene = bpy.context.scene
    scene.frame_start, scene.frame_end = 1, 1 + frames


def stage_staff(rig, staff, scale):
    """The staff is modelled in the idle grip; skinned to the right hand, it
    must sit where that hand is at rest, so it is carried back by the inverse
    of the hand's idle move."""
    idle_pose(rig, 0, scale)
    hand = rig.pose.bones["hand.R"]
    back = hand.bone.matrix_local @ hand.matrix.inverted()
    for obj in staff:
        obj.data.transform(back)
    for bone in rig.pose.bones:
        bone.rotation_quaternion = (1, 0, 0, 0)
        bone.location = (0, 0, 0)
    bpy.context.view_layer.update()


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
        export_image_format="JPEG",
        export_jpeg_quality=85,
        export_skins=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_def_bones=False,
    )


def build_sage():
    reset()
    trousers, boots = build_legs()
    parts = [
        finish(build_skin(), "skin", roughness=0.7),
        finish(build_hair(), "hair", roughness=0.85),
        finish(build_eyes(), "eyes"),
        finish(build_cloak(), "cloak", roughness=0.9),
        finish(build_tunic(), "tunic", roughness=0.9),
        finish(build_belt(), "belt", roughness=0.75),
        finish(build_gold(), "gold", roughness=0.35),
        finish(trousers, "trousers", roughness=0.9),
        finish(boots, "boots", roughness=0.75),
    ]
    wood, wrap, orb = build_staff()
    staff = [
        finish(wood, "staff_wood", roughness=0.8),
        finish(wrap, "staff_wrap", roughness=0.85),
        finish(orb, "orb", roughness=0.3, emission=3.0),
    ]
    parts += staff

    # Modelled by eye, then sized so the sage stands exactly HEIGHT tall.
    top = max(v.co.z for obj in parts if obj not in staff for v in obj.data.vertices)
    scale = HEIGHT / top
    for obj in parts:
        obj.data.transform(Matrix.Scale(scale, 4))

    rig = build_armature(scale)
    stage_staff(rig, staff, scale)
    for obj in parts:
        obj.parent = rig
        obj.modifiers.new("rig", "ARMATURE").object = rig
    animate_idle(rig, scale)

    for obj in parts:
        print(f"{obj.name:12s} {triangles(obj):6d} tris")
    print(f"{'total':12s} {sum(triangles(o) for o in parts):6d} tris")
    export(rig, parts, "sage")


build_sage()

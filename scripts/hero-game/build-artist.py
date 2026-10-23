"""Builds the artist, the hero game's fourth character, as a skinned GLB.

Run headless:  blender -b --python scripts/hero-game/build-artist.py

A soft clay chibi like the sage and the programmer, 0.85 tall with her beret,
feet at the origin and facing -Y (+Z in glTF): a red beret pulled over to her
right, long wavy dark-brown hair to the shoulders, an off-white T-shirt under
charcoal dungarees with rolled cuffs, chunky black boots, and a paintbrush in
her right hand. Every part the scene may recolour is its own named mesh: skin,
hair, eyes, beret, shirt, dungarees, buttons, boots, brush_handle,
brush_ferrule and brush_bristles.

The parts that bend (shirt, sleeves, bare arms, dungarees) are lathed quad
shells with edge loops at the joints and one level of subdivision; the rigid
parts ride a single bone each. Weights are computed here, as for the others:
each part lists the bones it may follow and a vertex is shared between its
nearest ones by inverse distance. Beside the usual skeleton there is one
small bone under the head, `hair`, which the lower hair follows so it can lag
and bounce.

The rest pose is a relaxed A-pose. The armature carries three looping idles,
`idle_breathe` (6 s), `idle_paint` (4 s) and `idle_beret` (4 s), which all
start and end on one neutral pose, and a two-step `walk` (0.83 s). In
`idle_beret` the free hand tucks her hair behind the ear: the beret itself
sits above a chibi arm's reach. All of them
are in place: the scene moves her between cells. The brush is skinned to the
right hand and modelled in the neutral pose's grip, so in the bare rest pose
it hangs from that hand.
"""

import math
import os

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector, geometry, noise

OUT_DIR = os.path.join(os.path.dirname(__file__), "../../public/models/hero-game")

HEIGHT = 0.85
FPS = 24
HEAD = Vector((0, 0, 0.68))
HEAD_R = 0.15
HEAD_SCALE = (1.1, 1.0, 0.96)

ARM_DROP = math.radians(45)
SHOULDER_Z = 0.47
UPPER_ARM, FOREARM, HAND_REACH = 0.11, 0.095, 0.036
LEG_X = 0.066

# Where the neutral pose puts the hands: both hang loose, the right one
# holding the brush forward and a little down, like a pencil.
IDLE_HAND_R = Vector((-0.195, -0.02, 0.245))
IDLE_HAND_L = Vector((0.192, -0.012, 0.248))
BRUSH_DIR = Vector((-0.12, -0.84, -0.5)).normalized()
BRUSH_LENGTH = 0.235
BRUSH_GRIP = 0.12
# The brush is drawn at 1.3x along and 1.4x across its profile below.
BRUSH_SCALE = Matrix.Diagonal((1.4, 1.4, 1.3, 1))
# The brush lifted to paint: forward and up, a little inward.
PAINT_WRIST = Vector((-0.15, -0.19, 0.5))
PAINT_DIR = Vector((-0.3, -0.55, 0.78)).normalized()

# The hair's cap, which the beret's band hugs.
CAP_AT = HEAD + Vector((0, 0.022, 0.018))
CAP = (HEAD_R * HEAD_SCALE[0] * 1.05, HEAD_R * 1.08, HEAD_R * HEAD_SCALE[2] * 1.06)
# The beret: pulled down over her right ear and tipped back.
BERET = Matrix.LocRotScale(HEAD + Vector((-0.02, 0.012, 0.085)), Euler((-0.22, -0.3, 0)), None)
BERET_SHIFT = -0.018

COLOURS = {
    "skin": "#F2B49B",
    "cheeks": "#EE8F86",
    "hair": "#4A2B1C",
    "eyes": "#1B1716",
    "beret": "#E2372B",
    "shirt": "#F1ECE2",
    "dungarees": "#2E2C2B",
    "buttons": "#76756F",
    "boots": "#1E1D1C",
    "brush_handle": "#7A4428",
    "brush_ferrule": "#B9B7B3",
    "brush_bristles": "#F1E6CF",
    "brush_tip": "#E2372B",
}


def arm_points(side):
    """Shoulder, elbow, wrist and hand centre of one A-pose arm (side -1 is
    her right, toward -X)."""
    shoulder = Vector((side * 0.108, 0, SHOULDER_Z))
    down = Vector((side * math.cos(ARM_DROP), 0, -math.sin(ARM_DROP)))
    elbow = shoulder + down * UPPER_ARM
    wrist = elbow + down * FOREARM
    return shoulder, elbow, wrist, wrist + down * HAND_REACH


def skeleton():
    """name: (head, tail, parent), in modelling units; only `root` does not
    deform."""
    bones = {
        "root": ((0, 0, 0), (0, 0.12, 0), None),
        "hips": ((0, 0, 0.26), (0, 0, 0.33), "root"),
        "spine": ((0, 0, 0.33), (0, 0, 0.42), "hips"),
        "chest": ((0, 0, 0.42), (0, 0, 0.52), "spine"),
        "neck": ((0, 0, 0.52), (0, 0, 0.56), "chest"),
        "head": ((0, 0, 0.56), (0, 0, 0.84), "neck"),
        "hair": ((0, 0.06, HEAD.z), (0, 0.1, HEAD.z - 0.18), "head"),
    }
    for side, tag in ((1, "L"), (-1, "R")):
        shoulder, elbow, wrist, _ = arm_points(side)
        x = side * LEG_X
        bones.update({
            f"shoulder.{tag}": ((side * 0.03, 0, SHOULDER_Z), tuple(shoulder), "chest"),
            f"upper_arm.{tag}": (tuple(shoulder), tuple(elbow), f"shoulder.{tag}"),
            f"forearm.{tag}": (tuple(elbow), tuple(wrist), f"upper_arm.{tag}"),
            f"hand.{tag}": (tuple(wrist), tuple(wrist + (wrist - elbow).normalized() * 0.072), f"forearm.{tag}"),
            f"thigh.{tag}": ((x, 0, 0.28), (x, 0, 0.17), "hips"),
            f"shin.{tag}": ((x, 0, 0.17), (x, 0, 0.06), f"thigh.{tag}"),
            f"foot.{tag}": ((x, 0, 0.06), (x, -0.09, 0.02), f"shin.{tag}"),
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


def build_skin():
    head = sphere(HEAD, tuple(HEAD_R * s for s in HEAD_SCALE), segments=22, rings=14)
    nose_at, _ = on_head(0, HEAD.z - 0.028, inset=0.008)
    nose = sphere(nose_at, (0.016, 0.014, 0.012), segments=8, rings=6)
    ears = [
        sphere(HEAD + Vector((s * 0.163, 0.012, -0.012)), (0.018, 0.016, 0.026), segments=8, rings=6, rotation=(0, 0, s * 0.3))
        for s in (-1, 1)
    ]
    neck = lathe("neck", [(0.5, 0.04, 0.04), (0.6, 0.04, 0.04)], segments=10)
    head = bind(join([head, nose] + ears, "face"), ["head"])
    neck = bind(neck, ["neck", "head"], keep=2)
    limbs = []
    for side, tag in ((-1, "R"), (1, "L")):
        shoulder, _, wrist, centre = arm_points(side)
        axis = (wrist - shoulder).normalized()
        length = UPPER_ARM + FOREARM
        arm = lathe(
            "arm",
            [
                (-0.01, 0.022, 0.022),
                (0.01, 0.03, 0.03),
                (0.05, 0.03, 0.03),
                (UPPER_ARM - 0.02, 0.028, 0.028),
                (UPPER_ARM, 0.027, 0.027),
                (UPPER_ARM + 0.02, 0.026, 0.026),
                (length - 0.022, 0.023, 0.023),
                (length + 0.004, 0.02, 0.02),
            ],
            segments=8,
            caps=(True, True),
        )
        arm.data.transform(along(shoulder, wrist))
        subdivide(arm)
        limbs.append(bind(arm, [f"upper_arm.{tag}", f"forearm.{tag}"], keep=2))
        palm = sphere(Vector(), (0.032, 0.028, 0.04), segments=12, rings=8)
        thumb = sphere(Vector((-0.004, -0.026, 0.004)), (0.013, 0.013, 0.021), segments=8, rings=6, rotation=(0.3, 0, 0))
        hand = join([palm, thumb], f"hand_{tag}")
        hand.data.transform(along(centre, centre + axis))
        limbs.append(bind(hand, [f"hand.{tag}"]))
    return join([head, neck] + limbs, "skin")


def build_eyes():
    """Glossy dark eyes with a white glint, the smile and the rosy cheeks:
    the one part with several materials."""
    dark = material("eyes", roughness=0.2)
    glint = bpy.data.materials.new("eyes_glint")
    bsdf = glint.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bsdf.inputs["Emission Color"].default_value = (1, 1, 1, 1)
    bsdf.inputs["Emission Strength"].default_value = 0.6
    blush = material("cheeks", roughness=0.8)
    parts = []
    for side in (-1, 1):
        point, rotation = on_head(side * 0.058, HEAD.z + 0.0, inset=0.006)
        eye = sphere(point, (0.024, 0.029, 0.011), segments=12, rings=7, rotation=rotation)
        eye.data.materials.append(dark)
        spark_at, spark_rot = on_head(side * 0.058 + 0.009, HEAD.z + 0.013, inset=-0.004)
        spark = sphere(spark_at, (0.0068, 0.0068, 0.003), segments=8, rings=4, rotation=spark_rot)
        spark.data.materials.append(glint)
        cheek_at, cheek_rot = on_head(side * 0.092, HEAD.z - 0.045, inset=0.003)
        cheek = sphere(cheek_at, (0.024, 0.017, 0.004), segments=10, rings=5, rotation=cheek_rot)
        cheek.data.materials.append(blush)
        parts += [eye, spark, cheek]
    points, normals = [], []
    for i in range(9):
        t = i / 8 - 0.5
        point, _ = on_head(t * 0.038, HEAD.z - 0.062 - 0.011 * (1 - 4 * t * t), inset=-0.001)
        points.append(point)
        normals.append((point - HEAD).normalized())
    smile = sweep("smile", points, normals, 0.0065, 0.004, segments=6)
    smile.data.materials.append(dark)
    parts.append(smile)
    return bind(join(parts, "eyes"), ["head"])


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


def build_hair():
    """A cap under the beret, a side-swept fringe, and long wavy hair to the
    shoulders, fullest at the back: metaball waves in staggered rows, their
    ends curling out in pointed locks."""
    h = HEAD
    cap = sphere(CAP_AT, CAP, segments=18, rings=10)

    def lock(az, el, out, length, width, curl=0.3, flat=0.55, spin=0.0, seed=0, radius=1.0):
        n = noise.noise(Vector((seed * 1.37, 0.4, 0.9)))
        root = head_point(az, el, radius)
        normal = (root - h).normalized()
        tangent_down = Vector((0, 0, -1)) - Vector((0, 0, -1)).dot(normal) * normal
        direction = (tangent_down.normalized() * (1 - out) + normal * out).normalized()
        direction = Matrix.Rotation(spin + n * 0.25, 3, normal) @ direction
        return tuft(root, direction, length * (1 + n * 0.12), width, curl, flat, up=normal)

    locks = []
    # The fringe, parted on her left and swept across the forehead to her
    # right, short enough to leave the brows showing.
    for k, az in enumerate((0.72, 0.48, 0.24, 0.0, -0.24, -0.48, -0.72)):
        sweep_ = -0.75 + 0.25 * (az < -0.3)
        locks.append(lock(az, 1.02, 0.05, 0.085 + 0.012 * (az < 0), 0.044, curl=-0.1, flat=0.45, spin=sweep_, seed=k, radius=1.05))
    # Locks framing the face over the temples, down to the cheeks in front
    # of the ears.
    for side in (-1, 1):
        for k, el in enumerate((0.75, 0.4)):
            locks.append(lock(side * 1.22, el, 0.05, 0.1, 0.04, curl=0.3, spin=side * 0.15, seed=20 + k + side * 3, radius=1.04))

    # The long hair: columns of overlapping blobs round the sides and back,
    # each column waving in and out as it falls.
    elements = []
    columns = 12
    for k in range(columns):
        az = math.radians(80 + k * 200 / (columns - 1))
        back = max(-math.cos(az), 0)
        n = noise.noise(Vector((k * 1.31, 0.7, 0.3)))
        bottom = -0.15 - 0.045 * back + 0.01 * n
        steps = 4
        for j in range(steps):
            s = j / (steps - 1)
            dz = bottom * s
            # Each column bulges in and out as it falls: the waves.
            wave = 0.024 * math.sin(math.pi * 3 * s + k * 1.9) * s + 0.01 * (k % 2) * s
            r = 0.148 + 0.02 * s * s + 0.004 * back + wave
            centre = h + Vector((r * math.sin(az) * 1.04, -r * math.cos(az) + 0.012, dz))
            elements.append((centre, (0.046, 0.036, 0.048), (0, 0, az)))
        # A round curl at the end, turned out and up.
        r = 0.175 + 0.004 * back
        centre = h + Vector((r * math.sin(az) * 1.04, -r * math.cos(az) + 0.012, bottom - 0.018))
        elements.append((centre, (0.042, 0.034, 0.034), (0, 0, az)))
    mass = blobs("mb_hair", elements, resolution=0.0105, target=1800)
    ends = []

    brows = []
    for side in (-1, 1):
        point, _ = on_head(side * 0.058, HEAD.z + 0.052, inset=-0.004)
        brows.append((tuple(point), (0.024, 0.008, 0.008), (0, -side * 0.15, 0)))
    brow = blobs("mb_brows", brows, resolution=0.004, target=200)
    hair = join([cap, mass, brow] + locks + ends, "hair")
    return bind_hair(hair)


def bind_hair(obj):
    """The crown and fringe ride the head; going down the back and sides the
    hair hands over to the `hair` bone, which lets it lag and bounce."""
    head = obj.vertex_groups.new(name="head")
    lower = obj.vertex_groups.new(name="hair")
    for v in obj.data.vertices:
        w = ease(-(v.co.z - HEAD.z), 0.0, 0.17) * ease(v.co.y, -0.06, 0.02)
        head.add([v.index], 1 - w, "REPLACE")
        if w > 0.01:
            lower.add([v.index], w, "REPLACE")
    return obj


def hug(centre, direction):
    """How far from `centre` along `direction` the hair cap's surface lies."""
    c = Vector(((centre - CAP_AT)[i] / CAP[i] for i in range(3)))
    d = Vector((direction[i] / CAP[i] for i in range(3)))
    a, b, cc = d.dot(d), 2 * c.dot(d), c.dot(c) - 1
    return (-b + math.sqrt(b * b - 4 * a * cc)) / (2 * a)


def build_beret():
    """A puffed red disc: its band hugs the hair cap all round, the crown
    swells out past it, fuller over her right; a small stalk on top."""
    segments = 22
    rotation = BERET.to_3x3()
    centre = BERET.translation
    profile = [
        (0.0, 0.003, 0.0),
        (0.012, 0.01, 0.0),
        (0.03, 0.205, 1.0),
        (0.05, 0.222, 1.0),
        (0.068, 0.21, 1.0),
        (0.084, 0.175, 0.9),
        (0.096, 0.125, 0.7),
        (0.103, 0.065, 0.4),
        (0.105, 0.0, 0.0),
    ]
    mesh = bmesh.new()
    rows = []
    for h, r, shift in profile:
        row = []
        for k in range(segments):
            a = 2 * math.pi * k / segments
            local = Vector((math.sin(a), -math.cos(a), 0))
            if shift == 0.0 and r < 0.05 and h < 0.02:
                # The band: on the cap, a hair proud of it.
                world_dir = rotation @ local
                dist = hug(centre, world_dir) + r
                point = local * dist + Vector((0, 0, h))
            else:
                point = Vector((local.x * r + BERET_SHIFT * shift, local.y * r * 0.96, h))
            row.append(mesh.verts.new(point))
        rows.append(row)
    for low, high in zip(rows, rows[1:]):
        for k in range(segments):
            k2 = (k + 1) % segments
            mesh.faces.new((low[k], low[k2], high[k2], high[k]))
    beret = mesh_object("beret", mesh)
    bmesh_merge(beret)
    subdivide(beret)
    stalk = cylinder(Vector((0, 0, 0.096)), Vector((0, 0, 0.124)), 0.01, vertices=8)
    knob = sphere(Vector((0, 0, 0.126)), (0.016, 0.016, 0.013), segments=10, rings=6)
    beret = join([beret, stalk, knob], "beret")
    beret.data.transform(BERET)
    return bind(beret, ["head"])


def bmesh_merge(obj):
    """Welds the top ring of a lathe, which all sits on the axis."""
    mesh = bmesh.new()
    mesh.from_mesh(obj.data)
    bmesh.ops.remove_doubles(mesh, verts=mesh.verts, dist=1e-5)
    mesh.to_mesh(obj.data)
    mesh.free()


# The shirt's body: (z, rx, ry, dy), tucked in at the bottom, to the neck.
SHIRT = [
    (0.27, 0.112, 0.096, 0.005),
    (0.33, 0.12, 0.103, 0.005),
    (0.39, 0.124, 0.106, 0.005),
    (0.44, 0.126, 0.107, 0.005),
    (0.475, 0.117, 0.099, 0.008),
    (0.505, 0.088, 0.078, 0.01),
    (0.527, 0.054, 0.052, 0.01),
    (0.532, 0.046, 0.045, 0.01),
]

# The dungarees round the hips, up to the waistband.
SEAT = [
    (0.2, 0.09, 0.07, 0.01),
    (0.225, 0.122, 0.104, 0.012),
    (0.26, 0.132, 0.114, 0.012),
    (0.3, 0.134, 0.116, 0.01),
    (0.322, 0.132, 0.114, 0.008),
    (0.326, 0.137, 0.118, 0.008),
    (0.348, 0.136, 0.117, 0.008),
    (0.352, 0.126, 0.108, 0.008),
]


def surface(rings, z, angle):
    """The point on a lathed body at height z and angle from the front."""
    for low, high in zip(rings, rings[1:]):
        if low[0] <= z <= high[0]:
            t = (z - low[0]) / (high[0] - low[0])
            rx, ry, dy = (low[i] + (high[i] - low[i]) * t for i in (1, 2, 3))
            return Vector((rx * math.sin(angle), -ry * math.cos(angle) + dy, z))
    raise ValueError(z)


def outward(point):
    return Vector((point.x, point.y - 0.006, 0)).normalized()


def patch(name, rings, z_low, z_high, half_low, half_high, lift, thickness=0.004, centre=0.0, columns=8, rows=4):
    """A panel lying on a lathed body, `lift` proud of it: half-angles at the
    bottom and top edges give its trapezoid outline, `centre` turns it round
    the body (pi is the back)."""
    mesh = bmesh.new()
    grid = []
    for j in range(rows + 1):
        v = j / rows
        z = z_low + (z_high - z_low) * v
        half = half_low + (half_high - half_low) * v
        row = []
        for i in range(columns + 1):
            a = centre - half + 2 * half * i / columns
            point = surface(rings, z, a)
            row.append(mesh.verts.new(point + outward(point) * lift))
        grid.append(row)
    for j in range(rows):
        for i in range(columns):
            mesh.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    obj = mesh_object(name, mesh)
    solid = obj.modifiers.new("solid", "SOLIDIFY")
    solid.thickness = thickness
    solid.offset = 1
    apply_modifiers(obj)
    return obj


def build_shirt():
    body = lathe("shirt", SHIRT, segments=14, caps=(False, True))
    subdivide(body)
    bind(body, BODY + LEGS + ["shoulder.L", "shoulder.R"])
    bpy.ops.mesh.primitive_torus_add(major_segments=16, minor_segments=6, major_radius=0.047, minor_radius=0.008)
    collar = bpy.context.active_object
    collar.data.transform(Matrix.LocRotScale((0, 0.01, 0.528), Euler((-0.1, 0, 0)), (1, 0.98, 1)))
    collar = bind(collar, ["chest"])
    sleeves = []
    for side, tag in ((-1, "R"), (1, "L")):
        shoulder, _, wrist, _ = arm_points(side)
        sleeve = lathe(
            "sleeve",
            [
                (-0.035, 0.035, 0.035),
                (-0.012, 0.05, 0.05),
                (0.03, 0.053, 0.053),
                (0.058, 0.051, 0.051),
                (0.064, 0.049, 0.049),
                (0.069, 0.044, 0.044),
                (0.07, 0.028, 0.028),
            ],
            segments=8,
            caps=(True, False),
        )
        sleeve.data.transform(along(shoulder, wrist))
        subdivide(sleeve)
        sleeves.append(bind(sleeve, [f"shoulder.{tag}", f"upper_arm.{tag}"], keep=2))
    return join([body, collar] + sleeves, "shirt")


# Where the bib's top corners are: (height, angle from the front).
BIB_TOP = 0.452
BIB_CORNER = 0.42


def strap_path(side):
    """Points and normals of one strap: from the bib's corner up over the
    shoulder and straight down the back to the waistband."""
    keys = [
        (BIB_TOP - 0.01, side * BIB_CORNER),
        (0.48, side * 0.5),
        (0.505, side * 0.75),
        (0.515, side * 1.25),
        (0.51, side * (math.pi - 1.0)),
        (0.49, side * (math.pi - 0.55)),
        (0.44, side * (math.pi - 0.42)),
        (0.39, side * (math.pi - 0.38)),
        (0.34, side * (math.pi - 0.36)),
    ]
    points, normals = [], []
    for z, a in keys:
        p = surface(SHIRT, z, a)
        n = (p - Vector((0, 0.008, z - 0.06 if z > 0.47 else z))).normalized()
        points.append(p + n * 0.009)
        normals.append(n)
    return points, normals


def build_dungarees():
    seat = lathe("seat", SEAT, segments=14)
    subdivide(seat)
    bind(seat, ["hips", "spine"] + LEGS)
    bib = patch("bib", SHIRT, 0.3, BIB_TOP, 0.62, 0.52, 0.003, thickness=0.007)
    bevel(bib, 0.002, 1)
    bind(bib, ["spine", "chest"])
    pocket = patch("pocket", SHIRT, 0.37, 0.425, 0.3, 0.3, 0.01, thickness=0.004, columns=6, rows=3)
    bind(pocket, ["spine", "chest"])
    parts = [seat, bib, pocket]
    # The back panel the straps run into, and the seat pockets.
    back = patch("back", SHIRT, 0.3, 0.375, 0.5, 0.42, 0.003, thickness=0.007, centre=math.pi)
    parts.append(bind(back, ["spine", "chest"]))
    for side in (-1, 1):
        seat_pocket = patch("seat_pocket", SEAT, 0.245, 0.3, 0.25, 0.27, 0.004, thickness=0.004, centre=math.pi + side * 0.42, columns=5, rows=3)
        parts.append(bind(seat_pocket, ["hips"]))
    for side in (-1, 1):
        points, normals = strap_path(side)
        strap = sweep("strap", points, normals, 0.03, 0.007, segments=6)
        subdivide(strap)
        parts.append(bind(strap, BODY + ["shoulder.L", "shoulder.R"]))
    # Belt loops on the waistband.
    for a in (-2.3, -0.95, 0.95, 2.3, math.pi):
        p = surface(SEAT, 0.337, a)
        n = outward(p)
        bpy.ops.mesh.primitive_cube_add(size=1)
        loop = bpy.context.active_object
        frame = n.to_track_quat("Z", "Y").to_matrix().to_4x4()
        loop.data.transform(Matrix.Translation(p + n * 0.003) @ frame @ Matrix.Diagonal((0.011, 0.03, 0.006, 1)))
        bevel(loop, 0.002, 1)
        parts.append(bind(loop, ["hips"]))

    legs = []
    for side, tag in ((1, "L"), (-1, "R")):
        x = side * LEG_X
        leg = lathe(
            "leg",
            [
                (0.08, 0.046, 0.046),
                (0.083, 0.062, 0.062),
                (0.088, 0.066, 0.066),
                (0.118, 0.066, 0.066),
                (0.123, 0.062, 0.062),
                (0.127, 0.056, 0.056),
                (0.17, 0.058, 0.058),
                (0.19, 0.059, 0.059),
                (0.3, 0.061, 0.061),
            ],
            segments=10,
            caps=(True, True),
        )
        leg.data.transform(Matrix.Translation((x, 0, 0)))
        subdivide(leg)
        legs.append(bind(leg, ["hips", f"thigh.{tag}", f"shin.{tag}"], keep=2))
    return join(parts + legs, "dungarees")


def build_buttons():
    parts = []
    for side in (-1, 1):
        p = surface(SHIRT, BIB_TOP - 0.016, side * BIB_CORNER)
        n = (p - Vector((0, 0.008, p.z))).normalized()
        parts.append(bind(cylinder(p + n * 0.01, p + n * 0.02, 0.0105, vertices=12), ["chest"]))
    return join(parts, "buttons")


BOOT = (Vector((0, -0.03, 0.04)), (0.053, 0.083, 0.05))


def build_boots():
    parts = []
    for side, tag in ((1, "L"), (-1, "R")):
        x = side * LEG_X
        centre, half = BOOT
        upper = sphere(centre + Vector((x, 0, 0)), half, segments=16, rings=10)
        for v in upper.data.vertices:
            v.co.z = max(v.co.z, 0.026)
        sole = sphere(centre + Vector((x, 0.0, -0.014)), (half[0] + 0.007, half[1] + 0.008, 0.03), segments=16, rings=8)
        for v in sole.data.vertices:
            v.co.z = min(max(v.co.z, 0.0), 0.03)
        shaft = lathe("shaft", [(0.03, 0.05, 0.052), (0.06, 0.05, 0.052), (0.1, 0.047, 0.048)], segments=12, caps=(False, True))
        shaft.data.transform(Matrix.Translation((x, 0.006, 0)))
        parts.append(bind(join([upper, sole, shaft], f"boot_{tag}"), [f"foot.{tag}"]))
    return join(parts, "boots")


def grip_frame():
    """Matrix taking +Z from the brush's tail along it, in the neutral grip."""
    tail = IDLE_HAND_R - BRUSH_DIR * BRUSH_GRIP
    return along(tail, tail + BRUSH_DIR)


def build_brush():
    """Brown wooden handle, silver ferrule and cream bristles dipped red, built
    along +Z from the tail and placed in the neutral grip."""
    frame = grip_frame()
    handle = lathe(
        "brush_handle",
        [(0.0, 0.0035, 0.0035), (0.004, 0.0055, 0.0055), (0.03, 0.0065, 0.0065), (0.13, 0.0095, 0.0095), (0.152, 0.0098, 0.0098)],
        segments=10,
        caps=(True, True),
    )
    ferrule = lathe(
        "brush_ferrule",
        [(0.148, 0.0108, 0.0108), (0.152, 0.0118, 0.0118), (0.158, 0.0118, 0.0118), (0.16, 0.0108, 0.0108), (0.164, 0.0118, 0.0118), (0.176, 0.0122, 0.0122)],
        segments=12,
        caps=(True, True),
    )
    rings = [(0.172, 0.011), (0.18, 0.0145), (0.19, 0.0165), (0.198, 0.0165), (0.205, 0.015), (0.212, 0.0125), (0.219, 0.0095), (0.226, 0.006), (0.232, 0.0025), (BRUSH_LENGTH, 0.0)]
    bristles = lathe("brush_bristles", [(z, r, r) for z, r in rings], segments=12, caps=(True, False))
    bmesh_merge(bristles)
    bristles.data.materials.append(material("brush_bristles", roughness=0.85))
    bristles.data.materials.append(material("brush_tip", roughness=0.6))
    # The red runs up the bristles in points, as in the sheet.
    for poly in bristles.data.polygons:
        c = poly.center
        a = math.atan2(c.x, -c.y)
        poly.material_index = int(c.z > 0.206 - 0.009 * math.cos(4 * a))
    for obj in (handle, ferrule, bristles):
        obj.data.transform(frame @ BRUSH_SCALE)
        bind(obj, ["hand.R"])
    return handle, ferrule, bristles


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
    rig = bpy.data.objects.new("artist", data)
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
            # Hands stay loose so the brush grip can place them exactly.
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


LEFT_POLE = Vector((1, 0.6, 0.1))
RIGHT_POLE = Vector((-1, 0.6, 0.1))


class Grip:
    """The right hand in the reference grip, body at rest: its matrix, the
    wrist it hangs from and the forearm's direction there."""

    def __init__(self, rig, scale):
        clear_pose(rig)
        reach(rig, "R", IDLE_HAND_R * scale, RIGHT_POLE)
        bones = rig.pose.bones
        self.matrix = bones["hand.R"].matrix.copy()
        self.wrist = bones["forearm.R"].tail.copy()
        self.forearm = bones["forearm.R"].tail - bones["forearm.R"].head
        clear_pose(rig)


def hold_brush(rig, grip, wrist, pole, aim_at=None, held=0.0, roll=0.0):
    """Puts the right wrist on `wrist` and turns the hand with the forearm,
    so the brush swings with the arm; `held` turns the brush on toward
    `aim_at`, and `roll` flicks it about the forearm."""
    bones = rig.pose.bones
    upper, fore = bones["upper_arm.R"], bones["forearm.R"]
    bend(upper, fore, wrist, pole)
    now = fore.tail - fore.head
    follow = grip.forearm.rotation_difference(now).to_matrix()
    rotation = follow @ grip.matrix.to_3x3()
    if held:
        current = follow @ BRUSH_DIR
        wanted = current.slerp(aim_at, held)
        rotation = current.rotation_difference(wanted).to_matrix() @ rotation
    if roll:
        rotation = Matrix.Rotation(roll, 3, now.normalized()) @ rotation
    matrix = rotation.to_4x4()
    matrix.translation = fore.tail
    bones["hand.R"].matrix = matrix
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


def settle_hair(rig, roll, pitch, swing=0.0):
    """The lower hair hangs: it gives back part of the head's roll and pitch,
    and `swing` sways it on its own."""
    hair = rig.pose.bones["hair"]
    turn(hair, "Y", -0.45 * roll)
    turn(hair, "X", -0.4 * pitch + swing)


# The beret sits out of a chibi arm's reach, so the free hand tucks her hair
# behind the left ear instead: from in front of the ear to behind it, in the
# head's rest frame.
TUCK_FROM = HEAD + Vector((0.236, -0.05, -0.04))
TUCK_TO = HEAD + Vector((0.232, 0.03, -0.01))


def pose(rig, k, grip, breath=0.0, sway=0.0, tilt=0.0, nod=0.0, look=0.0, paint=0.0, stroke=0.0, flick=0.0, raise_=0.0, tuck=0.0, slide=0.0, lift=0.0):
    """Poses her from a few channels, each 0 in the shared neutral pose every
    idle starts and ends on, so any idle can follow any other.

    breath and sway run -1..1: the chest rises as the hips dip, the weight
    rocks over one leg then the other. tilt rolls the head, nod dips it, look
    turns it to her right. paint brings the brush up in front of her, stroke
    (0..1) draws it down and across, flick rolls it at the wrist, raise_
    swings it out on the way. tuck brings the free left hand up beside the
    left ear, slide draws it back behind the ear, lift swings the hand out
    on the way. The feet stay planted.
    """
    bones = rig.pose.bones
    clear_pose(rig)

    hips = bones["hips"]
    dip = -0.008 - 0.006 * (1 + breath) / 2
    hips.matrix = Matrix.Translation(Vector((0.016 * sway, 0, dip)) * k) @ hips.matrix
    bpy.context.view_layer.update()
    turn(hips, "Y", -0.06 * sway)
    turn(bones["spine"], "Y", 0.09 * sway)
    turn(bones["spine"], "Z", -0.06 * paint)
    turn(bones["chest"], "X", -0.06 * breath)
    turn(bones["chest"], "Y", -0.03 * sway - 0.04 * tuck)
    turn(bones["shoulder.L"], "Y", -0.07 * breath - 0.1 * tuck)
    turn(bones["shoulder.R"], "Y", 0.07 * breath + 0.06 * paint)
    turn(bones["neck"], "X", 0.035 * breath)
    head = bones["head"]
    roll = 0.04 * sway + 0.12 * tilt + 0.1 * tuck
    pitch = 0.12 * nod + 0.1 * paint
    turn(head, "X", pitch)
    turn(head, "Y", roll)
    turn(head, "Z", -0.25 * look)
    settle_hair(rig, roll, pitch)

    head_move = delta(head)

    # The free left hand: hanging loose, or tucking the hair behind her ear.
    rest = IDLE_HAND_L + Vector((0, 0, 0.005 * breath))
    at = head_move @ (TUCK_FROM.lerp(TUCK_TO, slide) * k)
    up = head_move.to_3x3() @ Vector((0, 0.04, 0.1))
    target = (rest * k).lerp(at, tuck) + Vector((0.07, -0.05, 0.0)) * lift * k
    point = (target + (target - bones["upper_arm.L"].head) * 0.5).lerp(at + up * k, tuck) if tuck else None
    reach(rig, "L", target, LEFT_POLE.lerp(Vector((1, 0.4, -0.7)), tuck), point)

    # The right hand with the brush: hanging, or up in front of her painting.
    stroke_at = Vector((0.055, -0.01, -0.045)) * stroke
    wrist = (grip.wrist + Vector((0, 0, 0.005 * breath)) * k).lerp((PAINT_WRIST + stroke_at) * k, paint)
    wrist += Vector((-0.06, -0.04, 0.0)) * raise_ * k
    aim_at = (PAINT_DIR + Vector((0.35, 0, -0.1)) * stroke).normalized()
    pole = RIGHT_POLE.lerp(Vector((-1, 0.3, -0.7)), paint)
    hold_brush(rig, grip, wrist, pole, aim_at, paint, roll=0.5 * flick)

    plant_feet(rig, k)


def breathe(t):
    return dict(breath=math.sin(4 * math.pi * t), sway=math.sin(2 * math.pi * t), tilt=0.5 * math.sin(2 * math.pi * t) ** 3)


def paint_strokes(t):
    held = ease(t, 0.1, 0.3) * (1 - ease(t, 0.72, 0.92))
    # Two strokes while the brush is up, each drawn down and across quickly
    # and lifted back slowly.
    u = min(max((t - 0.32) / 0.38, 0), 1)
    phase = (2 * u) % 1 if u < 1 else 0
    stroke = ease(phase, 0, 0.45) * (1 - ease(phase, 0.55, 1)) if 0 < u < 1 else 0
    return dict(
        breath=0.5 * math.sin(4 * math.pi * t),
        sway=0.25 * math.sin(2 * math.pi * t),
        paint=held,
        stroke=stroke,
        flick=stroke - 0.5 * pulse(t, 0.3, 0.72),
        raise_=pulse(t, 0.06, 0.95) - held,
        nod=0.3 * held,
        look=0.35 * held,
    )


def tuck_hair(t):
    # Played as `idle_beret`, the name the scene asks for.
    held = ease(t, 0.12, 0.34) * (1 - ease(t, 0.66, 0.88))
    return dict(
        breath=0.5 * math.sin(4 * math.pi * t),
        sway=-0.3 * math.sin(2 * math.pi * t),
        tuck=held,
        slide=ease(t, 0.34, 0.56),
        lift=pulse(t, 0.05, 0.95) - held,
    )


IDLES = {"idle_breathe": (breathe, 6), "idle_paint": (paint_strokes, 4), "idle_beret": (tuck_hair, 4)}

WALK_FRAMES = 20
STRIDE = 0.05
STEP_LIFT = 0.042


def walk_pose(rig, k, grip, t):
    """One frame of the in-place walk at phase t: each foot slides back on
    the ground for half the cycle and swings forward through the air for the
    other half; the body springs up as the legs pass, the arms swing against
    the legs (the one with the brush a little less), the head stays level and
    the hair bounces a beat behind."""
    bones = rig.pose.bones
    clear_pose(rig)
    feet = {}
    for tag, offset in (("L", 0.0), ("R", 0.5)):
        p = (t + offset) % 1
        rest_ankle = Vector(BONES[f"shin.{tag}"][1]) * k
        if p < 0.5:
            s = p / 0.5
            y = -STRIDE + 2 * STRIDE * s
            z, pitch = 0.0, 0.0
        else:
            s = (p - 0.5) / 0.5
            y = STRIDE - 2 * STRIDE * (s * s * (3 - 2 * s))
            z = STEP_LIFT * math.sin(math.pi * s) ** 1.2
            pitch = -0.45 * math.sin(math.pi * s) * (1 - s) + 0.2 * math.sin(math.pi * s) * s
        feet[tag] = (rest_ankle + Vector((0, y, z)) * k, pitch)

    contact = math.cos(4 * math.pi * t)
    hips = bones["hips"]
    drop = -0.022 - 0.016 * (1 + contact) / 2
    side = 0.006 * math.sin(2 * math.pi * t)
    hips.matrix = Matrix.Translation(Vector((side, 0, drop)) * k) @ hips.matrix
    bpy.context.view_layer.update()
    swing = math.cos(2 * math.pi * t)
    turn(hips, "Z", 0.12 * swing)
    turn(hips, "Y", -0.05 * math.sin(2 * math.pi * t))
    turn(bones["spine"], "Z", -0.16 * swing)
    turn(bones["spine"], "X", 0.05)
    turn(bones["chest"], "X", 0.03 - 0.03 * contact)
    turn(bones["chest"], "Z", -0.04 * swing)
    head = bones["head"]
    back = head.bone.matrix_local.to_quaternion() @ head.matrix.to_quaternion().inverted()
    turn(head, back.axis, back.angle * 0.85)
    turn(head, "X", 0.04 * contact)
    # The hair lifts as she drops and settles as she rises, a beat late.
    settle_hair(rig, 0.0, 0.0, swing=0.07 * math.cos(4 * math.pi * t - 1.2))
    turn(bones["hair"], "Y", 0.04 * math.sin(2 * math.pi * t - 0.8))

    # The left arm swings against the left leg, the right one, with the
    # brush, through a smaller arc.
    target = (IDLE_HAND_L + Vector((0.012, 0.08 * swing, 0.025 * abs(swing) - 0.01 * contact))) * k
    reach(rig, "L", target, LEFT_POLE + Vector((0, -0.3 * swing, 0)))
    wrist = grip.wrist + Vector((-0.008, -0.045 * swing, 0.014 * abs(swing) - 0.008 * contact)) * k
    hold_brush(rig, grip, wrist, RIGHT_POLE + Vector((0, 0.3 * swing, 0)))
    plant_feet(rig, k, feet)


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


def stage_brush(rig, brush, grip):
    """The brush is modelled in the grip; skinned to the right hand, it must
    sit where that hand is at rest, so it is carried back by the inverse of
    the hand's move into the grip."""
    hand = rig.pose.bones["hand.R"]
    for obj in brush:
        obj.data.transform(hand.bone.matrix_local @ grip.matrix.inverted())


def bake_occlusion(parts, skip, distance=0.1, strength=0.6, floor=0.55):
    """Bakes a light ambient occlusion into each part's `ao` vertex colours,
    with the whole figure present so the hair shades the face under it and
    the beret the hair. Kept light: open surfaces stay white, the deepest
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
        export_frame_step=2,
        export_all_vertex_colors=False,
    )


def build_artist():
    reset()
    handle, ferrule, bristles = build_brush()
    parts = [
        finish(build_skin(), "skin", roughness=0.7),
        finish(build_hair(), "hair", roughness=0.85),
        finish(build_eyes(), "eyes"),
        finish(build_beret(), "beret", roughness=0.9),
        finish(build_shirt(), "shirt", roughness=0.9),
        finish(build_dungarees(), "dungarees", roughness=0.9),
        finish(build_buttons(), "buttons", roughness=0.45),
        finish(build_boots(), "boots", roughness=0.7),
    ]
    brush = [
        finish(handle, "brush_handle", roughness=0.55),
        finish(ferrule, "brush_ferrule", roughness=0.3),
        finish(bristles, "brush_bristles"),
    ]
    parts += brush

    # Modelled by eye, then sized so she stands exactly HEIGHT tall.
    top = max(v.co.z for obj in parts for v in obj.data.vertices)
    scale = HEIGHT / top
    for obj in parts:
        obj.data.transform(Matrix.Scale(scale, 4))

    rig = build_armature(scale)
    grip = Grip(rig, scale)
    stage_brush(rig, brush, grip)
    for obj in parts:
        obj.parent = rig
        obj.modifiers.new("rig", "ARMATURE").object = rig
    pose(rig, scale, grip)
    bake_occlusion(parts, skip={"eyes"})
    for name, (channels, seconds) in IDLES.items():
        animate(rig, name, seconds * FPS, 3, lambda t, c=channels: pose(rig, scale, grip, **c(t)))
    animate(rig, "walk", WALK_FRAMES, 1, lambda t: walk_pose(rig, scale, grip, t))
    clear_pose(rig)

    for obj in parts:
        print(f"{obj.name:15s} {triangles(obj):6d} tris")
    print(f"{'total':15s} {sum(triangles(o) for o in parts):6d} tris")
    export(rig, parts, "artist")


build_artist()

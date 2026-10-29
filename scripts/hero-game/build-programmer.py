"""Builds the programmer, the hero game's second character, as a skinned GLB.

Run headless:  blender -b --python scripts/hero-game/build-programmer.py

A soft clay chibi like the old sage, about 0.88 tall, feet at the origin and
facing -Y (+Z in glTF): messy black hair, big round glasses, red over-ear
headphones, a red hoodie with the hood down, black joggers and sneakers, and a
closed laptop tucked under his left arm. Every part the scene may recolour is
its own named mesh: skin, hair, eyes, glasses, headphones, pads, hoodie,
strings, trousers, shoes, soles and laptop.

The parts that bend (hoodie body and sleeves, trousers) are lathed quad shells
with edge loops at the joints and one level of subdivision; the rigid parts
ride a single bone each. Weights are computed here, as for the sage: each part
lists the bones it may follow and a vertex is shared between its nearest ones
by inverse distance.

The rest pose is a relaxed A-pose. The armature carries three looping idles,
`idle_breathe` (6 s), `idle_glasses` (4 s) and `idle_music` (4 s), which all
start and end on one neutral pose, and a two-step `walk` (0.83 s). All of them
are in place: the scene moves him between cells. The laptop is skinned to the
left hand and modelled in the neutral pose's grip, so in the bare rest pose it
hangs from that hand.
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

# Where the neutral pose puts the hands: the right hangs loose, the left is
# bent at the elbow, clamping the laptop to his ribs and holding its front end.
IDLE_HAND_R = Vector((-0.2, -0.012, 0.248))
IDLE_HAND_L = Vector((0.198, -0.098, 0.35))
LAPTOP_AT = Vector((0.156, 0.0, 0.328))
LAPTOP_SIZE = (0.026, 0.2, 0.135)

# The headphones: cups over the ears, the band over the crown.
CUP_Z = HEAD.z - 0.012
CUP_Y = 0.008
CUP_X = 0.182
# The hair's cap, which the band rests on.
CAP_AT = HEAD + Vector((0, 0.034, 0.03))
CAP = (HEAD_R * HEAD_SCALE[0] * 1.05, HEAD_R * 1.07, HEAD_R * HEAD_SCALE[2] * 1.05)
BAND = (CUP_X + 0.03, CAP_AT.z + CAP[2] - CUP_Z + 0.006)

COLOURS = {
    "skin": "#F2B49B",
    "hair": "#1A1917",
    "eyes": "#1B1716",
    "glasses": "#1A1917",
    "headphones": "#E2372B",
    "pads": "#1A1917",
    "hoodie": "#E2372B",
    "strings": "#EDE8E1",
    "trousers": "#1E1D1C",
    "shoes": "#1E1D1C",
    "soles": "#F2F0EC",
    "laptop": "#3C3B38",
    "laptop_logo": "#D8D6D2",
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
    nose_at, _ = on_head(0, HEAD.z - 0.03, inset=0.01)
    nose = sphere(nose_at, (0.022, 0.02, 0.018), segments=10, rings=6)
    neck = lathe("neck", [(0.5, 0.045, 0.045), (0.6, 0.045, 0.045)], segments=10)
    head = bind(join([head, nose], "face"), ["head"])
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
        hands.append(bind(hand, [f"hand.{tag}"]))
    return join([head, neck] + hands, "skin")


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
        eye = sphere(point, (0.023, 0.027, 0.011), segments=12, rings=7, rotation=rotation)
        eye.data.materials.append(dark)
        spark_at, spark_rot = on_head(side * 0.06 + 0.009, HEAD.z + 0.014, inset=-0.004)
        spark = sphere(spark_at, (0.0065, 0.0065, 0.003), segments=8, rings=4, rotation=spark_rot)
        spark.data.materials.append(glint)
        parts += [eye, spark]
    # A small smile, a little to one side, as in the sheet.
    points, normals = [], []
    for i in range(9):
        t = i / 8 - 0.5
        point, _ = on_head(0.006 + t * 0.042, HEAD.z - 0.066 - 0.012 * (1 - 4 * t * t), inset=-0.001)
        points.append(point)
        normals.append((point - HEAD).normalized())
    smile = sweep("smile", points, normals, 0.007, 0.004, segments=6)
    smile.data.materials.append(dark)
    parts.append(smile)
    return bind(join(parts, "eyes"), ["head"])


def build_glasses():
    """Round black rims over the eyes, a bridge and temples that run back
    under the headphone pads."""
    parts = []
    rims = []
    for side in (-1, 1):
        point, _ = on_head(side * 0.062, HEAD.z + 0.002, inset=-0.016)
        normal = (point - HEAD).normalized().lerp(Vector((0, -1, 0)), 0.55).normalized()
        bpy.ops.mesh.primitive_torus_add(major_segments=24, minor_segments=6, major_radius=0.045, minor_radius=0.0078)
        rim = bpy.context.active_object
        rim.data.transform(Matrix.LocRotScale(point, normal.to_track_quat("Z", "Y"), (1, 0.97, 1.2)))
        parts.append(rim)
        rims.append((point, normal))
    (pr, nr), (pl, nl) = rims
    inner_r = pr + Vector((0.045, 0, 0.006))
    inner_l = pl + Vector((-0.045, 0, 0.006))
    mid = (inner_r + inner_l) / 2 + Vector((0, -0.006, 0.006))
    parts.append(sweep("bridge", [inner_r, mid, inner_l], [Vector((0, -1, 0))] * 3, 0.011, 0.009, segments=6))
    for side, (point, _) in ((-1, rims[0]), (1, rims[1])):
        outer = point + Vector((side * 0.044, 0.004, 0.006))
        back = Vector((side * (CUP_X - 0.012), CUP_Y - 0.03, CUP_Z + 0.014))
        parts.append(cylinder(outer, back, 0.0055, vertices=6))
    return bind(join(parts, "glasses"), ["head"])


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
    h = HEAD
    # The cap sits back and up from the head, so the hairline falls high on
    # the forehead and the fringe can come down over it.
    parts = [sphere(CAP_AT, CAP, segments=22, rings=12)]

    def lock(az, el, out, length, width, curl=0.3, flat=0.55, spin=0.0, seed=0, radius=1.0):
        n = noise.noise(Vector((seed * 1.37, 0.4, 0.9)))
        root = head_point(az, el, radius)
        normal = (root - h).normalized()
        tangent_down = Vector((0, 0, -1)) - Vector((0, 0, -1)).dot(normal) * normal
        direction = (tangent_down.normalized() * (1 - out) + normal * out).normalized()
        direction = Matrix.Rotation(spin + n * 0.25, 3, normal) @ direction
        return tuft(root, direction, length * (1 + n * 0.12), width, curl, flat, up=normal)

    # The fringe: locks from the front of the crown lying down over the
    # forehead to the brows, curling in to follow it, parted to his right.
    for k, az in enumerate((-0.7, -0.44, -0.18, 0.06, 0.3, 0.55, 0.78)):
        spin = 0.4 if az < -0.1 else -0.3
        parts.append(lock(az, 1.02, 0.04, 0.09, 0.042, curl=-0.12, flat=0.45, spin=spin, seed=k, radius=1.04))
    # The sides above the cups and round the back, two rows, flicking out at
    # the nape.
    for k in range(9):
        az = math.radians(80 + k * 200 / 8)
        parts.append(lock(az, 0.62, 0.06, 0.12, 0.045, curl=0.25, spin=0.2 * math.sin(k * 2.1), seed=10 + k))
    for k in range(7):
        az = math.radians(110 + k * 140 / 6)
        parts.append(lock(az, 0.12, 0.35, 0.09, 0.04, curl=0.5, spin=0.3 * math.sin(k * 1.7), seed=30 + k))
    # Layers over the back of the crown, and short ones at the nape down to
    # the hood.
    for k in range(6):
        az = math.radians(125 + k * 110 / 5)
        parts.append(lock(az, 0.95, 0.12, 0.12, 0.048, curl=0.35, spin=0.25 * math.sin(k * 2.7), seed=60 + k, radius=1.03))
    for k in range(5):
        az = math.radians(140 + k * 80 / 4)
        parts.append(lock(az, -0.25, 0.25, 0.07, 0.036, curl=0.4, spin=0.2 * math.sin(k * 1.3), seed=70 + k))
    # A few tufts standing up off the crown and curling back: the messy bit.
    for az, el, length in ((0.35, 1.2, 0.05), (-0.3, 1.25, 0.055), (2.8, 1.1, 0.06), (3.6, 1.15, 0.05)):
        root = head_point(az, el, 1.0)
        normal = (root - h).normalized()
        back = Vector((0, 1, 0)) - Vector((0, 1, 0)).dot(normal) * normal
        parts.append(tuft(root, normal + back.normalized() * 1.1, length, 0.028, curl=0.55, flat=0.6, up=back, segments=7))
    # Sideburns peeking out in front of the pads.
    for side in (-1, 1):
        parts.append(lock(side * 1.2, 0.25, 0.1, 0.07, 0.024, curl=0.2, seed=50 + side))

    brows = []
    for side in (-1, 1):
        point, _ = on_head(side * 0.06, HEAD.z + 0.07, inset=-0.006)
        brows.append((tuple(point), (0.03, 0.013, 0.013), (0, -side * 0.12, 0)))
    brow = blobs("mb_brows", brows, resolution=0.004, target=300)
    return bind(join(parts + [brow], "hair"), ["head"])


def cup_frame(side):
    """Matrix taking +Z out of his head through the centre of one cup."""
    rotation = Vector((side, 0, 0)).to_track_quat("Z", "Y").to_matrix().to_4x4()
    return Matrix.Translation((side * CUP_X, CUP_Y, CUP_Z)) @ rotation


def band_arc(radius_x, radius_z, angle, steps=18):
    points, normals = [], []
    for i in range(steps + 1):
        a = -angle + 2 * angle * i / steps
        point = Vector((radius_x * math.sin(a), CUP_Y, CUP_Z + radius_z * math.cos(a)))
        normal = Vector((math.sin(a) / radius_x, 0, math.cos(a) / radius_z)).normalized()
        points.append(point)
        normals.append(normal)
    return points, normals


def build_headphones():
    """Red cups and the red outer arc of the band; the black pads, inner band
    and sliders are `pads`."""
    red, black = [], []
    for side in (-1, 1):
        cup = lathe(
            "cup",
            [
                (0.006, 0.05, 0.05),
                (0.01, 0.058, 0.058),
                (0.018, 0.062, 0.062),
                (0.036, 0.062, 0.062),
                (0.044, 0.057, 0.057),
                (0.047, 0.047, 0.047),
                (0.046, 0.04, 0.04),
                (0.05, 0.037, 0.037),
                (0.053, 0.03, 0.03),
            ],
            segments=20,
            caps=(True, True),
        )
        cup.data.transform(cup_frame(side))
        red.append(cup)
        bpy.ops.mesh.primitive_torus_add(major_segments=16, minor_segments=6, major_radius=0.038, minor_radius=0.02)
        pad = bpy.context.active_object
        pad.data.transform(cup_frame(side) @ Matrix.LocRotScale((0, 0, 0.004), None, (1, 1, 0.75)))
        black.append(pad)
    angle = math.acos(0.07 / BAND[1])
    for side in (-1, 1):
        slider = sphere(Vector((side * BAND[0] * math.sin(angle), CUP_Y, CUP_Z + 0.068)), (0.014, 0.021, 0.018), segments=10, rings=6)
        black.append(slider)
    points, normals = band_arc(BAND[0], BAND[1], angle)
    black.append(sweep("band", points, normals, 0.036, 0.016, segments=10))
    points, normals = band_arc(BAND[0] + 0.011, BAND[1] + 0.011, angle * 0.86)
    red.append(sweep("arc", points, normals, 0.03, 0.012, segments=10))
    return bind(join(red, "headphones"), ["head"]), bind(join(black, "pads"), ["head"])


# The hoodie's body: (z, rx, ry, dy), hem band to neck.
HOODIE = [
    (0.255, 0.124, 0.108, 0.005),
    (0.262, 0.132, 0.115, 0.005),
    (0.29, 0.132, 0.115, 0.005),
    (0.298, 0.128, 0.111, 0.005),
    (0.306, 0.137, 0.119, 0.005),
    (0.34, 0.141, 0.122, 0.005),
    (0.4, 0.141, 0.122, 0.005),
    (0.45, 0.137, 0.118, 0.005),
    (0.49, 0.122, 0.106, 0.008),
    (0.52, 0.09, 0.082, 0.012),
    (0.545, 0.055, 0.055, 0.012),
]


def hoodie_surface(z, angle):
    """The point on the hoodie body at height z and angle from the front."""
    for low, high in zip(HOODIE, HOODIE[1:]):
        if low[0] <= z <= high[0]:
            t = (z - low[0]) / (high[0] - low[0])
            rx, ry, dy = (low[i] + (high[i] - low[i]) * t for i in (1, 2, 3))
            return Vector((rx * math.sin(angle), -ry * math.cos(angle) + dy, z))
    raise ValueError(z)


def front_patch(name, z_low, z_high, half_low, half_high, lift, columns=8, rows=4):
    """A panel lying on the hoodie's front, `lift` proud of it: half-angles at
    the bottom and top edges give its trapezoid outline."""
    mesh = bmesh.new()
    grid = []
    for j in range(rows + 1):
        v = j / rows
        z = z_low + (z_high - z_low) * v
        half = half_low + (half_high - half_low) * v
        row = []
        for i in range(columns + 1):
            a = -half + 2 * half * i / columns
            point = hoodie_surface(z, a)
            outward = Vector((point.x, point.y - 0.005, 0)).normalized()
            row.append(mesh.verts.new(point + outward * lift))
        grid.append(row)
    for j in range(rows):
        for i in range(columns):
            mesh.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    obj = mesh_object(name, mesh)
    solid = obj.modifiers.new("solid", "SOLIDIFY")
    solid.thickness = lift + 0.004
    solid.offset = 1
    apply_modifiers(obj)
    return obj


def build_hoodie():
    body = lathe("hoodie", HOODIE, segments=14, caps=(False, True))
    subdivide(body)
    bind(body, BODY + LEGS + ["shoulder.L", "shoulder.R"])
    pocket = front_patch("pocket", 0.31, 0.395, 0.62, 0.5, 0.005)
    bevel(pocket, 0.003, 1)
    bind(pocket, ["hips", "spine"])

    # The hood, down: a soft roll round the neck and the hood itself lying
    # folded on the upper back.
    bpy.ops.mesh.primitive_torus_add(major_segments=18, minor_segments=8, major_radius=0.072, minor_radius=0.034)
    roll = bpy.context.active_object
    roll.data.transform(Matrix.LocRotScale((0, 0.016, 0.548), Euler((-0.22, 0, 0)), (1.12, 1.0, 1)))
    hood = blobs(
        "mb_hood",
        [
            ((0, 0.1, 0.5), (0.095, 0.04, 0.06), (0.35, 0, 0)),
            ((0, 0.118, 0.44), (0.068, 0.035, 0.05), (0.2, 0, 0)),
            ((-0.065, 0.078, 0.53), (0.038, 0.035, 0.035)),
            ((0.065, 0.078, 0.53), (0.038, 0.035, 0.035)),
        ],
        resolution=0.008,
        target=450,
    )
    collar = bind(join([roll, hood], "hood"), ["chest"])

    sleeves = []
    for side, tag in ((-1, "R"), (1, "L")):
        shoulder, _, wrist, _ = arm_points(side)
        length = (wrist - shoulder).length
        mid = UPPER_ARM
        sleeve = lathe(
            "sleeve",
            [
                (-0.035, 0.035, 0.035),
                (-0.012, 0.054, 0.054),
                (0.04, 0.058, 0.058),
                (mid - 0.02, 0.056, 0.056),
                (mid, 0.055, 0.055),
                (mid + 0.02, 0.055, 0.055),
                (length - 0.034, 0.052, 0.052),
                (length - 0.028, 0.043, 0.043),
                (length - 0.024, 0.045, 0.045),
                (length - 0.002, 0.045, 0.045),
                (length + 0.003, 0.037, 0.037),
                (length + 0.003, 0.024, 0.024),
            ],
            segments=10,
            caps=(True, True),
        )
        sleeve.data.transform(along(shoulder, wrist))
        subdivide(sleeve)
        sleeves.append(bind(sleeve, [f"shoulder.{tag}", f"upper_arm.{tag}", f"forearm.{tag}"], keep=2))
    return join([body, pocket, collar] + sleeves, "hoodie")


def build_strings():
    """The hoodie's drawstrings, and the laces: both off-white cord."""
    parts = []
    for side in (-1, 1):
        top = hoodie_surface(0.515, side * 0.32) + Vector((0, -0.012, 0))
        tip = hoodie_surface(0.43, side * 0.26) + Vector((0, -0.01, 0))
        mid = (top + tip) / 2 + Vector((0, -0.006, 0))
        points = [top, mid, tip]
        parts.append(bind(sweep("cord", points, [Vector((0, -1, 0))] * 3, 0.011, 0.009, segments=6), ["chest"]))
        aglet = cylinder(tip, tip + Vector((0, -0.002, -0.022)), 0.0065, vertices=8)
        parts.append(bind(aglet, ["chest"]))
    for side, tag in ((1, "L"), (-1, "R")):
        x = side * LEG_X
        for k in range(3):
            y = -0.095 + k * 0.022
            z = shoe_top(y) + 0.002
            bar = cylinder(Vector((x - 0.022, y, z - 0.004)), Vector((x + 0.022, y, z - 0.004)), 0.0055, vertices=6)
            parts.append(bind(bar, [f"foot.{tag}"]))
    return join(parts, "strings")


SHOE = (Vector((0, -0.035, 0.035)), (0.05, 0.085, 0.048))


def shoe_top(y):
    centre, (rx, ry, rz) = SHOE
    return centre.z + rz * math.sqrt(max(1 - ((y - centre.y) / ry) ** 2, 0))


def build_legs():
    legs, shoes, soles = [], [], []
    for side, tag in ((1, "L"), (-1, "R")):
        x = side * LEG_X
        leg = lathe(
            "leg",
            [
                (0.05, 0.042, 0.042),
                (0.056, 0.047, 0.047),
                (0.085, 0.047, 0.047),
                (0.092, 0.05, 0.05),
                (0.105, 0.056, 0.056),
                (0.15, 0.058, 0.058),
                (0.17, 0.058, 0.058),
                (0.19, 0.059, 0.059),
                (0.25, 0.062, 0.062),
                (0.31, 0.062, 0.062),
            ],
            segments=10,
            caps=(True, True),
        )
        leg.data.transform(Matrix.Translation((x, 0, 0)))
        subdivide(leg)
        legs.append(bind(leg, ["hips", f"thigh.{tag}", f"shin.{tag}"], keep=2))

        centre, half = SHOE
        upper = sphere(centre + Vector((x, 0, 0)), half, segments=16, rings=10)
        for v in upper.data.vertices:
            v.co.z = max(v.co.z, 0.022)
        shoes.append(bind(upper, [f"foot.{tag}"]))
        sole = sphere(centre + Vector((x, 0.0, -0.012)), (half[0] + 0.006, half[1] + 0.007, 0.03), segments=16, rings=8)
        for v in sole.data.vertices:
            v.co.z = min(max(v.co.z, 0.0), 0.034)
        soles.append(bind(sole, [f"foot.{tag}"]))
    return join(legs, "trousers"), join(shoes, "shoes"), join(soles, "soles")


def build_laptop():
    """A closed laptop standing on its long edge, the lid facing out from his
    left side with a light round logo; built in the neutral pose's grip."""
    bpy.ops.mesh.primitive_cube_add(size=1)
    case = bpy.context.active_object
    case.data.transform(Matrix.LocRotScale(LAPTOP_AT, None, LAPTOP_SIZE))
    bevel(case, 0.007, 3)
    case.data.materials.append(material("laptop", roughness=0.45))
    face = LAPTOP_AT + Vector((LAPTOP_SIZE[0] / 2, 0, 0.006))
    # The logo sits toward the back, where the arm does not cover it.
    face = face + Vector((0, 0.048, 0.008))
    disc = cylinder(face, face + Vector((0.0016, 0, 0)), 0.019, vertices=20)
    knob = cylinder(face + Vector((0, -0.006, 0.02)), face + Vector((0.0016, -0.006, 0.02)), 0.006, vertices=10)
    logo = join([disc, knob], "logo")
    logo.data.materials.append(material("laptop_logo", roughness=0.5))
    laptop = join([case, logo], "laptop")
    # Front end a little down and out, toward the hand that holds it.
    tilt = Matrix.Rotation(0.12, 4, "Z") @ Matrix.Rotation(-0.12, 4, "X")
    laptop.data.transform(Matrix.Translation(LAPTOP_AT) @ tilt @ Matrix.Translation(-LAPTOP_AT))
    return bind(laptop, ["hand.L"])


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
    rig = bpy.data.objects.new("programmer", data)
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
            # Hands stay loose so the laptop grip can place them exactly.
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


LEFT_POLE = Vector((0.6, 1, 0.2))
RIGHT_POLE = Vector((-1, 0.6, 0.1))


def grip_pose(rig, scale):
    """The reference grip: body at rest, left hand on the laptop as modelled.
    Returns the left hand's matrix there, which the laptop is staged from."""
    clear_pose(rig)
    reach(rig, "L", IDLE_HAND_L * scale, LEFT_POLE)
    return rig.pose.bones["hand.L"].matrix.copy()


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


def pose(rig, k, grip, breath=0.0, sway=0.0, nod=0.0, tilt=0.0, bob=0.0, groove=0.0, cup=0.0, specs=0.0, push=0.0, lift=0.0):
    """Poses him from a few channels, each 0 in the shared neutral pose every
    idle starts and ends on, so any idle can follow any other.

    breath and sway run -1..1: the chest rises as the hips dip, the weight
    rocks over one leg then the other. nod dips the head, tilt rolls it, bob
    drops the body on bent knees, groove lifts one shoulder and drops the
    other. cup brings the free right hand to the right headphone cup; specs
    brings it to the glasses, push slides it up the nose and lift swings it
    out on the way. The laptop rides with the spine, and the left hand with
    it; the feet stay planted.
    """
    bones = rig.pose.bones
    clear_pose(rig)

    hips = bones["hips"]
    dip = -0.008 - 0.006 * (1 + breath) / 2 - 0.014 * bob
    hips.matrix = Matrix.Translation(Vector((0.016 * sway, 0, dip)) * k) @ hips.matrix
    bpy.context.view_layer.update()
    turn(hips, "Y", -0.06 * sway)
    turn(bones["spine"], "Y", 0.09 * sway)
    turn(bones["chest"], "X", -0.06 * breath - 0.08 * specs)
    turn(bones["chest"], "Y", -0.03 * sway + 0.05 * groove)
    turn(bones["shoulder.L"], "Y", -0.07 * breath - 0.12 * groove)
    turn(bones["shoulder.R"], "Y", 0.07 * breath - 0.12 * groove + 0.25 * specs)
    turn(bones["neck"], "X", 0.035 * breath)
    head = bones["head"]
    turn(head, "X", 0.16 * nod + 0.12 * specs)
    turn(head, "Y", 0.04 * sway + 0.1 * tilt)
    head_move = delta(head)

    # The laptop is pinned between arm and ribs, so it goes where the spine
    # goes; the left hand is carried with it.
    carry = delta(bones["spine"])
    bend(bones["upper_arm.L"], bones["forearm.L"], carry @ (IDLE_HAND_L * k), LEFT_POLE, bones["hand.L"].length / 2)
    bones["hand.L"].matrix = carry @ grip
    bpy.context.view_layer.update()

    rest = IDLE_HAND_R + Vector((0, 0, 0.005 * breath))
    # Points in the head's rest frame, carried with it as it moves.
    cup_at = head_move @ (Vector((-(CUP_X + 0.095), CUP_Y + 0.005, CUP_Z - 0.01)) * k)
    cup_tip = head_move @ (Vector((-(CUP_X + 0.04), CUP_Y, CUP_Z + 0.015)) * k)
    bridge = HEAD + Vector((0, -HEAD_R - 0.035, 0.012 + 0.012 * push))
    specs_at = head_move @ ((bridge + Vector((-0.012, -0.022, -0.045))) * k)
    specs_tip = head_move @ (bridge * k)
    target = rest * k
    target = target.lerp(cup_at, cup).lerp(specs_at, specs) + Vector((-0.04, -0.05, 0.0)) * lift * k
    rest_tip = target + (target - bones["upper_arm.R"].head) * 0.5
    point = rest_tip.lerp(cup_tip, cup).lerp(specs_tip, specs) if cup or specs else None
    reach(rig, "R", target, RIGHT_POLE.lerp(Vector((-1, 0.2, -0.6)), max(cup, specs)), point)

    plant_feet(rig, k)


def breathe(t):
    return dict(breath=math.sin(4 * math.pi * t), sway=math.sin(2 * math.pi * t))


def fix_glasses(t):
    held = ease(t, 0.15, 0.36) * (1 - ease(t, 0.66, 0.86))
    return dict(
        breath=0.6 * math.sin(6 * math.pi * t),
        sway=0.3 * math.sin(2 * math.pi * t),
        specs=held,
        push=ease(t, 0.4, 0.55),
        lift=pulse(t, 0.08, 0.93) - held,
    )


def listen(t):
    # Eight beats in four seconds: 120 bpm, a nod on each, the shoulders
    # trading on every other one.
    on = ease(t, 0.06, 0.2) * (1 - ease(t, 0.84, 0.98))
    beat = (1 - math.cos(16 * math.pi * t)) / 2
    held = ease(t, 0.1, 0.24) * (1 - ease(t, 0.74, 0.9))
    return dict(
        breath=0.5 * math.sin(4 * math.pi * t),
        sway=0.6 * math.sin(4 * math.pi * t) * on,
        nod=0.55 * beat * on,
        tilt=0.6 * math.sin(4 * math.pi * t) * on,
        bob=0.6 * beat * on,
        groove=math.sin(8 * math.pi * t) * on,
        cup=held,
    )


IDLES = {"idle_breathe": (breathe, 6), "idle_glasses": (fix_glasses, 4), "idle_music": (listen, 4)}

WALK_FRAMES = 20
STRIDE = 0.05
STEP_LIFT = 0.04


def walk_pose(rig, k, grip, t):
    """One frame of the in-place walk at phase t: each foot slides back on
    the ground for half the cycle and swings forward through the air for the
    other half; the body drops on each contact and rises as the legs pass,
    the arms swing against the legs and the head stays level."""
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
    drop = -0.024 - 0.014 * (1 + contact) / 2
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
    # Undo what the body did, so the head stays level and facing ahead.
    back = head.bone.matrix_local.to_quaternion() @ head.matrix.to_quaternion().inverted()
    turn(head, back.axis, back.angle * 0.85)
    turn(head, "X", 0.04 * contact)

    carry = delta(bones["spine"])
    shoulder = carry @ (Vector(BONES["upper_arm.L"][0]) * k)
    sway = Matrix.Translation(shoulder) @ Matrix.Rotation(-0.06 * swing, 4, "X") @ Matrix.Translation(-shoulder)
    carry = sway @ carry
    bend(bones["upper_arm.L"], bones["forearm.L"], carry @ (IDLE_HAND_L * k), LEFT_POLE, bones["hand.L"].length / 2)
    bones["hand.L"].matrix = carry @ grip
    bpy.context.view_layer.update()

    # The right arm swings against the right leg, forward as it trails.
    target = (IDLE_HAND_R + Vector((-0.012, -0.075 * swing, 0.025 * abs(swing) - 0.01 * contact))) * k
    reach(rig, "R", target, RIGHT_POLE + Vector((0, 0.3 * swing, 0)))
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


def stage_laptop(rig, laptop, grip):
    """The laptop is modelled in the grip; skinned to the left hand, it must
    sit where that hand is at rest, so it is carried back by the inverse of
    the hand's move into the grip."""
    hand = rig.pose.bones["hand.L"]
    laptop.data.transform(hand.bone.matrix_local @ grip.inverted())
    clear_pose(rig)


def bake_occlusion(parts, skip, distance=0.1, strength=0.6, floor=0.55):
    """Bakes a light ambient occlusion into each part's `ao` vertex colours,
    with the whole figure present so the hair shades the face under it and
    the laptop his side. Kept light: open surfaces stay white, the deepest
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
        # Keys every 2 frames: smooth idles at half the size, and ten samples
        # for each step of the walk.
        export_frame_step=2,
        export_all_vertex_colors=False,
    )


def build_programmer():
    reset()
    trousers, shoes, soles = build_legs()
    headphones, pads = build_headphones()
    parts = [
        finish(build_skin(), "skin", roughness=0.7),
        finish(build_hair(), "hair", roughness=0.85),
        finish(build_eyes(), "eyes"),
        finish(build_glasses(), "glasses", roughness=0.4),
        finish(headphones, "headphones", roughness=0.5),
        finish(pads, "pads", roughness=0.8),
        finish(build_hoodie(), "hoodie", roughness=0.9),
        finish(build_strings(), "strings", roughness=0.8),
        finish(trousers, "trousers", roughness=0.9),
        finish(shoes, "shoes", roughness=0.7),
        finish(soles, "soles", roughness=0.75),
    ]
    laptop = finish(build_laptop(), "laptop")
    parts.append(laptop)

    # Modelled by eye, then sized so he stands exactly HEIGHT tall.
    top = max(v.co.z for obj in parts for v in obj.data.vertices)
    scale = HEIGHT / top
    for obj in parts:
        obj.data.transform(Matrix.Scale(scale, 4))

    rig = build_armature(scale)
    grip = grip_pose(rig, scale)
    stage_laptop(rig, laptop, grip)
    for obj in parts:
        obj.parent = rig
        obj.modifiers.new("rig", "ARMATURE").object = rig
    # Baked in the neutral pose every idle passes through, which is what is
    # seen, not the A-pose.
    pose(rig, scale, grip)
    bake_occlusion(parts, skip={"eyes", "glasses"})
    for name, (channels, seconds) in IDLES.items():
        animate(rig, name, seconds * FPS, 3, lambda t, c=channels: pose(rig, scale, grip, **c(t)))
    animate(rig, "walk", WALK_FRAMES, 1, lambda t: walk_pose(rig, scale, grip, t))
    clear_pose(rig)

    for obj in parts:
        print(f"{obj.name:12s} {triangles(obj):6d} tris")
    print(f"{'total':12s} {sum(triangles(o) for o in parts):6d} tris")
    export(rig, parts, "programmer")


build_programmer()

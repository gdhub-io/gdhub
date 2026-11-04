"""Builds the robot, the hero game's AI guide, as a skinned GLB.

Run headless:  blender -b --python scripts/hero-game/build-robot.py

A glossy toy robot, 0.6 tall with the antenna ball, feet at the origin and
facing -Y (+Z in glTF): a big rounded-box head with a black screen face, red
ear discs and an antenna, on a small egg of a body with ball joints. Every
part the scene may recolour is its own named mesh with a plain material:
shell, joints, screen, face, ears, ear_core and antenna_light.

The robot is rigid: every piece rides exactly one bone, so nothing bends and
the meshes are simple primitives. It is modelled at a convenient size and
scaled to HEIGHT at the end, as the sage is.

The rest pose is an A-pose. The armature carries three looping idles,
`idle_breathe` (6 s), `idle_scan` (4 s) and `idle_wave` (4 s), which all
start and end on one neutral pose, arms down, so the scene can crossfade
between them. The antenna light pulses by the scale of its own bone, `antenna_tip`
(not named after the mesh, so a lookup by name finds the mesh).
"""

import math
import os

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector
from mathutils.bvhtree import BVHTree

OUT_DIR = os.path.join(os.path.dirname(__file__), "../../public/models/hero-game")

HEIGHT = 0.6
FPS = 24

HEAD = Vector((0, 0, 0.505))
HEAD_HALF = Vector((0.222, 0.178, 0.178))
SCREEN_Z, SCREEN_HALF = 0.497, (0.178, 0.12)
EAR_Z = 0.49

ANTENNA_BASE, ANTENNA_TOP, BALL_R = 0.681, 0.81, 0.03

SHOULDER = Vector((0.112, 0, 0.28))
ARM_DROP = math.radians(50)
UPPER_ARM, FOREARM = 0.082, 0.076
CLAW_R, CLAW_TUBE = 0.027, 0.0135

LEG_X, HIP_Z, KNEE_Z, ANKLE_Z = 0.062, 0.13, 0.085, 0.035

COLOURS = {
    "shell": "#F4F4F2",
    "joints": "#1A1917",
    "screen": "#1A1917",
    "face": "#3FE0F0",
    "ears": "#E2372B",
    "ear_core": "#1A1917",
    "antenna_light": "#3FE0F0",
}


def arm_points(side):
    """Shoulder, elbow and wrist of one A-pose arm (side -1 is the robot's
    right, toward -X), and the direction the arm runs."""
    shoulder = Vector((side * SHOULDER.x, 0, SHOULDER.z))
    down = Vector((side * math.cos(ARM_DROP), 0, -math.sin(ARM_DROP)))
    elbow = shoulder + down * UPPER_ARM
    return shoulder, elbow, elbow + down * FOREARM, down


def skeleton():
    """name: (head, tail, parent), in modelling units; only `root` does not
    deform."""
    bones = {
        "root": ((0, 0, 0), (0, 0.12, 0), None),
        "hips": ((0, 0, HIP_Z), (0, 0, 0.18), "root"),
        "spine": ((0, 0, 0.18), (0, 0, 0.3), "hips"),
        "neck": ((0, 0, 0.3), (0, 0, 0.335), "spine"),
        "head": ((0, 0, 0.335), (0, 0, 0.6), "neck"),
        "antenna": ((0, 0, ANTENNA_BASE), (0, 0, ANTENNA_TOP), "head"),
        "antenna_tip": ((0, 0, ANTENNA_TOP), (0, 0, ANTENNA_TOP + 0.03), "antenna"),
    }
    for side, tag in ((1, "L"), (-1, "R")):
        shoulder, elbow, wrist, down = arm_points(side)
        x = side * LEG_X
        bones.update({
            f"shoulder.{tag}": ((side * 0.03, 0, SHOULDER.z), tuple(shoulder), "spine"),
            f"upper_arm.{tag}": (tuple(shoulder), tuple(elbow), f"shoulder.{tag}"),
            f"forearm.{tag}": (tuple(elbow), tuple(wrist), f"upper_arm.{tag}"),
            f"hand.{tag}": (tuple(wrist), tuple(wrist + down * 0.05), f"forearm.{tag}"),
            f"thigh.{tag}": ((x, 0, HIP_Z), (x, 0, KNEE_Z), "hips"),
            f"shin.{tag}": ((x, 0, KNEE_Z), (x, 0, ANKLE_Z), f"thigh.{tag}"),
            f"foot.{tag}": ((x, 0, ANKLE_Z), (x, -0.05, 0.012), f"shin.{tag}"),
        })
    return bones


BONES = skeleton()


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


def triangles(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


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


def rigid(obj, bone):
    """Skins every vertex of `obj` fully to `bone`."""
    group = obj.vertex_groups.get(bone) or obj.vertex_groups.new(name=bone)
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    return obj


def mesh_object(name, mesh):
    data = bpy.data.meshes.new(name)
    mesh.to_mesh(data)
    mesh.free()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return obj


def lathe(name, rings, segments=20, caps=(False, False)):
    """A quad shell swept round the Z axis through rings of (z, radius)."""
    mesh = bmesh.new()
    rows = []
    for z, r in rings:
        rows.append([
            mesh.verts.new((r * math.sin(2 * math.pi * k / segments), -r * math.cos(2 * math.pi * k / segments), z))
            for k in range(segments)
        ])
    for low, high in zip(rows, rows[1:]):
        for k in range(segments):
            k2 = (k + 1) % segments
            mesh.faces.new((low[k], low[k2], high[k2], high[k]))
    if caps[0]:
        mesh.faces.new(list(reversed(rows[0])))
    if caps[1]:
        mesh.faces.new(rows[-1])
    bmesh.ops.recalc_face_normals(mesh, faces=mesh.faces)
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


def capsule(start, end, radius, segments=14, rings=10):
    """A pill whose rounded ends lie exactly at `start` and `end`."""
    length = (Vector(end) - Vector(start)).length
    obj = sphere((0, 0, 0), (radius, radius, radius), segments, rings)
    for v in obj.data.vertices:
        v.co.z += radius + (max(length - 2 * radius, 0) if v.co.z > 0 else 0)
    obj.data.transform(along(start, end))
    return obj


def rounded_box(name, centre, half, power, cuts=9, taper=0.0):
    """A superellipsoid: a cube sphere with each coordinate raised to `power`
    (below 1 squares it off), so the vertices stay evenly spread. `taper`
    widens the top and narrows the bottom."""
    mesh = bmesh.new()
    bmesh.ops.create_cube(mesh, size=2)
    bmesh.ops.subdivide_edges(mesh, edges=mesh.edges[:], cuts=cuts, use_grid_fill=True)
    for v in mesh.verts:
        n = v.co.normalized()
        p = Vector([math.copysign(abs(c) ** power, c) * h for c, h in zip(n, half)])
        p.x *= 1 + taper * p.z / half[2]
        v.co = p + Vector(centre)
    return mesh_object(name, mesh)


def tube(name, points, radius, resolution=2):
    """A round tube along a polyline, capped at both ends."""
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = resolution
    curve.use_fill_caps = True
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, co in zip(spline.points, points):
        point.co = (*co, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    activate(obj)
    bpy.ops.object.convert(target="MESH")
    return bpy.context.active_object


def surface(obj):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    return BVHTree.FromObject(obj, depsgraph)


def onto(tree, x, z):
    """Where a ray from the front at (x, z) meets `tree`, and the normal."""
    hit, normal, _, _ = tree.ray_cast(Vector((x, -1, z)), Vector((0, 1, 0)))
    return hit, normal


def decal(name, tree, cx, cz, a, b, exponent, lift, sink, rings=5, segments=40):
    """A rounded patch laid on a surface: a superellipse of half-axes a, b
    round (cx, cz), seen from the front, raised `lift` off the surface along
    its normal, with a rim running `sink` back into it so its edge has a
    thickness."""
    mesh = bmesh.new()
    centre, normal = onto(tree, cx, cz)
    hub = mesh.verts.new(centre + normal * lift)
    rows = []
    for i in range(1, rings + 1):
        f = (i / rings) ** 0.7
        row = []
        for k in range(segments):
            t = 2 * math.pi * k / segments
            c, s = math.cos(t), math.sin(t)
            x = cx + f * a * math.copysign(abs(c) ** (2 / exponent), c)
            z = cz + f * b * math.copysign(abs(s) ** (2 / exponent), s)
            hit, n = onto(tree, x, z)
            row.append((mesh.verts.new(hit + n * lift), hit, n))
        rows.append(row)
    for k in range(segments):
        mesh.faces.new((hub, rows[0][(k + 1) % segments][0], rows[0][k][0]))
    for low, high in zip(rows, rows[1:]):
        for k in range(segments):
            k2 = (k + 1) % segments
            mesh.faces.new((low[k][0], low[k2][0], high[k2][0], high[k][0]))
    rim = [mesh.verts.new(hit - n * sink) for _, hit, n in rows[-1]]
    for k in range(segments):
        k2 = (k + 1) % segments
        mesh.faces.new((rows[-1][k][0], rows[-1][k2][0], rim[k2], rim[k]))
    bmesh.ops.recalc_face_normals(mesh, faces=mesh.faces)
    return mesh_object(name, mesh)


def build_head():
    """The head shell, its screen and the face drawn on it, all on `head`."""
    head = rounded_box("head", HEAD, HEAD_HALF, 0.55, cuts=10, taper=0.03)
    screen = decal("screen", surface(head), 0, SCREEN_Z, *SCREEN_HALF, 4.5, 0.004, 0.01, rings=6, segments=56)
    glass = surface(screen)
    eyes = [decal("eye", glass, s * 0.08, SCREEN_Z - 0.004, 0.031, 0.045, 2.6, 0.003, 0.003) for s in (-1, 1)]
    # The smile: a short arc hanging under the eyes.
    arc = []
    for i in range(11):
        t = math.radians(-50 + 10 * i)
        hit, n = onto(glass, 0.03 * math.sin(t), SCREEN_Z - 0.045 - 0.026 * math.cos(t))
        arc.append(hit + n * 0.004)
    smile = tube("smile", arc, 0.0055)
    face = join(eyes + [smile], "face")
    return rigid(head, "head"), rigid(screen, "head"), rigid(face, "head")


def build_ears():
    rings, cores = [], []
    for side in (-1, 1):
        place = Matrix.Translation((side * 0.205, 0.012, EAR_Z)) @ Matrix.Rotation(side * math.pi / 2, 4, "Y")
        ring = lathe(
            "ear",
            [(0.0, 0.07), (0.014, 0.085), (0.036, 0.089), (0.05, 0.082), (0.056, 0.068), (0.053, 0.053), (0.044, 0.048), (0.0, 0.047)],
            segments=28,
        )
        core = lathe(
            "core",
            [(0.0, 0.05), (0.046, 0.05), (0.052, 0.044), (0.056, 0.03), (0.058, 0.012)],
            segments=20,
            caps=(False, True),
        )
        for obj in (ring, core):
            obj.data.transform(place)
        rings.append(rigid(ring, "head"))
        cores.append(rigid(core, "head"))
    return join(rings, "ears"), join(cores, "ear_core")


def build_body():
    """The white shell of the body and limbs, and the black joints, hands
    and feet, each piece on its own bone."""
    torso = lathe(
        "torso",
        [
            (0.135, 0.03), (0.142, 0.052), (0.158, 0.068), (0.185, 0.079),
            (0.22, 0.086), (0.255, 0.088), (0.28, 0.083), (0.297, 0.07),
            (0.306, 0.05), (0.31, 0.025),
        ],
        segments=24,
        caps=(True, True),
    )
    # Slightly flatter front to back than side to side.
    torso.data.transform(Matrix.Scale(0.86, 4, (0, 1, 0)))
    shell = [rigid(torso, "spine")]
    joints = [rigid(sphere((0, 0, 0.317), (0.032, 0.032, 0.03), 14, 8), "neck")]

    for side, tag in ((1, "L"), (-1, "R")):
        shoulder, elbow, wrist, down = arm_points(side)
        shell.append(rigid(capsule(shoulder, elbow + down * 0.01, 0.024), f"upper_arm.{tag}"))
        shell.append(rigid(capsule(elbow - down * 0.012, wrist, 0.023), f"forearm.{tag}"))
        joints.append(rigid(sphere(shoulder, (0.028,) * 3, 14, 8), f"upper_arm.{tag}"))
        # The claw: a thick C in the front plane, open away from the wrist.
        across = Vector((-down.z, 0, down.x))
        centre = wrist + down * (CLAW_R + 0.003)
        gap = math.radians(55)
        arc = [
            centre + CLAW_R * (down * math.cos(a) + across * math.sin(a))
            for a in (gap + (2 * math.pi - 2 * gap) * i / 18 for i in range(19))
        ]
        claw = tube("claw", arc, CLAW_TUBE)
        stub = sphere(wrist + down * 0.002, (0.016,) * 3, 12, 6)
        joints.append(rigid(join([claw, stub], "hand"), f"hand.{tag}"))

        x = side * LEG_X
        shell.append(rigid(capsule((x, 0, HIP_Z - 0.005), (x, 0, KNEE_Z - 0.009), 0.03), f"thigh.{tag}"))
        shell.append(rigid(capsule((x, 0, KNEE_Z + 0.008), (x, 0, ANKLE_Z), 0.031), f"shin.{tag}"))
        joints.append(rigid(sphere((x, 0, HIP_Z + 0.004), (0.033, 0.031, 0.027), 14, 8), f"thigh.{tag}"))
        joints.append(rigid(sphere((x, 0, KNEE_Z), (0.027,) * 3, 12, 6), f"shin.{tag}"))
        foot = rounded_box("foot", (x, -0.014, 0.02), (0.034, 0.052, 0.022), 0.6, cuts=3)
        # A flat sole on the ground.
        for v in foot.data.vertices:
            v.co.z = max(v.co.z, 0.0)
        joints.append(rigid(foot, f"foot.{tag}"))

    dome = sphere((0, 0, ANTENNA_BASE), (0.036, 0.036, 0.02), 14, 6)
    stem = capsule((0, 0, ANTENNA_BASE), (0, 0, ANTENNA_TOP), 0.0105, 10, 6)
    joints.append(rigid(join([dome, stem], "antenna"), "antenna"))
    light = rigid(sphere((0, 0, ANTENNA_TOP), (BALL_R,) * 3, 16, 10), "antenna_tip")
    return join(shell, "body"), join(joints, "joints"), light


def finish(obj, name, **shading):
    """Names, smooths and colours one exported part. No textures, so the UVs
    go too: they would only split vertices along seams."""
    obj.name = name
    obj.data.name = name
    while obj.data.uv_layers:
        obj.data.uv_layers.remove(obj.data.uv_layers[0])
    obj.data.materials.clear()
    obj.data.materials.append(material(name, **shading))
    activate(obj)
    bpy.ops.object.shade_smooth()
    return obj


def build_armature(scale):
    data = bpy.data.armatures.new("rig")
    rig = bpy.data.objects.new("robot", data)
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


def turn(bone, axis, angle):
    """Turns a posed bone about an armature-space axis through its head."""
    head = bone.head.copy()
    bone.matrix = Matrix.Translation(head) @ Matrix.Rotation(angle, 4, axis) @ Matrix.Translation(-head) @ bone.matrix
    bpy.context.view_layer.update()


def bend(upper, lower, target, pole):
    """Two-bone IK by hand: bends upper and lower so the lower bone's tail
    lands on `target`, the middle joint swinging toward `pole`."""
    root = upper.head.copy()
    a, b = upper.length, lower.length
    offset = target - root
    c = min(offset.length, (a + b) * 0.999)
    u = offset.normalized()
    w = (pole - pole.dot(u) * u).normalized()
    angle = math.acos(max(-1, min(1, (a * a + c * c - b * b) / (2 * a * c))))
    joint = root + a * (math.cos(angle) * u + math.sin(angle) * w)
    aim(upper, root, joint - root)
    aim(lower, joint, target - joint)


def clear_pose(rig):
    for bone in rig.pose.bones:
        bone.rotation_quaternion = (1, 0, 0, 0)
        bone.location = (0, 0, 0)
        bone.scale = (1, 1, 1)
    bpy.context.view_layer.update()


def pulse(t, start, end):
    """0 outside [start, end], easing up to 1 and back down inside it."""
    if not start < t < end:
        return 0.0
    return math.sin(math.pi * (t - start) / (end - start)) ** 2


def ease(t, start, end):
    """0 before `start`, 1 after `end`, smoothstepped in between."""
    x = min(max((t - start) / (end - start), 0), 1)
    return x * x * (3 - 2 * x)


def rate(f, t, h=1e-3):
    """Derivative of a channel function, for the antenna's lag."""
    return (f(t + h) - f(t - h)) / (2 * h)


# Neutral arms, in the body's frame: hanging just clear of the torso, the
# elbows a touch back so the claws come forward.
ARM_DOWN = Vector((0.27, 0.04, -0.96))
FOREARM_DOWN = Vector((0.2, -0.42, -0.88))
# The waving arm reaches forward and out, the claw raised in front of the
# head's lower corner: under the head it would be hidden from above.
WAVE_UPPER = Vector((0.5, -0.8, 0.25))
WAVE_FOREARM = Vector((0.35, -0.75, 0.55))


def pose(rig, k, bob=0.0, lean=0.0, roll=0.0, look=0.0, nod=0.0, swing=0.0, raised=0.0, wave=0.0,
         glow=0.0, ant_pitch=0.0, ant_roll=0.0):
    """Poses the robot from a few channels, each 0 in the shared neutral pose
    every idle starts and ends on, so any idle can follow any other.

    bob runs -1..1: the body rises on straightening knees and settles on
    bent ones, the feet planted by IK. lean tips the body to his left; roll,
    look and nod tilt, turn and dip the head. swing lifts both arms a little
    off the body. raised brings the left arm up into the wave and wave
    rocks its forearm. glow swells the antenna light; ant_pitch and ant_roll
    bend the antenna on its base.
    """
    bones = rig.pose.bones
    clear_pose(rig)

    hips = bones["hips"]
    hips.matrix = Matrix.Translation(Vector((0, 0, -0.018 + 0.015 * bob)) * k) @ hips.matrix
    bpy.context.view_layer.update()
    turn(hips, "Y", -0.06 * lean)
    turn(bones["spine"], "X", -0.035 * bob)
    turn(bones["spine"], "Y", -0.05 * lean)
    head = bones["head"]
    turn(head, "Z", 0.55 * look)
    turn(head, "Y", 0.16 * roll)
    turn(head, "X", 0.1 * nod)
    turn(bones["antenna"], "X", ant_pitch)
    turn(bones["antenna"], "Y", ant_roll)
    bones["antenna_tip"].scale = (1 + 0.4 * glow,) * 3
    bpy.context.view_layer.update()

    spine = bones["spine"]
    body = spine.matrix.to_3x3() @ spine.bone.matrix_local.to_3x3().inverted()
    for side, tag in ((1, "L"), (-1, "R")):
        mirror = Vector((side, 1, 1))
        upper = ARM_DOWN * mirror + Vector((side * 0.12 * swing, 0, 0))
        fore = FOREARM_DOWN * mirror + Vector((side * 0.1 * swing, 0, 0))
        hand = fore.copy()
        if tag == "L" and raised:
            upper = upper.normalized().lerp(WAVE_UPPER.normalized(), raised)
            fore = fore.normalized().lerp(WAVE_FOREARM.normalized(), raised)
            # Biased outward: a full swing inward would touch the head.
            fore = Matrix.Rotation(0.32 * raised + 0.36 * wave, 3, "Y") @ fore
            hand = Matrix.Rotation(0.3 * wave, 3, "Y") @ fore
        shoulder = bones[f"shoulder.{tag}"].tail.copy()
        aim(bones[f"upper_arm.{tag}"], shoulder, body @ upper)
        aim(bones[f"forearm.{tag}"], bones[f"upper_arm.{tag}"].tail.copy(), body @ fore)
        aim(bones[f"hand.{tag}"], bones[f"forearm.{tag}"].tail.copy(), body @ hand)

    for tag in ("L", "R"):
        ankle = Vector(BONES[f"shin.{tag}"][1]) * k
        bend(bones[f"thigh.{tag}"], bones[f"shin.{tag}"], ankle, Vector((0, -1, 0)))
        foot_bone = bones[f"foot.{tag}"]
        rest_foot = foot_bone.bone.matrix_local.copy()
        rest_foot.translation = ankle
        foot_bone.matrix = rest_foot
        bpy.context.view_layer.update()


def breathe(t):
    """Three slow bobs and one sway each way; the antenna answers the bob
    and leans against the head's tilt."""
    bob = math.sin(6 * math.pi * t)
    roll = math.sin(2 * math.pi * t)
    return dict(
        bob=bob,
        roll=roll,
        look=0.12 * math.sin(4 * math.pi * t),
        nod=-0.4 * bob,
        swing=0.5 * bob,
        ant_pitch=0.14 * math.sin(6 * math.pi * t) + 0.05 * math.sin(12 * math.pi * t),
        ant_roll=-0.16 * roll + 0.05 * math.sin(10 * math.pi * t),
    )


def scan_look(t):
    return ease(t, 0.08, 0.24) - 2 * ease(t, 0.38, 0.58) + ease(t, 0.72, 0.9)


def scan(t):
    """Looks to his left, across to the right and back, the light pulsing
    while he holds each look; the antenna trails the turns."""
    look = scan_look(t)
    return dict(
        bob=0.5 * math.sin(4 * math.pi * t),
        look=look,
        roll=-0.6 * look,
        glow=pulse(t, 0.2, 0.42) + pulse(t, 0.54, 0.76),
        ant_roll=-0.035 * rate(scan_look, t),
        ant_pitch=0.06 * math.sin(4 * math.pi * t),
    )


def wave_raise(t):
    return ease(t, 0.06, 0.26) * (1 - ease(t, 0.74, 0.94))


def waving(t):
    """Raises the left claw beside his face, waves it and puts it back."""
    raised = wave_raise(t)
    wave = raised * math.sin(12 * math.pi * t)
    return dict(
        bob=0.5 * math.sin(4 * math.pi * t),
        raised=raised,
        wave=wave,
        lean=0.5 * raised,
        # The head rocks in time with the claw: at board size it is the
        # head, not the small claw, that reads.
        roll=-0.55 * raised + 0.4 * wave,
        nod=-0.4 * raised,
        glow=0.5 * raised,
        ant_roll=-0.12 * wave - 0.02 * rate(wave_raise, t),
        ant_pitch=0.06 * math.sin(4 * math.pi * t),
    )


IDLES = {"idle_breathe": (breathe, 6), "idle_scan": (scan, 4), "idle_wave": (waving, 4)}


def fcurves(action):
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                yield from bag.fcurves


def animate(rig, scale, name, channels, seconds, step=2):
    """Keys one looping idle every `step` frames; the last key repeats the
    first. Quaternions are kept on one hemisphere from key to key, or the
    interpolation would spin a bone the long way round. The action is left
    unassigned with a fake user; the exporter's ACTIONS mode writes every
    action that animates this armature as its own animation."""
    data = rig.animation_data or rig.animation_data_create()
    data.action = None
    frames = seconds * FPS
    last = {}
    for frame in range(0, frames + 1, step):
        pose(rig, scale, **channels(frame / frames % 1))
        for bone in rig.pose.bones:
            q = bone.rotation_quaternion.copy()
            if bone.name in last and last[bone.name].dot(q) < 0:
                q.negate()
                bone.rotation_quaternion = q
            last[bone.name] = q
            bone.keyframe_insert("rotation_quaternion", frame=frame)
            bone.keyframe_insert("location", frame=frame)
            if bone.name == "antenna_tip":
                bone.keyframe_insert("scale", frame=frame)
    action = data.action
    action.name = name
    # Cyclic curves get cycle-aware handles, so the velocity carries straight
    # through the seam instead of easing to a stop on the first and last key.
    for curve in fcurves(action):
        curve.modifiers.new("CYCLES")
        curve.update()
    action.use_fake_user = True
    data.action = None


def bake_occlusion(parts, skip, distance=0.06, strength=0.6, floor=0.55):
    """Bakes a light ambient occlusion into each part's `ao` vertex colours,
    with the whole robot present so the head shades the shoulders and the
    body the arms. Kept light: open surfaces stay white, the deepest creases
    come out near `floor`."""
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
        export_all_vertex_colors=False,
        # Keyed every 2 frames; sampled every 2 too, so nothing is invented
        # between keys and the file stays small.
        export_frame_step=2,
    )


def build_robot():
    reset()
    head, screen, face = build_head()
    ears, ear_core = build_ears()
    shell, joints, light = build_body()
    parts = [
        finish(join([head, shell], "shell"), "shell", roughness=0.25),
        finish(joints, "joints", roughness=0.3),
        finish(screen, "screen", roughness=0.12),
        finish(face, "face", roughness=0.3, emission=3.0),
        finish(ears, "ears", roughness=0.3),
        finish(ear_core, "ear_core", roughness=0.3),
        finish(light, "antenna_light", roughness=0.2, emission=3.0),
    ]

    # Modelled by eye, then sized so the robot stands exactly HEIGHT tall.
    top = max(v.co.z for obj in parts for v in obj.data.vertices)
    scale = HEIGHT / top
    for obj in parts:
        obj.data.transform(Matrix.Scale(scale, 4))

    rig = build_armature(scale)
    for obj in parts:
        obj.parent = rig
        obj.modifiers.new("rig", "ARMATURE").object = rig
    # Baked in the neutral pose every idle passes through, not the A-pose.
    pose(rig, scale)
    bake_occlusion(parts, skip={"face", "antenna_light"}, distance=0.06 * scale)
    for name, (channels, seconds) in IDLES.items():
        animate(rig, scale, name, channels, seconds)
    clear_pose(rig)

    for obj in parts:
        print(f"{obj.name:14s} {triangles(obj):6d} tris")
    print(f"{'total':14s} {sum(triangles(o) for o in parts):6d} tris")
    export(rig, parts, "robot")


build_robot()

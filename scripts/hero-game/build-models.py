"""Builds the hero game's models as GLB files: the stone plate and block, the
fir, the boulder, the bridge and the scout's chest of coins.

Run headless:  blender -b --python scripts/hero-game/build-models.py

Each stone piece is a low-poly bevelled box. A dense copy of it is chipped
along the edges, as a sculpt would be, and its stone grain and relief are
baked onto the low-poly box as a colour map and a normal map. The colour map
is kept light and neutral: the scene tints every plate from the design
palette.
"""

import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector, noise

OUT_DIR = os.path.join(os.path.dirname(__file__), "../../public/models/hero-game")
SIZE = 1024


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 16


def unwrap_as_cross(obj):
    """Top face as one whole island with the sides unfolded around it.

    Seams run down the four vertical edges and round the bottom face, so the
    visible top carries the stone without a cut and the bottom is set aside.
    Done before the bevel, which then inherits the layout.
    """
    bpy.ops.object.mode_set(mode="EDIT")
    mesh = bmesh.from_edit_mesh(obj.data)
    for edge in mesh.edges:
        a, b = (v.co for v in edge.verts)
        vertical = abs(a.z - b.z) > 1e-6
        bottom = a.z < 0 and b.z < 0
        edge.seam = vertical or bottom
    bmesh.update_edit_mesh(obj.data)
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.unwrap(method="ANGLE_BASED", margin=0.02)
    # Angle-based unwrapping can lay the cross on a diagonal; square it up.
    bpy.ops.uv.select_all(action="SELECT")
    bpy.ops.uv.align_rotation(method="AUTO")
    bpy.ops.uv.pack_islands(rotate=False, margin=0.02)
    bpy.ops.object.mode_set(mode="OBJECT")


def bevelled_box(name, width, height, depth, bevel):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (width, depth, height)
    bpy.ops.object.transform_apply(scale=True)
    unwrap_as_cross(obj)
    mod = obj.modifiers.new("bevel", "BEVEL")
    mod.width = bevel
    mod.segments = 3
    mod.limit_method = "ANGLE"
    bpy.ops.object.modifier_apply(modifier=mod.name)
    # Flat faces keep flat normals and only the bevel is smoothed; a fully
    # smoothed box bakes shading gradients into the map that read as smudges.
    bpy.ops.object.shade_smooth_by_angle(angle=0.5)
    return obj


def stone_material(name, low, high, grain):
    """Procedural stone: broad mottling over a fine grain."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()

    coord = nodes.new("ShaderNodeTexCoord")
    mottle = nodes.new("ShaderNodeTexNoise")
    mottle.inputs["Scale"].default_value = 2.5
    mottle.inputs["Detail"].default_value = 4
    fine = nodes.new("ShaderNodeTexNoise")
    fine.inputs["Scale"].default_value = grain
    fine.inputs["Detail"].default_value = 10
    fine.inputs["Roughness"].default_value = 0.65
    for tex in (mottle, fine):
        links.new(coord.outputs["Object"], tex.inputs["Vector"])

    mix = nodes.new("ShaderNodeMix")
    mix.data_type = "FLOAT"
    mix.inputs["Factor"].default_value = 0.45
    links.new(mottle.outputs["Fac"], mix.inputs["A"])
    links.new(fine.outputs["Fac"], mix.inputs["B"])

    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.3
    ramp.color_ramp.elements[0].color = (low, low, low, 1)
    ramp.color_ramp.elements[1].position = 0.7
    ramp.color_ramp.elements[1].color = (high, high, high, 1)
    links.new(mix.outputs["Result"], ramp.inputs["Fac"])

    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.12
    bump.inputs["Distance"].default_value = 0.02
    links.new(mix.outputs["Result"], bump.inputs["Height"])

    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    out = nodes.new("ShaderNodeOutputMaterial")
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def chipped_copy(low, voxel, band, depth):
    """A dense copy of `low` with a few chunks knocked out of its edges.

    Only vertices near two faces at once (an edge) or three (a corner) move,
    pushed inward where a coarse, high-contrast noise turns dark, so most of
    each edge stays whole and the flat faces stay flat.
    """
    high = low.copy()
    high.data = low.data.copy()
    bpy.context.collection.objects.link(high)
    bpy.context.view_layer.objects.active = high
    remesh = high.modifiers.new("remesh", "REMESH")
    remesh.mode = "VOXEL"
    remesh.voxel_size = voxel
    bpy.ops.object.modifier_apply(modifier=remesh.name)

    half = [d / 2 for d in high.dimensions]
    group = high.vertex_groups.new(name="edges")
    for v in high.data.vertices:
        gaps = sorted(h - abs(c) for h, c in zip(half, v.co))
        weight = max(0.0, 1 - gaps[1] / band)
        if weight > 0:
            group.add([v.index], weight, "REPLACE")

    texture = bpy.data.textures.new("chips", "CLOUDS")
    texture.noise_scale = band * 3.5
    texture.noise_depth = 1
    texture.intensity = 1.6
    texture.contrast = 3.5
    displace = high.modifiers.new("chips", "DISPLACE")
    displace.texture = texture
    displace.texture_coords = "OBJECT"
    displace.vertex_group = "edges"
    displace.mid_level = 1.0
    displace.strength = depth
    bpy.ops.object.modifier_apply(modifier=displace.name)
    # Rounds off the voxel staircase in the chips; the faces stay untouched.
    smooth = high.modifiers.new("smooth", "SMOOTH")
    smooth.factor = 0.9
    smooth.iterations = 12
    smooth.vertex_group = "edges"
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    bpy.ops.object.shade_smooth()
    return high


def bake_from(low, high, name):
    """Bakes the chipped copy's colour and relief onto `low`, then drops it."""
    target = bpy.data.materials.new(f"{name}_target")
    target.use_nodes = True
    low.data.materials.clear()
    low.data.materials.append(target)
    nodes, links = target.node_tree.nodes, target.node_tree.links

    bpy.ops.object.select_all(action="DESELECT")
    high.select_set(True)
    low.select_set(True)
    bpy.context.view_layer.objects.active = low
    common = dict(
        use_selected_to_active=True,
        cage_extrusion=0.06,
        max_ray_distance=0.15,
        margin=8,
    )
    images = {}
    for kind in ("color", "normal"):
        image = bpy.data.images.new(f"{name}_{kind}", SIZE, SIZE)
        if kind == "normal":
            image.colorspace_settings.name = "Non-Color"
        node = nodes.new("ShaderNodeTexImage")
        node.image = image
        nodes.active = node
        if kind == "color":
            # Base colour alone, unlit: an emission bake across objects comes
            # out black here.
            bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"}, **common)
        else:
            bpy.ops.object.bake(type="NORMAL", normal_space="TANGENT", **common)
        images[kind] = image
        nodes.remove(node)
    bpy.data.objects.remove(high)

    nodes.clear()
    final = nodes.new("ShaderNodeBsdfPrincipled")
    final.inputs["Roughness"].default_value = 0.9
    color_tex = nodes.new("ShaderNodeTexImage")
    color_tex.image = images["color"]
    normal_tex = nodes.new("ShaderNodeTexImage")
    normal_tex.image = images["normal"]
    normal_map = nodes.new("ShaderNodeNormalMap")
    result = nodes.new("ShaderNodeOutputMaterial")
    links.new(color_tex.outputs["Color"], final.inputs["Base Color"])
    links.new(normal_tex.outputs["Color"], normal_map.inputs["Color"])
    links.new(normal_map.outputs["Normal"], final.inputs["Normal"])
    links.new(final.outputs["BSDF"], result.inputs["Surface"])


def build(name, width, height, depth, bevel, low, high, grain, chips):
    reset()
    box = bevelled_box(name, width, height, depth, bevel)
    sculpt = chipped_copy(box, **chips)
    sculpt.data.materials.clear()
    sculpt.data.materials.append(stone_material(name, low, high, grain))
    bake_from(box, sculpt, name)
    export([box], name)


def flat_material(name):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (0.8, 0.8, 0.8, 1)
    mat.roughness = 0.85
    return mat


def jitter(obj, amount, seed):
    """Nudges every vertex a little, so the facets look cut by hand."""
    for v in obj.data.vertices:
        offset = noise.noise_vector(v.co * 4 + Vector((seed, seed, seed)))
        v.co += offset * amount


def export(objects, name):
    """The scene uses bare geometry, so each object's placement is baked in."""
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    os.makedirs(OUT_DIR, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT_DIR, f"{name}.glb"),
        export_format="GLB",
        use_selection=True,
        export_image_format="JPEG",
        export_jpeg_quality=85,
    )


def build_fir():
    """Four faceted tiers on a short trunk, one unit tall. Two objects, named
    `foliage` and `trunk`, so the scene can colour each from the palette."""
    reset()
    tiers = []
    for i, (radius, z) in enumerate([(0.44, 0.24), (0.37, 0.44), (0.29, 0.62), (0.2, 0.79)]):
        bpy.ops.mesh.primitive_cone_add(
            vertices=7, radius1=radius, radius2=radius * 0.3, depth=0.3 - i * 0.02,
            location=(0, 0, z), rotation=(0, 0, i * 0.7),
        )
        tiers.append(bpy.context.active_object)
    bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=0.09, radius2=0, depth=0.2, location=(0, 0, 0.98))
    tiers.append(bpy.context.active_object)
    bpy.ops.object.select_all(action="DESELECT")
    for tier in tiers:
        tier.select_set(True)
    bpy.context.view_layer.objects.active = tiers[0]
    bpy.ops.object.join()
    foliage = bpy.context.active_object
    foliage.name = "foliage"
    jitter(foliage, 0.025, 1)
    bpy.ops.object.shade_flat()
    foliage.data.materials.append(flat_material("foliage"))

    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.06, depth=0.16, location=(0, 0, 0.08))
    trunk = bpy.context.active_object
    trunk.name = "trunk"
    bpy.ops.object.shade_flat()
    trunk.data.materials.append(flat_material("trunk"))
    export([foliage, trunk], "fir")


def build_boulder():
    """A boulder and a pebble, as in the reference: the boulder a handful of
    broad flat facets with softly rounded edges, the pebble a smooth lump.

    Two objects, `boulder` (about 0.6 across, 0.4 high) and `pebble`.
    """
    reset()
    rng = noise.random
    noise.seed_set(7)
    # A convex hull round a few points on a squat ellipsoid gives large facets.
    points = []
    for _ in range(16):
        theta, phi = rng() * math.tau, math.acos(rng() * 1.6 - 0.6)
        points.append((
            0.32 * math.sin(phi) * math.cos(theta),
            0.26 * math.sin(phi) * math.sin(theta),
            0.24 * math.cos(phi) + 0.12,
        ))
    mesh = bpy.data.meshes.new("boulder")
    hull = bmesh.new()
    for point in points:
        hull.verts.new(point)
    bmesh.ops.convex_hull(hull, input=hull.verts)
    hull.to_mesh(mesh)
    hull.free()
    boulder = bpy.data.objects.new("boulder", mesh)
    bpy.context.collection.objects.link(boulder)
    bpy.context.view_layer.objects.active = boulder
    boulder.select_set(True)
    bevel = boulder.modifiers.new("soft", "BEVEL")
    bevel.width = 0.035
    bevel.segments = 3
    bevel.limit_method = "ANGLE"
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))
    boulder.data.materials.append(flat_material("boulder"))

    bpy.ops.mesh.primitive_cube_add(size=0.2, location=(0.3, 0.2, 0.06))
    pebble = bpy.context.active_object
    pebble.name = "pebble"
    pebble.scale = (1.1, 0.9, 0.62)
    subsurf = pebble.modifiers.new("round", "SUBSURF")
    subsurf.levels = 2
    bpy.ops.object.modifier_apply(modifier=subsurf.name)
    jitter(pebble, 0.012, 3)
    bpy.ops.object.shade_smooth()
    pebble.data.materials.append(flat_material("pebble"))
    export([boulder, pebble], "boulder")


def wood_material(name):
    """Procedural grain: long bands with a little wobble, kept light and grey."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    coord = nodes.new("ShaderNodeTexCoord")
    stretch = nodes.new("ShaderNodeMapping")
    stretch.inputs["Scale"].default_value = (1, 6, 6)
    links.new(coord.outputs["Object"], stretch.inputs["Vector"])
    bands = nodes.new("ShaderNodeTexWave")
    # Stripes run along the plank, as the grain of a sawn board does.
    bands.bands_direction = "Y"
    bands.inputs["Scale"].default_value = 3
    bands.inputs["Distortion"].default_value = 5
    bands.inputs["Detail"].default_value = 3
    links.new(stretch.outputs["Vector"], bands.inputs["Vector"])
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.62, 0.62, 0.62, 1)
    ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    links.new(bands.outputs["Fac"], ramp.inputs["Fac"])
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.3
    links.new(bands.outputs["Fac"], bump.inputs["Height"])
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    out = nodes.new("ShaderNodeOutputMaterial")
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def bake_onto_itself(obj, name, size=256, unwrap=True):
    """Bakes an object's own procedural material into colour and normal maps."""
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    if unwrap:
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.03)
        bpy.ops.object.mode_set(mode="OBJECT")

    mat = obj.data.materials[0]
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    images = {}
    for kind in ("color", "normal"):
        image = bpy.data.images.new(f"{name}_{kind}", size, size)
        if kind == "normal":
            image.colorspace_settings.name = "Non-Color"
        node = nodes.new("ShaderNodeTexImage")
        node.image = image
        nodes.active = node
        if kind == "color":
            bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"}, margin=4)
        else:
            bpy.ops.object.bake(type="NORMAL", normal_space="TANGENT", margin=4)
        images[kind] = image
        nodes.remove(node)

    nodes.clear()
    final = nodes.new("ShaderNodeBsdfPrincipled")
    final.inputs["Roughness"].default_value = 0.85
    color = nodes.new("ShaderNodeTexImage")
    color.image = images["color"]
    normal_tex = nodes.new("ShaderNodeTexImage")
    normal_tex.image = images["normal"]
    normal_map = nodes.new("ShaderNodeNormalMap")
    result = nodes.new("ShaderNodeOutputMaterial")
    links.new(color.outputs["Color"], final.inputs["Base Color"])
    links.new(normal_tex.outputs["Color"], normal_map.inputs["Color"])
    links.new(normal_map.outputs["Normal"], final.inputs["Normal"])
    links.new(final.outputs["BSDF"], result.inputs["Surface"])


def board(size, location, rotation=(0, 0, 0), bevel=0.012):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    mod = obj.modifiers.new("bevel", "BEVEL")
    mod.width = bevel
    mod.segments = 2
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def join(objects, name):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = name
    return joined


def build_bridge():
    """Three planks laid along X over two cross beams, 1.3 long, top at z=0."""
    reset()
    parts = []
    for i, y in enumerate((-0.28, 0, 0.28)):
        parts.append(
            board(
                (1.3 + (i % 2) * 0.06, 0.25, 0.05),
                (0.02 * (i - 1), y, -0.025),
                rotation=(0.02 * (i - 1), 0, 0.015 * (1 - i)),
            )
        )
    for x in (-0.5, 0.5):
        parts.append(board((0.12, 0.86, 0.06), (x, 0, -0.08)))
    planks = join(parts, "planks")
    bpy.ops.object.shade_flat()
    planks.data.materials.append(wood_material("planks"))
    bake_onto_itself(planks, "planks")
    export([planks], "bridge")


def minted_coin():
    """A coin rather than a disc: a rounded rim round a sunken field on each face."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.065, depth=0.02)
    coin = bpy.context.active_object
    bpy.ops.object.mode_set(mode="EDIT")
    mesh = bmesh.from_edit_mesh(coin.data)
    # Insetting the two faces leaves them as the fields; the ring is the rim.
    fields = [f for f in mesh.faces if abs(f.normal.z) > 0.9]
    bmesh.ops.inset_individual(mesh, faces=fields, thickness=0.009, use_even_offset=True)
    for face in fields:
        for v in face.verts:
            v.co.z -= 0.0025 if v.co.z > 0 else -0.0025
    bmesh.update_edit_mesh(coin.data)
    bpy.ops.object.mode_set(mode="OBJECT")
    # Smooth shading shares every vertex; at a coin's size the soft edge reads
    # as a rounded rim and keeps the heap a fraction of the weight.
    bpy.ops.object.shade_smooth()
    return coin


def half_drum(radius, length, location, shell=0.0):
    """A half-cylinder lying along X, flat side down at `location`.

    With `shell`, the flat side is left open and the curve and the two ends
    are given that thickness inward: a hollow lid rather than a solid one.
    """
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=16, radius=radius, depth=length, location=location,
        rotation=(0, math.pi / 2, 0),
    )
    drum = bpy.context.active_object
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.bisect(
        plane_co=location, plane_no=(0, 0, 1), use_fill=not shell, clear_inner=True
    )
    bpy.ops.object.mode_set(mode="OBJECT")
    if shell:
        solidify = drum.modifiers.new("shell", "SOLIDIFY")
        solidify.thickness = shell
        solidify.offset = -1
        bpy.ops.object.modifier_apply(modifier=solidify.name)
    return drum


def build_chest():
    """A plain, toy-like chest: a hollow body of solid walls on a plinth with a light
    rim, two iron straps and a lock with a ring on the front, and a plain
    barrel lid swung right back over a dome of coins.

    Four plain-coloured objects the scene tints on its own: `wood`, `trim`,
    `iron` and `gold`.
    """
    reset()
    W, D, H = 0.56, 0.36, 0.3
    rng = noise.random

    # Hollow: four solid walls on a floor.
    T = 0.035
    planks = [board((W - 0.02, D - 0.02, 0.02), (0, 0, 0.05), bevel=0.004)]
    for sy in (-1, 1):
        planks.append(board((W, T, H), (0, sy * (D - T) / 2, H / 2), bevel=0.014))
    for sx in (-1, 1):
        planks.append(board((T, D - 2 * T, H), (sx * (W - T) / 2, 0, H / 2), bevel=0.014))
    # The lid is built shut at the origin, then hinged on the back of the rim
    # and swung back past upright.
    hinge = (
        Matrix.Translation((0, D / 2, H))
        @ Matrix.Rotation(-1.95, 4, "X")
        @ Matrix.Translation((0, -D / 2, 0))
    )
    lid = half_drum(D / 2, W, (0, 0, 0), shell=0.025)
    lid.data.transform(hinge)
    wood = join(planks + [lid], "wood")

    trim = join(
        [
            board((W + 0.04, D + 0.04, 0.045), (0, 0, 0.0225), bevel=0.01),
        ]
        # The rim: a frame round the opening, not a lid over it.
        + [board((W + 0.03, 0.045, 0.035), (0, sy * (D / 2 - 0.0075), H - 0.0175), bevel=0.008) for sy in (-1, 1)]
        + [board((0.045, D - 0.06, 0.035), (sx * (W / 2 - 0.0075), 0, H - 0.0175), bevel=0.008) for sx in (-1, 1)],
        "trim",
    )

    iron_parts = [
        board((0.06, 0.014, H - 0.02), (x, -(D / 2 + 0.007), H / 2), bevel=0.006)
        for x in (-0.16, 0.16)
    ]
    iron_parts.append(board((0.1, 0.016, 0.07), (0, -D / 2 - 0.01, H - 0.03), bevel=0.006))
    iron = join(iron_parts, "iron")

    gold_parts = []
    bpy.ops.mesh.primitive_torus_add(
        major_segments=16, minor_segments=6,
        major_radius=0.022, minor_radius=0.005, location=(0, -D / 2 - 0.02, H - 0.085),
        rotation=(math.pi / 2, 0, 0),
    )
    gold_parts.append(bpy.context.active_object)

    mint = minted_coin()
    coins = []

    def drop(location, tilt=(0.0, 0.0)):
        coin = mint.copy()
        coin.data = mint.data.copy()
        bpy.context.collection.objects.link(coin)
        coin.location = location
        coin.rotation_euler = (tilt[0], tilt[1], rng() * math.tau)
        coins.append(coin)

    # The hoard: a low gold dome filling the chest, and coins laid on it, each
    # resting on the surface and tipped to its slope, so none floats.
    hw, hd = W / 2 - T, D / 2 - T
    top, rise = H - 0.035, 0.07

    def surface(x, y):
        return top + rise * max(0.0, 1 - (x / hw) ** 2) * max(0.0, 1 - (y / hd) ** 2)

    bpy.ops.mesh.primitive_grid_add(x_subdivisions=12, y_subdivisions=8, size=1)
    hoard = bpy.context.active_object
    for v in hoard.data.vertices:
        v.co.x *= 2 * hw
        v.co.y *= 2 * hd
        v.co.z = surface(v.co.x, v.co.y)
    bpy.ops.object.shade_smooth()
    gold_parts.append(hoard)

    for _ in range(24):
        x, y = (rng() - 0.5) * 1.7 * hw, (rng() - 0.5) * 1.7 * hd
        e = 0.01
        slope_x = (surface(x + e, y) - surface(x - e, y)) / (2 * e)
        slope_y = (surface(x, y + e) - surface(x, y - e)) / (2 * e)
        drop(
            (x, y, surface(x, y) + 0.008),
            (math.atan(slope_y) + (rng() - 0.5) * 0.2, -math.atan(slope_x) + (rng() - 0.5) * 0.2),
        )
    # A spill by the front left corner: a neat stack and a few lying flat.
    for k in range(4):
        drop((-0.22, -0.3, 0.01 + k * 0.02))
    for x, y in ((-0.3, -0.22), (-0.13, -0.32), (-0.29, -0.39), (-0.07, -0.25)):
        drop((x, y, 0.01))
    bpy.data.objects.remove(mint)
    gold = join(gold_parts + coins, "gold")

    export_parts = []
    for obj in (wood, trim, iron, gold):
        # Plain colour, no grain: without UVs no vertex is split along a seam.
        while obj.data.uv_layers:
            obj.data.uv_layers.remove(obj.data.uv_layers[0])
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))
        obj.data.materials.append(flat_material(obj.name))
        export_parts.append(obj)
    export(export_parts, "chest")


# A unit-high block: the scene stretches it to each cell's depth.
build(
    "plate", 0.96, 0.14, 0.96, 0.015, 0.78, 1.0, 14,
    chips=dict(voxel=0.004, band=0.07, depth=-0.05),
)
build(
    "block", 0.99, 1.0, 0.99, 0.025, 0.7, 0.95, 9,
    chips=dict(voxel=0.008, band=0.08, depth=-0.06),
)
build_fir()
build_boulder()
build_bridge()
build_chest()

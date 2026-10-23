"""Bakes the hero game's island, light and all, into a few meshes — the
stone, the chest, the rocks, the firs — each with its own texture.

    blender -b --python scripts/hero-game/bake-island.py

Input is island-source.glb, saved from the "Bake source" story: the live
island exactly as the scene lays it out, with its lights. Cycles renders the
full lighting — soft shadows, bounce light, the shade in every seam — onto a
fresh UV atlas, and the result ships as public/models/hero-game/island.glb,
which the scene draws unlit. Props get textures of their own: in the stone's
atlas they had a few pixels each and their seams bled dark. Everything bakes
in one scene, so props still shade the stone. Re-run after re-saving the source.

    PREVIEW=1 blender -b --python scripts/hero-game/bake-island.py

renders the lit island from the scene's camera instead, in seconds, for
tuning the lights below before a full bake.
"""

import math
import os

import bpy

HERE = os.path.dirname(__file__)
SOURCE = os.path.join(HERE, "island-source.glb")
OUT = os.path.join(HERE, "../../public/models/hero-game/island.glb")
SIZE = 2048
# Each prop kind, by the name of its group in the scene, and its texture size.
PROPS = {"chest": 1024, "rock": 1024, "tree": 1024}
SAMPLES = 256

# Light power, in Blender's units: three.js and Cycles measure light
# differently, so the values are set here by eye rather than converted.
SUN = 5
POINTS = {"warm": 380, "cold": 3200, "chest": 30}
AMBIENT = 2.0
GOLD_GLOW = 0.3
PREVIEW = os.environ.get("PREVIEW") == "1"


def setup():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = SAMPLES
    # A bake stores plain light values; the preview must show the same.
    scene.view_settings.view_transform = "Standard"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    try:
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for device in prefs.devices:
            device.use = True
        scene.cycles.device = "GPU"
    except TypeError:
        scene.cycles.device = "CPU"

    world = bpy.data.worlds.new("ambient")
    world.use_nodes = True
    background = world.node_tree.nodes["Background"]
    background.inputs["Color"].default_value = (0.3, 0.3, 0.3, 1)
    background.inputs["Strength"].default_value = AMBIENT
    scene.world = world


def import_source():
    bpy.ops.import_scene.gltf(filepath=SOURCE)
    for obj in list(bpy.context.scene.objects):
        if obj.type == "LIGHT":
            tune(obj)
        elif obj.type != "MESH":
            # Empties left by the export's groups; their transforms are
            # already carried by the meshes once parents are cleared below.
            continue


def tune(light):
    data = light.data
    if data.type == "SUN":
        data.energy = SUN
        # A wide, soft sun: a sharp one draws a hard bright line on every bevel.
        data.angle = math.radians(30)
        return
    data.shadow_soft_size = 0.4
    # Named in the scene's Lights and Chest; Blender may add a .001 suffix.
    key = light.name.split(".")[0]
    if key not in POINTS:
        raise SystemExit(f"bake: unknown light {light.name!r}; name it in the scene")
    data.energy = POINTS[key]


def matte():
    """Everything bakes as a dull, diffuse surface: a bake keeps diffuse light
    only, and a metal has none, so iron and gold would come out black. The
    gold also glows faintly in its own colour, so the coins stay bright yellow
    however deep the chest's shade."""
    for material in bpy.data.materials:
        bsdf = material.node_tree and material.node_tree.nodes.get("Principled BSDF")
        if not bsdf:
            continue
        bsdf.inputs["Metallic"].default_value = 0.0
        bsdf.inputs["Roughness"].default_value = 1.0
        bsdf.inputs["Specular IOR Level"].default_value = 0.15
        r, g, b, _ = bsdf.inputs["Base Color"].default_value
        if material.name.split(".")[0] == "gold":
            bsdf.inputs["Emission Color"].default_value = (r, g, b * 1.6, 1)
            bsdf.inputs["Emission Strength"].default_value = GOLD_GLOW


def under(obj, name):
    while obj:
        if obj.name.startswith(name):
            return True
        obj = obj.parent
    return False


def merge(meshes, name):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    merged = bpy.context.active_object
    merged.name = name
    return merged


def merge_meshes():
    """The stone and each prop kind, each joined into one mesh, with its size."""
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    groups = {kind: [o for o in meshes if under(o, kind)] for kind in PROPS}
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.ops.object.make_single_user(object=True, obdata=True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    props = {o for group in groups.values() for o in group}
    stone = [o for o in meshes if o not in props]
    return [(merge(stone, "island"), SIZE)] + [
        (merge(group, kind), PROPS[kind]) for kind, group in groups.items() if group
    ]


def preview():
    """A quick render from the scene's camera: three.js (10, 11, 10) looking at
    the origin is (10, -10, 11) in Blender's Z-up axes."""
    from mathutils import Vector

    cam = bpy.data.objects.new("camera", bpy.data.cameras.new("camera"))
    bpy.context.scene.collection.objects.link(cam)
    cam.location = (10, -10, 11)
    cam.rotation_euler = (Vector((0, 0, 0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.angle_y = math.radians(30)
    scene = bpy.context.scene
    scene.camera = cam
    scene.cycles.samples = 48
    scene.render.resolution_x = scene.render.resolution_y = 700
    scene.render.filepath = os.path.join(HERE, "../../.playwright-mcp/island-preview.png")
    bpy.ops.render.render(write_still=True)


def atlas(island):
    """A second UV map that gives every face its own spot in the bake."""
    bpy.ops.object.select_all(action="DESELECT")
    island.select_set(True)
    bpy.context.view_layer.objects.active = island
    # The chest is plain colour and has no map of its own.
    own = island.data.uv_layers.active
    textures = own.name if own else None
    baked = island.data.uv_layers.new(name="bake")
    # Baking writes through the active map; the stone's own textures keep
    # reading the render map.
    island.data.uv_layers.active = baked
    if textures:
        island.data.uv_layers[textures].active_render = True
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.006)
    bpy.ops.uv.pack_islands(margin=0.006)
    bpy.ops.object.mode_set(mode="OBJECT")
    return textures


def bake(island, size):
    image = bpy.data.images.new(island.name, size, size)
    for slot in island.material_slots:
        nodes = slot.material.node_tree.nodes
        node = nodes.new("ShaderNodeTexImage")
        node.image = image
        nodes.active = node
    bpy.ops.object.select_all(action="DESELECT")
    island.select_set(True)
    bpy.context.view_layer.objects.active = island
    # Diffuse light only: a glossy pass would freeze one viewpoint's
    # highlights into the texture.
    bpy.ops.object.bake(
        type="COMBINED",
        pass_filter={"DIRECT", "INDIRECT", "DIFFUSE", "EMIT"},
        margin=16,
    )
    return image


def flatten(island, image, textures):
    """One material showing the bake through the atlas, and only that map."""
    # Removed by name: a layer handle goes stale once another map is added.
    if textures:
        island.data.uv_layers.remove(island.data.uv_layers[textures])
    material = bpy.data.materials.new(island.name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    bsdf = nodes["Principled BSDF"]
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    material.node_tree.links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    island.data.materials.clear()
    island.data.materials.append(material)


def export(parts):
    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=OUT,
        export_format="GLB",
        use_selection=True,
        export_image_format="JPEG",
        export_jpeg_quality=88,
        export_normals=False,
    )


setup()
import_source()
matte()
if PREVIEW:
    preview()
else:
    parts = merge_meshes()
    for part, size in parts:
        textures = atlas(part)
        flatten(part, bake(part, size), textures)
    export([part for part, _ in parts])

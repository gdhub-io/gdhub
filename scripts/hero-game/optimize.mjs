// Shrinks the hero game's shipped models in place, after a Blender build or a
// bake:  bun scripts/hero-game/optimize.mjs
//
// Characters: animations resampled, every attribute quantised, geometry
// meshopt-compressed. The island: the same, plus its baked textures as WebP —
// the atlas at 1536 and the props at 512, which is all they get on screen.
// Measured against the originals the difference is under 1/255 per pixel.
// The scene registers the meshopt decoder for these. Safe to run twice.

import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
	dedup,
	meshopt,
	prune,
	quantize,
	resample,
	textureCompress,
} from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";

const DIR = new URL("../../public/models/hero-game/", import.meta.url).pathname;
const CHARACTERS = ["sage", "designer", "programmer", "artist", "robot", "scout"];

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
	"meshopt.encoder": MeshoptEncoder,
	"meshopt.decoder": MeshoptDecoder,
});

const shrink = async (name, steps) => {
	const file = `${DIR}${name}.glb`;
	const doc = await io.read(file);
	await doc.transform(
		prune(),
		dedup(),
		...steps,
		quantize(),
		meshopt({ encoder: MeshoptEncoder, level: "high" }),
	);
	const size = Bun.file(file).size;
	await io.write(file, doc);
	console.log(`${name}.glb  ${Math.round(size / 1024)} KB → ${Math.round(Bun.file(file).size / 1024)} KB`);
};

for (const name of CHARACTERS) await shrink(name, [resample()]);

const webp = (pattern, size) =>
	textureCompress({
		encoder: sharp,
		targetFormat: "webp",
		quality: 90,
		resize: [size, size],
		pattern,
	});
await shrink("island", [webp(/chest|rock|tree/, 512), webp(/island/, 1536)]);

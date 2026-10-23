"use client";

import { Canvas } from "@react-three/fiber";
import { Button } from "antd";
import { Suspense, useRef } from "react";
import type { Group } from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { Island, Lights } from "./index";

/**
 * Saves the live island and its lights as island-source.glb, the input of
 * scripts/hero-game/bake-island.py. The island's layout — every plate's height,
 * tilt and tint — is computed here, so the bake starts from this very scene.
 */
export const BakeSource = () => {
	const scene = useRef<Group>(null);

	const save = async () => {
		if (!scene.current) return;
		const glb = (await new GLTFExporter().parseAsync(scene.current, {
			binary: true,
		})) as ArrayBuffer;
		const link = document.createElement("a");
		link.href = URL.createObjectURL(new Blob([glb]));
		link.download = "island-source.glb";
		link.click();
		URL.revokeObjectURL(link.href);
	};

	return (
		<div style={{ height: 600, position: "relative" }}>
			<Canvas camera={{ position: [10, 11, 10], fov: 30 }}>
				<group ref={scene}>
					<Lights />
					<Suspense fallback={null}>
						<Island />
					</Suspense>
				</group>
			</Canvas>
			<Button
				type="primary"
				onClick={save}
				style={{
					position: "absolute",
					top: "var(--gd-space-4)",
					left: "var(--gd-space-4)",
				}}
			>
				Save island-source.glb
			</Button>
		</div>
	);
};

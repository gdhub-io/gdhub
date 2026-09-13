"use client";

import { CuratorStep } from "@/components/checkpoints/start/CuratorStep";
import { ProjectSpace } from "@/components/spaces/ProjectSpace";

export default function CheckpointStartCuratorPage() {
	return (
		<ProjectSpace>
			<CuratorStep />
		</ProjectSpace>
	);
}

"use client";

import { StartStepPage } from "@/components/checkpoints/start/StartStepPage";
import { ProjectSpace } from "@/components/spaces/ProjectSpace";

export default function CheckpointStartInputsPage() {
	return (
		<ProjectSpace>
			<StartStepPage step="now" />
		</ProjectSpace>
	);
}

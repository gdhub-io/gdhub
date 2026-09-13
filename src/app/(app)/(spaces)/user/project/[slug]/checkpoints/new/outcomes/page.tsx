"use client";

import { StartStepPage } from "@/components/checkpoints/start/StartStepPage";
import { ProjectSpace } from "@/components/spaces/ProjectSpace";

export default function CheckpointStartOutcomesPage() {
	return (
		<ProjectSpace>
			<StartStepPage step="goal" />
		</ProjectSpace>
	);
}

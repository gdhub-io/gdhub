"use client";

import { useParams } from "next/navigation";
import { CheckpointDetail } from "@/components/checkpoints/CheckpointDetail";
import { useCheckpointHero } from "@/components/checkpoints/hero";
import { ProjectSpace } from "@/components/spaces/ProjectSpace";
import { useCheckpoint } from "@/hooks/checkpoints";

export default function ProjectCheckpointPage() {
	const params = useParams();
	const { data: checkpoint } = useCheckpoint(params?.id as string | undefined);
	const hero = useCheckpointHero(checkpoint);

	return (
		<ProjectSpace {...hero}>
			<CheckpointDetail />
		</ProjectSpace>
	);
}

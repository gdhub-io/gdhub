"use client";

import { Skeleton } from "antd";
import { useParams } from "next/navigation";
import { CheckpointDetail } from "@/components/checkpoints/CheckpointDetail";
import { useCheckpointHero } from "@/components/checkpoints/hero";
import { Error404 } from "@/components/Error404";
import { ProjectSpace } from "@/components/spaces/ProjectSpace";
import { useCheckpoint } from "@/hooks/checkpoints";

export default function ProjectCheckpointPage() {
	const params = useParams();
	const { data: checkpoint, isLoading } = useCheckpoint(
		params?.id as string | undefined,
	);
	const hero = useCheckpointHero(checkpoint);

	return (
		<ProjectSpace {...hero}>
			{isLoading ? (
				<Skeleton active paragraph={{ rows: 8 }} />
			) : checkpoint ? (
				<CheckpointDetail checkpoint={checkpoint} />
			) : (
				<Error404 />
			)}
		</ProjectSpace>
	);
}

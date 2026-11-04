"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, message } from "antd";
import axios from "axios";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import { ProjectSpace } from "@/components/spaces/ProjectSpace";
import { ProjectStatus } from "@/config/prisma-enums";
import { useCurrentProject } from "@/hooks/project";
import { ArtifactsView } from "./ArtifactsView";
import { type ArtifactListItem, isBeingChecked } from "./artifacts";
import { ReplaceLinkModal } from "./ReplaceLinkModal";

const CreateArtifactModal = dynamic(
	() => import("@/components/modals/CreateArtifactModal"),
	{ ssr: false },
);

const MyProjectArtifacts = () => {
	const { t } = useTranslate();
	const { can } = useAccess();
	const { project } = useCurrentProject();
	const [adding, setAdding] = useState(false);
	const [replacing, setReplacing] = useState<ArtifactListItem | null>(null);

	const canManage =
		can("project.artifacts.manage") &&
		!!project &&
		project.status !== ProjectStatus.Archived;

	const {
		data: artifacts = [],
		refetch,
		isPending,
		isError,
	} = useQuery({
		queryKey: ["project-artifacts", project?.id],
		queryFn: async () =>
			(
				await axios.get<ArtifactListItem[]>("/api/user/project/artifacts", {
					params: { projectId: project?.id },
				})
			).data,
		enabled: !!project?.id,
		refetchOnWindowFocus: false,
		// The check runs after the save returns; poll while one is on its way.
		// A check that died is left to the cron, not to this page.
		refetchInterval: (query) =>
			query.state.data?.some((artifact) => isBeingChecked(artifact))
				? 5000
				: false,
	});

	const { mutate: deleteArtifact } = useMutation({
		mutationFn: (id: string) =>
			axios.delete(`/api/user/project/artifacts/${id}`),
		onSuccess: () => {
			refetch();
			message.success(t("artifacts.deleted", "Artifact deleted"));
		},
	});

	const workflow = project?.workflow;
	const stageName = workflow?.steps.find(
		(step) => step.id === workflow.currentStepId,
	)?.name;

	return (
		<ProjectSpace
			title={t("artifacts.page.title", "Artifacts")}
			description={t(
				"artifacts.page.description",
				"Project builds, videos, images and documents.",
			)}
			actions={
				canManage && (
					<Button type="primary" onClick={() => setAdding(true)}>
						{t("artifacts.add", "Add artifact")}
					</Button>
				)
			}
		>
			<ArtifactsView
				artifacts={artifacts}
				status={isError ? "error" : isPending ? "loading" : "ready"}
				canManage={canManage}
				onRetry={refetch}
				onDelete={deleteArtifact}
				onReplace={setReplacing}
			/>

			<ReplaceLinkModal
				artifact={replacing}
				onClose={() => setReplacing(null)}
				onReplaced={() => {
					setReplacing(null);
					refetch();
				}}
			/>

			{canManage && (
				<CreateArtifactModal
					open={adding}
					projectId={project?.id}
					stageName={stageName}
					onCancel={() => setAdding(false)}
					onCreate={() => {
						setAdding(false);
						refetch();
					}}
				/>
			)}
		</ProjectSpace>
	);
};

export default MyProjectArtifacts;

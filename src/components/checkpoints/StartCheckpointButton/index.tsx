"use client";

import { IconLock, IconPlus } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Tooltip } from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useAccess } from "@/components/access/AccessProvider";
import { useCheckpoints, useCreateCheckpoint } from "@/hooks/checkpoints";

export type StartCheckpointButtonProps = {
	projectId?: string;
	projectSlug?: string;
};

/**
 * Lives in the page hero (frame `iSVBs`) and again in the empty state, where it
 * is the only thing on the screen. One component so the two cannot drift, and
 * so the reason it is disabled is written once.
 */
export function StartCheckpointButton({
	projectId,
	projectSlug,
}: StartCheckpointButtonProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const { can } = useAccess();
	const router = useRouter();

	const { data } = useCheckpoints(projectId);
	const createCheckpoint = useCreateCheckpoint(projectId);

	if (!can("project.checkpoints.create")) return null;

	const blocker = data?.blocker;
	const blockedUntil =
		blocker?.reason === "checkpointOpen" && blocker.checkpoint.dueAt
			? dayjs(blocker.checkpoint.dueAt).format("D MMMM")
			: null;

	const reason = blockedUntil
		? t(
				"checkpoints.start.disabled",
				"One checkpoint at a time. This one ends {date}.",
				{ date: blockedUntil },
			)
		: blocker?.reason === "noStage"
			? t(
					"checkpoints.start.noStage",
					"The project is not on a workflow stage yet.",
				)
			: undefined;

	const start = async () => {
		try {
			await createCheckpoint.mutateAsync();
			router.push(`/user/project/${projectSlug}/checkpoints/new/inputs`);
		} catch {
			message.error(
				t("checkpoints.start.failed", "The checkpoint could not be started"),
			);
		}
	};

	return (
		<Tooltip title={reason}>
			<Button
				type="primary"
				icon={reason ? <IconLock size={15} /> : <IconPlus size={15} />}
				disabled={!data?.canCreate}
				loading={createCheckpoint.isPending}
				onClick={start}
			>
				{t("checkpoints.start", "Start a checkpoint")}
			</Button>
		</Tooltip>
	);
}

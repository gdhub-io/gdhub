"use client";

import { IconLock } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Tooltip } from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useAccess } from "@/components/access/AccessProvider";
import { useCheckpoints, useCreateCheckpoint } from "@/hooks/checkpoints";

export type StartCheckpointButtonProps = {
	projectId?: string;
	projectSlug?: string;
	/** Defaults to the first-checkpoint wording of the empty list. */
	label?: string;
};

/**
 * The one way into a checkpoint, on the empty screen where it is the only thing
 * to press (frame `J0pS4h`). It carries the reason it is disabled, because that
 * reason — a checkpoint already running, or no workflow stage — is the whole
 * answer to why nothing happens when you want to start one.
 */
export function StartCheckpointButton({
	projectId,
	projectSlug,
	label,
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
				"checkpoints.prepare.disabled",
				"One checkpoint at a time. This one ends {date}.",
				{ date: blockedUntil },
			)
		: blocker?.reason === "noStage"
			? t(
					"checkpoints.prepare.noStage",
					"The project is not on a workflow stage yet.",
				)
			: undefined;

	const start = async () => {
		try {
			const checkpoint = await createCheckpoint.mutateAsync();
			router.push(`/user/project/${projectSlug}/checkpoints/${checkpoint.id}`);
		} catch {
			message.error(
				t("checkpoints.prepare.failed", "The checkpoint could not be started"),
			);
		}
	};

	return (
		<Tooltip title={reason}>
			<Button
				type="primary"
				icon={reason ? <IconLock size={16} /> : undefined}
				disabled={!data?.canCreate}
				loading={createCheckpoint.isPending}
				onClick={start}
			>
				{label ?? t("checkpoints.empty.cta", "Plan my first checkpoint")}
			</Button>
		</Tooltip>
	);
}

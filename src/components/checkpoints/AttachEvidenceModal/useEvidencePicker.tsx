"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { App } from "antd";
import { useState } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import { useCheckpoint, useDetachEvidence } from "@/hooks/checkpoints";
import { AttachEvidenceModal } from ".";

/** What whoever manages the checkpoint can do to a task's evidence from the plan. */
export type EvidenceActions = {
	attach: (itemId: string) => void;
	detach: (artifactId: string, itemId: string) => void;
};

/**
 * The plan's evidence on Path to Checkpoint: the modal, and the way to add or
 * let go of an artifact — none for whoever may not manage the checkpoint. The
 * page's own plan is read again after either.
 */
export const useEvidencePicker = (checkpointId: string) => {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const { can } = useAccess();
	const canAttach = can("project.checkpoints.manage");
	const queryClient = useQueryClient();
	// Only whoever may attach loads the checkpoint the modal needs.
	const { data: checkpoint } = useCheckpoint(
		canAttach ? checkpointId : undefined,
	);
	const detach = useDetachEvidence(checkpointId);
	// The task the modal was opened from, ticked in it; null while closed.
	const [forItem, setForItem] = useState<string | null>(null);

	const refresh = () => {
		for (const key of ["checkpoint-review", "checkpoint-call"]) {
			queryClient.invalidateQueries({ queryKey: [key, checkpointId] });
		}
	};

	if (!checkpoint || !canAttach) {
		return { actions: undefined, modal: null };
	}
	return {
		actions: {
			attach: setForItem,
			detach: (artifactId, itemId) =>
				detach.mutate(
					{ artifactId, itemId },
					{
						onSuccess: refresh,
						onError: () =>
							message.error(
								t(
									"checkpoints.evidence.detachFailed",
									"The artifact could not be removed from the task",
								),
							),
					},
				),
		} satisfies EvidenceActions,
		modal: (
			<AttachEvidenceModal
				key={forItem ?? "closed"}
				open={forItem !== null}
				checkpoint={checkpoint}
				ticked={forItem ? [forItem] : []}
				onClose={() => {
					setForItem(null);
					refresh();
				}}
			/>
		),
	};
};

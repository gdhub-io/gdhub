"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import { useCheckpoint } from "@/hooks/checkpoints";
import { AttachEvidenceModal } from ".";

/**
 * The plan's "attach an artifact" on Path to Checkpoint: the modal, and the way
 * to open it — none for whoever may not manage the checkpoint. The page's own
 * plan is read again once the modal closes.
 */
export const useEvidencePicker = (checkpointId: string) => {
	const { can } = useAccess();
	const canAttach = can("project.checkpoints.manage");
	const queryClient = useQueryClient();
	// Only whoever may attach loads the checkpoint the modal needs.
	const { data: checkpoint } = useCheckpoint(
		canAttach ? checkpointId : undefined,
	);
	const [open, setOpen] = useState(false);

	if (!checkpoint || !canAttach) {
		return { open: undefined, modal: null };
	}
	return {
		open: () => setOpen(true),
		modal: (
			<AttachEvidenceModal
				open={open}
				checkpoint={checkpoint}
				onClose={() => {
					setOpen(false);
					for (const key of ["checkpoint-review", "checkpoint-call"]) {
						queryClient.invalidateQueries({ queryKey: [key, checkpointId] });
					}
				}}
			/>
		),
	};
};

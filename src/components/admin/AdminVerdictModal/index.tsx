"use client";

import { Modal, Skeleton } from "antd";
import { VerdictModalView } from "@/components/advisor/VerdictModal";
import {
	useAdminVerdict,
	useSendAdminVerdict,
} from "@/hooks/admin-checkpoints";

/** Frames 11.8 / 11.8b: the curator's verdict dialog, written by an administrator. */
export function AdminVerdictModal({
	checkpointId,
	onClose,
}: {
	checkpointId: string;
	onClose: () => void;
}) {
	const { data } = useAdminVerdict(checkpointId);
	const send = useSendAdminVerdict(checkpointId);

	if (!data)
		return (
			<Modal open footer={null} onCancel={onClose} width={1048} centered>
				<Skeleton active paragraph={{ rows: 10 }} />
			</Modal>
		);

	return (
		<VerdictModalView
			checkpoint={data.checkpoint}
			context={data.context}
			project={data.project}
			onClose={onClose}
			admin={{
				missed: data.missed,
				send: send.mutateAsync,
				sending: send.isPending,
			}}
		/>
	);
}

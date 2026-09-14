"use client";

import { PaymentStep } from "@/components/checkpoints/start/PaymentStep";
import { ProjectSpace } from "@/components/spaces/ProjectSpace";

export default function CheckpointStartPayPage() {
	return (
		<ProjectSpace>
			<PaymentStep />
		</ProjectSpace>
	);
}

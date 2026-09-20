import type { Metadata } from "next";
import { AdvisorSpace } from "@/components/spaces/AdvisorSpace";
import { AdvisorCheckpointClient } from "./AdvisorCheckpointClient";

export const metadata: Metadata = {
	title: "Checkpoint",
	robots: { index: false, follow: false },
};

export default async function AdvisorCheckpointPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	return (
		<AdvisorSpace>
			<AdvisorCheckpointClient id={id} />
		</AdvisorSpace>
	);
}

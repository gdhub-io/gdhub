import type { Metadata } from "next";
import { AdvisorSpace } from "@/components/spaces/AdvisorSpace";
import { AdvisorCheckpointsClient } from "./AdvisorCheckpointsClient";

export const metadata: Metadata = {
	title: "Checkpoints",
	robots: { index: false, follow: false },
	alternates: { canonical: "/advisor/checkpoints" },
};

export default function AdvisorCheckpointsPage() {
	return (
		<AdvisorSpace>
			<AdvisorCheckpointsClient />
		</AdvisorSpace>
	);
}

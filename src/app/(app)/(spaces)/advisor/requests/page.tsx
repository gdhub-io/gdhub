import type { Metadata } from "next";
import { AdvisorSpace } from "@/components/spaces/AdvisorSpace";
import { AdvisorRequestsClient } from "./AdvisorRequestsClient";

export const metadata: Metadata = {
	title: "Advice requests",
	robots: { index: false, follow: false },
	alternates: { canonical: "/advisor/requests" },
};

export default function AdvisorRequestsPage() {
	return (
		<AdvisorSpace>
			<AdvisorRequestsClient />
		</AdvisorSpace>
	);
}

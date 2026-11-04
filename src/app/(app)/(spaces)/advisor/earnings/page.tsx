import type { Metadata } from "next";
import { AdvisorSpace } from "@/components/spaces/AdvisorSpace";
import { AdvisorEarningsClient } from "./AdvisorEarningsClient";

export const metadata: Metadata = {
	title: "Earnings",
	robots: { index: false, follow: false },
	alternates: { canonical: "/advisor/earnings" },
};

export default function AdvisorEarningsPage() {
	return (
		<AdvisorSpace>
			<AdvisorEarningsClient />
		</AdvisorSpace>
	);
}

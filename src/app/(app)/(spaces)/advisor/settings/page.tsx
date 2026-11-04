import type { Metadata } from "next";
import { AdvisorSpace } from "@/components/spaces/AdvisorSpace";
import { AdvisorSettingsClient } from "./AdvisorSettingsClient";

export const metadata: Metadata = {
	title: "Advisor settings",
	robots: { index: false, follow: false },
	alternates: { canonical: "/advisor/settings" },
};

export default function AdvisorSettingsPage() {
	return (
		<AdvisorSpace>
			<AdvisorSettingsClient />
		</AdvisorSpace>
	);
}

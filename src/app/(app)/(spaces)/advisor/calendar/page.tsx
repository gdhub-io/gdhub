import type { Metadata } from "next";
import { AdvisorSpace } from "@/components/spaces/AdvisorSpace";
import { AdvisorCalendarClient } from "./AdvisorCalendarClient";

export const metadata: Metadata = {
	title: "Calendar",
	robots: { index: false, follow: false },
	alternates: { canonical: "/advisor/calendar" },
};

export default function AdvisorCalendarPage() {
	return (
		<AdvisorSpace>
			<AdvisorCalendarClient />
		</AdvisorSpace>
	);
}

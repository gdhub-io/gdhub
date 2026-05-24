import type { Metadata } from "next";
import { JobsClient } from "./JobsClient";

export const metadata: Metadata = {
	title: "Open positions",
	description: "for enterprising specialists in the gaming industry",
	alternates: { canonical: "/jobs" },
	openGraph: {
		type: "website",
		url: "/jobs",
		title: "Open positions",
		description: "for enterprising specialists in the gaming industry",
	},
};

export default function JobsPage() {
	return <JobsClient />;
}

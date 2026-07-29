import type { Metadata } from "next";
import HubJobsClient from "./HubJobsClient";

export const metadata: Metadata = {
	title: "Jobs",
	robots: { index: false, follow: false },
	alternates: { canonical: "/hub/jobs" },
	openGraph: { type: "website", url: "/hub/jobs", title: "Jobs" },
};

export default function HubJobsPage() {
	return <HubJobsClient />;
}

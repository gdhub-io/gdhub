import type { Metadata } from "next";
import HubProjectsClient from "./HubProjectsClient";

export const metadata: Metadata = {
	title: "Projects",
	robots: { index: false, follow: false },
	alternates: { canonical: "/hub/projects" },
	openGraph: { type: "website", url: "/hub/projects", title: "Projects" },
};

export default function HubProjectsPage() {
	return <HubProjectsClient />;
}

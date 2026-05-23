import type { Metadata } from "next";
import HubExpertsClient from "./HubExpertsClient";

export const metadata: Metadata = {
	title: "Experts",
	description:
		"On this page, you can find experts who are ready to help with your questions.",
	robots: { index: false, follow: false },
	alternates: { canonical: "/hub/experts" },
	openGraph: { type: "website", url: "/hub/experts", title: "Experts" },
};

export default function HubExpertsPage() {
	return <HubExpertsClient />;
}

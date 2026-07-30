import type { Metadata } from "next";
import HubClient from "./HubClient";

export const metadata: Metadata = {
	title: "Hub",
	robots: { index: false, follow: false },
	alternates: { canonical: "/hub" },
	openGraph: { type: "website", url: "/hub", title: "Hub" },
};

export default function HubPage() {
	return <HubClient />;
}

import type { Metadata } from "next";
import MyEventsClient from "./MyEventsClient";

export const metadata: Metadata = {
	title: "My Events",
	robots: { index: false, follow: false },
	alternates: { canonical: "/hub/events/my" },
	openGraph: { type: "website", url: "/hub/events/my", title: "My Events" },
};

export default function MyEventsPage() {
	return <MyEventsClient />;
}

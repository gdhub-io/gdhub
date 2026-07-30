import type { Metadata } from "next";
import EventsClient from "./EventsClient";

export const metadata: Metadata = {
	title: "Events",
	robots: { index: false, follow: false },
	alternates: { canonical: "/hub/events" },
	openGraph: { type: "website", url: "/hub/events", title: "Events" },
};

export default function HubEventsPage() {
	return <EventsClient />;
}

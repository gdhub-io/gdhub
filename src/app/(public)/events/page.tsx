import type { Metadata } from "next";
import { EventsClient } from "./EventsClient";

export const metadata: Metadata = {
	title: "Events",
	alternates: { canonical: "/events" },
	openGraph: { type: "website", url: "/events", title: "Events" },
};

export default function EventsPage() {
	return <EventsClient />;
}

import type { Metadata } from "next";
import { loadEventCatalogue } from "@/repositories/event/catalogue";
import EventsClient from "./EventsClient";

export const metadata: Metadata = {
	title: "Events",
	robots: { index: false, follow: false },
	alternates: { canonical: "/hub/events" },
	openGraph: { type: "website", url: "/hub/events", title: "Events" },
};

export default async function HubEventsPage() {
	return <EventsClient events={await loadEventCatalogue()} />;
}

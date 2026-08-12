import type { Metadata } from "next";
import { loadEventCatalogue } from "@/repositories/event-catalogue";
import { EventsClient } from "./EventsClient";

export const metadata: Metadata = {
	title: "Events",
	alternates: { canonical: "/events" },
	openGraph: { type: "website", url: "/events", title: "Events" },
};

export default async function EventsPage() {
	return <EventsClient events={await loadEventCatalogue()} />;
}

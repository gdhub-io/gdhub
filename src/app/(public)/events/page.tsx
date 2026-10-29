import type { Metadata } from "next";
import { loadEventCatalogue } from "@/repositories/event/catalogue";
import { EventsClient } from "./EventsClient";

export const metadata: Metadata = {
	title: "Events",
	alternates: { canonical: "/events" },
	openGraph: { type: "website", url: "/events", title: "Events" },
};

// Without it the page is prerendered once at build and never shows a new event.
export const revalidate = 300;

export default async function EventsPage() {
	return <EventsClient events={await loadEventCatalogue()} />;
}

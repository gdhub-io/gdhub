import type { Metadata } from "next";
import MyEventsClient from "./MyEventsClient";

export const metadata: Metadata = {
	title: "My Events",
	robots: { index: false, follow: false },
	alternates: { canonical: "/user/events" },
	openGraph: { type: "website", url: "/user/events", title: "My Events" },
};

export default function MyEventsPage() {
	return <MyEventsClient />;
}

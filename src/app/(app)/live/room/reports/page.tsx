import type { Metadata } from "next";
import ReportsClient from "./ReportsClient";

export const metadata: Metadata = {
	title: "Live Reports",
	robots: { index: false, follow: false },
	alternates: { canonical: "/live/room/reports" },
	openGraph: {
		type: "website",
		url: "/live/room/reports",
		title: "Live Reports",
	},
};

export default function LiveReportsPage() {
	return <ReportsClient />;
}

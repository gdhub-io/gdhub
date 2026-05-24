import type { Metadata } from "next";
import LecturesClient from "./LecturesClient";

export const metadata: Metadata = {
	title: "Lectures",
	robots: { index: false, follow: false },
	alternates: { canonical: "/hub/lectures" },
	openGraph: { type: "website", url: "/hub/lectures", title: "Lectures" },
};

export default function HubLecturesPage() {
	return <LecturesClient />;
}

import type { Metadata } from "next";
import HubCoursesClient from "./HubCoursesClient";

export const metadata: Metadata = {
	title: "Courses",
	robots: { index: false, follow: false },
	alternates: { canonical: "/hub/courses" },
	openGraph: { type: "website", url: "/hub/courses", title: "Courses" },
};

export default function HubCoursesPage() {
	return <HubCoursesClient />;
}

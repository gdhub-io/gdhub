import type { Metadata } from "next";
import MyCoursesClient from "./MyCoursesClient";

export const metadata: Metadata = {
	title: "My Courses",
	robots: { index: false, follow: false },
	alternates: { canonical: "/hub/courses/my" },
	openGraph: { type: "website", url: "/hub/courses/my", title: "My Courses" },
};

export default function MyCoursesPage() {
	return <MyCoursesClient />;
}

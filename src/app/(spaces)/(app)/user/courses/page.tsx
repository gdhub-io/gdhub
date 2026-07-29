import type { Metadata } from "next";
import MyCoursesClient from "./MyCoursesClient";

export const metadata: Metadata = {
	title: "My Courses",
	robots: { index: false, follow: false },
	alternates: { canonical: "/user/courses" },
	openGraph: { type: "website", url: "/user/courses", title: "My Courses" },
};

export default function MyCoursesPage() {
	return <MyCoursesClient />;
}

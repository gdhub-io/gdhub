import type { Metadata } from "next";
import CourseClient from "./CourseClient";

type Params = { slug: string };

export async function generateMetadata({
	params,
}: {
	params: Promise<Params>;
}): Promise<Metadata> {
	const { slug } = await params;
	return {
		title: "Course",
		robots: { index: false, follow: false },
		alternates: { canonical: `/hub/courses/${slug}` },
		openGraph: {
			type: "article",
			url: `/hub/courses/${slug}`,
			title: "Course",
		},
	};
}

export default function CoursePage() {
	return <CourseClient />;
}

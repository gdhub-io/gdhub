import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { findPublishedCourse } from "@/repositories/public-course";
import { CoursePageClient } from "./CoursePageClient";

type Params = Promise<{ slug: string }>;

const loadCourse = cache(findPublishedCourse);

// Rendered on the first visit, then served from cache and refreshed at most
// every 5 minutes.
export const revalidate = 300;

export async function generateStaticParams() {
	return [];
}

export async function generateMetadata({
	params,
}: {
	params: Params;
}): Promise<Metadata> {
	const course = await loadCourse((await params).slug);
	if (!course) return { title: "Course" };
	return {
		title: course.name,
		description: course.shortLine ?? course.description ?? undefined,
		alternates: { canonical: `/course/${course.slug}` },
	};
}

export default async function CoursePage({ params }: { params: Params }) {
	const course = await loadCourse((await params).slug);
	if (!course) notFound();

	// Dates as strings, the shape the client was written against.
	return <CoursePageClient course={JSON.parse(JSON.stringify(course))} />;
}

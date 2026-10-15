import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { findPublishedCourse } from "@/repositories/public-course";
import { CoursePageClient } from "./CoursePageClient";

type Params = Promise<{ slug: string }>;

const loadCourse = cache(findPublishedCourse);

export const revalidate = 300;

// Empty: each page is built on its first request, not during `next build`.
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

	// Only what the page shows; curriculums and groups stay out of the payload.
	const { id, image, description } = course;
	return <CoursePageClient course={{ id, image, description }} />;
}

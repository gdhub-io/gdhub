import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import {
	resolveSpaceAccess,
	type SpaceAccessUser,
} from "@/helpers/space-access";

/**
 * Course space — server-side access gate (course creator, or enrolled student).
 * Auth and the app chrome come from the parent (app) layout.
 */
export default async function CourseSpaceLayout({
	children,
	params,
}: {
	children: ReactNode;
	params: Promise<{ courseId: string }>;
}) {
	const { courseId } = await params;
	const session = await auth();
	const access = await resolveSpaceAccess(
		"course",
		courseId,
		(session?.user ?? null) as SpaceAccessUser,
	);
	if (access === "none") notFound();

	return <>{children}</>;
}

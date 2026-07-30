import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import {
	resolveSpaceAccess,
	type SpaceAccessUser,
} from "@/helpers/space-access";

/**
 * Project space — server-side access gate (author / team member): 404s
 * unauthorized users before any client code mounts. Auth and the app chrome
 * come from the parent (app) layout; the project tabs come from ProjectSpace.
 */
export default async function ProjectSpaceLayout({
	children,
	params,
}: {
	children: ReactNode;
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const session = await auth();
	const access = await resolveSpaceAccess(
		"project",
		slug,
		(session?.user ?? null) as SpaceAccessUser,
	);
	if (access === "none") notFound();
	return <>{children}</>;
}

import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import {
	resolveSpaceAccess,
	type SpaceAccessUser,
} from "@/helpers/space-access";

/**
 * Event space — server-side access gate (event creator, or platform Admin). The
 * client ProtectedEventLayout renders the shell for allowed users; this gate
 * 404s unauthorized users first. Auth is enforced by (spaces).
 */
export default async function EventSpaceLayout({
	children,
	params,
}: {
	children: ReactNode;
	params: Promise<{ eventId: string }>;
}) {
	const { eventId } = await params;
	const session = await auth();
	const access = await resolveSpaceAccess(
		"event",
		eventId,
		(session?.user ?? null) as SpaceAccessUser,
	);
	if (access === "none") notFound();
	return <>{children}</>;
}

import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import {
	resolveSpaceAccess,
	type SpaceAccessUser,
} from "@/helpers/space-access";

/**
 * Event space — server-side access gate (event creator, or platform Admin):
 * 404s unauthorized users before any client code mounts. Auth and the app
 * chrome come from the parent (app) layout; the event tabs come from EventSpace.
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

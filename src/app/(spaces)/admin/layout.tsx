import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import {
	resolveSpaceAccess,
	type SpaceAccessUser,
} from "@/helpers/space-access";

/**
 * Admin space — server-side access gate (platform Admin role). Defence in depth
 * on top of the client AdminLayout's role check. Auth (session) is enforced by
 * the parent (spaces) layout.
 */
export default async function AdminSpaceLayout({
	children,
}: {
	children: ReactNode;
}) {
	const session = await auth();
	const access = await resolveSpaceAccess(
		"admin",
		null,
		(session?.user ?? null) as SpaceAccessUser,
	);
	if (access === "none") notFound();
	return <>{children}</>;
}

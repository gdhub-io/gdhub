import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import {
	resolveSpaceAccess,
	type SpaceAccessUser,
} from "@/helpers/space-access";

/**
 * Admin space — the access gate for the whole area: only the platform Admin
 * role gets in, everyone else gets a 404. Auth and the app chrome come from the
 * parent (app) layout; the admin navigation comes from AdminSpace.
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

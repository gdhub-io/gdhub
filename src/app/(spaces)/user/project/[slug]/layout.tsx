import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import {
	resolveSpaceAccess,
	type SpaceAccessUser,
} from "@/helpers/space-access";

/**
 * Project space — server-side access gate (author / team member). The client
 * ProtectedProjectLayout still renders the shell for allowed users; this gate
 * 404s unauthorized users before the shell mounts. Auth is enforced by (spaces).
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

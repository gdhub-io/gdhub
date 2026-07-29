import type { ReactNode } from "react";
import { requireSession } from "@/helpers/require-session";

/**
 * Authenticated "spaces" area — auth gate only (no visual shell).
 *
 * The shared app chrome (header + nav) lives in the nested (app) group. Full-page
 * spaces (project, event, admin) bring their OWN immersive shell, so they sit
 * outside (app) and are not double-wrapped by ProtectedShell.
 */
export default async function SpacesLayout({
	children,
}: {
	children: ReactNode;
}) {
	await requireSession();
	return <>{children}</>;
}

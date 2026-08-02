import type { ReactNode } from "react";
import { ChatProvider } from "@/components/Chat/ChatProvider";
import { ProtectedShell } from "@/components/layouts/ProtectedShell";
import { SpaceHeaderProvider } from "@/components/layouts/SpaceHeader";
import { requireSession } from "@/helpers/require-session";

/**
 * Authenticated application root: the session gate plus everything shared by
 * every page inside it — chat, and the global app chrome (header + navigation)
 * used by profile, live and the nested (spaces) group (hub, user spaces, admin,
 * dev). Spaces publish their own breadcrumbs/navigation into that single header
 * via SpaceHeader.
 *
 * Per-space access checks live in the space's own layout via
 * `createSpaceGate`, not here.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
	await requireSession();

	return (
		<ChatProvider>
			<SpaceHeaderProvider>
				<ProtectedShell>{children}</ProtectedShell>
			</SpaceHeaderProvider>
		</ChatProvider>
	);
}

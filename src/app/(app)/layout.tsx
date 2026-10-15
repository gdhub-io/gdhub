import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { AccessProvider } from "@/components/access/AccessProvider";
import { ChatProvider } from "@/components/Chat/ChatProvider";
import { ProtectedShell } from "@/components/layouts/ProtectedShell";
import { SpaceHeaderProvider } from "@/components/layouts/SpaceHeader";
import { requireSession } from "@/helpers/require-session";
import { getSpaceAccess, type MaybeAccessUser } from "@/services/access";
import { toSnapshot } from "@/services/access/snapshot";

/**
 * Authenticated application root: the session gate plus everything shared by
 * every page inside it — chat, the global app chrome (header + navigation), and
 * what the user is allowed to do.
 *
 * The hub and admin accesses are resolved here because the shell itself needs
 * them: the navigation and the administration link are drawn from permissions,
 * not from a role check. A space gate adds its own access on top.
 *
 * Per-space access checks live in the space's own layout via `createSpaceGate`.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
	const session = await requireSession();
	const user = (session?.user ?? null) as MaybeAccessUser;

	const [hub, admin] = await Promise.all([
		getSpaceAccess("hub", null, user),
		getSpaceAccess("admin", null, user),
	]);

	// The root provider has no session to start with and fetches it after
	// hydration; handing over the one read here lets every query gated on the
	// user start straight away.
	return (
		<SessionProvider session={session}>
			<ChatProvider>
				<AccessProvider
					value={{ hub: toSnapshot(hub), admin: toSnapshot(admin) }}
				>
					<SpaceHeaderProvider>
						<ProtectedShell>{children}</ProtectedShell>
					</SpaceHeaderProvider>
				</AccessProvider>
			</ChatProvider>
		</SessionProvider>
	);
}

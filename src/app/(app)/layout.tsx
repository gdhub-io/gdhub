import {
	dehydrate,
	HydrationBoundary,
	QueryClient,
} from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { AccessProvider } from "@/components/access/AccessProvider";
import { ChatProvider } from "@/components/Chat/ChatProvider";
import { ProtectedShell } from "@/components/layouts/ProtectedShell";
import { SpaceHeaderProvider } from "@/components/layouts/SpaceHeader";
import { LegalUpdateModal } from "@/components/legal/LegalUpdateModal";
import { requireSession } from "@/helpers/require-session";
import { USER_SPACES_QUERY_KEY } from "@/hooks/useUserSpaces";
import { pendingDocuments } from "@/lib/legal/pending";
import { getCachedUserSpaces } from "@/repositories/user/spaces";
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

	// The header's space switcher would otherwise ask for this after hydration.
	const queryClient = new QueryClient();
	const [hub, admin, , legalPending] = await Promise.all([
		getSpaceAccess("hub", null, user),
		getSpaceAccess("admin", null, user),
		user &&
			queryClient.prefetchQuery({
				queryKey: USER_SPACES_QUERY_KEY,
				queryFn: () => getCachedUserSpaces(user.id),
			}),
		// The session flag is cheap and refreshed every few minutes; the texts are
		// read only for someone it says has something to accept.
		user && session?.user.legalPending ? pendingDocuments(user.id) : [],
	]);

	// Handing over the session read here lets every query gated on the user
	// start without waiting for /api/auth/session.
	return (
		<SessionProvider session={session}>
			<HydrationBoundary state={dehydrate(queryClient)}>
				<ChatProvider>
					<AccessProvider
						value={{ hub: toSnapshot(hub), admin: toSnapshot(admin) }}
					>
						<SpaceHeaderProvider>
							<ProtectedShell>{children}</ProtectedShell>
							{legalPending.length > 0 && (
								<LegalUpdateModal documents={legalPending} />
							)}
						</SpaceHeaderProvider>
					</AccessProvider>
				</ChatProvider>
			</HydrationBoundary>
		</SessionProvider>
	);
}

import type { ReactNode } from "react";
import { ChatProvider } from "@/components/Chat/ChatProvider";
import { ProtectedShell } from "@/components/layouts/ProtectedShell";

/**
 * App-shell group — the global header + navigation shared by hub, profile,
 * live, and personal settings. Auth is already enforced by the parent (spaces)
 * layout. Full-page spaces (project/event/admin) are intentionally NOT in this
 * group; they render their own immersive shell.
 */
export default function AppShellLayout({ children }: { children: ReactNode }) {
	return (
		<ChatProvider>
			<ProtectedShell>{children}</ProtectedShell>
		</ChatProvider>
	);
}

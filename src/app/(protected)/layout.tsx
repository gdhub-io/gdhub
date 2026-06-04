import type { ReactNode } from "react";
import { ChatProvider } from "@/components/Chat/ChatProvider";
import { ProtectedShell } from "@/components/layouts/ProtectedShell";
import { requireSession } from "@/helpers/require-session";

export default async function ProtectedLayout({
	children,
}: {
	children: ReactNode;
}) {
	await requireSession();
	return (
		<ChatProvider>
			<ProtectedShell>{children}</ProtectedShell>
		</ChatProvider>
	);
}

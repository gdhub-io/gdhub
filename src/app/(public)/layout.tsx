import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { PublicShell } from "@/components/layouts/PublicShell";

export default function PublicLayout({ children }: { children: ReactNode }) {
	return (
		<SessionProvider>
			<PublicShell>{children}</PublicShell>
		</SessionProvider>
	);
}

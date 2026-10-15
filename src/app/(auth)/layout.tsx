import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { AuthShell } from "@/components/layouts/AuthShell";

export default function AuthLayout({ children }: { children: ReactNode }) {
	return (
		<SessionProvider>
			<AuthShell>{children}</AuthShell>
		</SessionProvider>
	);
}

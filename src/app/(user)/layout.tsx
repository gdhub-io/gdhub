import type { ReactNode } from "react";
import { ProtectedShell } from "@/components/layouts/ProtectedShell";
import { requireSession } from "@/helpers/require-session";

export default async function UserLayout({
	children,
}: {
	children: ReactNode;
}) {
	const session = await requireSession();
	return <ProtectedShell session={session}>{children}</ProtectedShell>;
}

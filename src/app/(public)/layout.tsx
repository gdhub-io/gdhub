import type { ReactNode } from "react";
import { PublicShell } from "@/components/layouts/PublicShell";

export default function PublicLayout({ children }: { children: ReactNode }) {
	return <PublicShell>{children}</PublicShell>;
}

import { notFound } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Dev-tools space — non-production gate. Auth is enforced by the parent
 * (spaces) layout; here we additionally hide the whole area in production so
 * dev pages (ai-validation, telegram-test, push-test) are unreachable there.
 */
export default function DevSpaceLayout({ children }: { children: ReactNode }) {
	if (process.env.NODE_ENV === "production") {
		notFound();
	}
	return <>{children}</>;
}

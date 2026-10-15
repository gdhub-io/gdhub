import { redirect } from "next/navigation";
import { getSession } from "@/auth";

/**
 * Server-side guard: returns the session, or redirects to /signin.
 * Used by `layout.tsx` for the (protected), (user) and (admin) groups.
 *
 * @param callbackUrl — where to send the user back after login.
 *                     Without it they land on /hub.
 */
export async function requireSession(callbackUrl?: string) {
	const session = await getSession();

	if (!session) {
		const target = callbackUrl
			? `/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
			: "/signin";
		redirect(target);
	}

	return session;
}

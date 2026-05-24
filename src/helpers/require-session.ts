import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Server-side guard: возвращает сессию или редиректит на /signin.
 * Используется в `layout.tsx` для (protected), (user), (admin) групп.
 *
 * @param callbackUrl — куда вернуть пользователя после логина.
 *                     Если не передан, после входа улетит на /hub.
 */
export async function requireSession(callbackUrl?: string) {
	const session = await auth();

	if (!session) {
		const target = callbackUrl
			? `/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
			: "/signin";
		redirect(target);
	}

	return session;
}

import { useRouter } from "next/router";
import { signOut, useSession } from "next-auth/react";
import { useEffect } from "react";

/**
 * Hook to handle authentication errors
 * Automatically signs out the user and redirects to signin page when InvalidGrantError occurs
 */
export function useAuthErrorHandler() {
	const { data: session } = useSession();
	const router = useRouter();

	useEffect(() => {
		if (!session?.error) return;

		if (session.error === "InvalidGrantError") {
			console.error("Refresh token is expired or revoked. Signing out...");

			// Sign out and redirect to signin page
			signOut({
				callbackUrl: `/signin?error=RefreshTokenExpired&callbackUrl=${encodeURIComponent(router.asPath)}`,
				redirect: true,
			});
		} else if (session.error === "RefreshAccessTokenError") {
			console.error("Error refreshing access token");
			// You might want to show a notification to the user or handle it differently
		}
	}, [session, router]);

	return session;
}

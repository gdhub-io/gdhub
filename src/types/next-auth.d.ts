import "next-auth/jwt";
import { DefaultSession } from "next-auth";

declare module "next-auth/jwt" {
	interface JWT {
		id: string;
		roles: UserRole[];
		onboardingDone: boolean;
		lang: string;
		error?: "RefreshAccessTokenError" | "InvalidGrantError";
		activeSubscription?: string;
		telegramId?: string;
		/** Epoch ms of the last database sync of the user snapshot. */
		syncedAt?: number;
		/** Cached `Account.expires_at` of the Google account, if any. */
		googleTokenExpiresAt?: number | null;
	}
}

declare module "next-auth" {
	interface Session {
		error?: "InvalidGrantError" | "RefreshAccessTokenError";
		user: {
			id: string;
			roles: UserRole[];
			onboardingDone: boolean;
			lang: string;
			activeSubscription?: string;
			telegramId?: string;
			name: string;
			email: string;
			image: string;
			[key: string]: any;
		} & DefaultSession["user"];
	}

	interface User {
		id: string;
		roles: UserRole[];
		onboardingDone: boolean;
		lang: string;
		activeSubscription?: string;
		telegramId?: string;
	}
}

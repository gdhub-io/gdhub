import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/nodemailer";
import { createTransport } from "nodemailer";
import { cache } from "react";
import { brevoTemplates } from "@/config/brevo-templates";
import { defaultLocale, isAvailableLocale } from "@/config/locale";
import { env } from "@/helpers/env";
import { brevoApi } from "@/services/brevo";
import { cached, cacheSet } from "@/services/cache";
import { ensureMatrixUser } from "@/services/matrix/admin";
import { prisma } from "@/services/prisma";
import type {
	CreateSmtpEmail,
	ErrorModel,
	HttpResponse,
} from "./services/brevo/api";

// E2E-only credentials provider. Gated by env so it can NEVER reach production:
//   - NODE_ENV must not be "production"
//   - E2E_TEST_AUTH must be exactly "1"
// Lets Playwright sign in as an existing user by email, no SMTP/Google needed.
export const isE2EAuth =
	process.env.NODE_ENV !== "production" && process.env.E2E_TEST_AUTH === "1";

const e2eCredentialsProvider = CredentialsProvider({
	id: "e2e-credentials",
	name: "E2E test credentials",
	credentials: { email: { label: "Email", type: "email" } },
	async authorize(credentials) {
		const email = (credentials?.email as string | undefined)?.trim();
		if (!email) return null;
		const user = await prisma.user.findUnique({ where: { email } });
		if (!user) return null;
		// JWT callback below re-hydrates the full record from Prisma; we only
		// need to hand NextAuth a minimal identity here.
		return {
			id: user.id,
			email: user.email,
			name: user.name,
			image: user.image,
		} as any;
	},
});

// How long the user snapshot inside the JWT is trusted before it is re-read
// from the database. Anything that must be visible immediately (onboarding,
// profile edits) calls `resyncSession()` from `@/helpers/session`, which
// bypasses this. Note that a bare `useSession().update()` does not: without an
// argument it is a plain GET that never reaches the `trigger === "update"`
// branch below.
const USER_SYNC_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Everything the JWT carries about the user, read fresh. `syncedAt` travels with
 * it, so a copy served from the cache keeps the time it was really read.
 */
async function readSessionUser(token: JWT) {
	const user = await prisma.user.findUnique({
		where: { email: token.email as string },
		include: { profile: true },
	});

	if (!user) return null;

	if (!user.matrixUserId) {
		// Best-effort: a Synapse outage must never block sign-in — the chat
		// session route provisions the Matrix user again on first use.
		try {
			const matrixUser = await ensureMatrixUser(
				user.id,
				user.email || token.email || undefined,
				user.profile?.name || user.name || token.name || undefined,
				user.image || token.picture || undefined,
			);
			await prisma.user.update({
				where: { id: user.id },
				data: { matrixUserId: matrixUser.user_id },
			});
			user.matrixUserId = matrixUser.user_id;
		} catch (error) {
			console.error("[auth] matrix provisioning failed", error);
		}
	}

	const [activeSubscription, googleAccount, hubMembership] = await Promise.all([
		prisma.user.activeSubscription(user.id),
		// Cached in the token so the session callback can skip its own
		// lookup while the Google access token is still valid.
		prisma.account.findFirst({
			where: { userId: user.id, provider: "google" },
			select: { expires_at: true },
		}),
		// Platform staff. Read here so components outside the authenticated
		// app — the public shell, which has no access context — can tell
		// without falling back to the legacy `roles` array.
		prisma.spaceMember.findUnique({
			where: {
				spaceType_spaceId_userId: {
					spaceType: "hub",
					spaceId: "default",
					userId: user.id,
				},
			},
			select: { role: true, revokedAt: true },
		}),
	]);

	// Auth.js v5 encodes the JWT via jose, which calls `structuredClone`
	// on the payload. Prisma rows can contain values that don't clone
	// (Decimal, BigInt, etc.), so flatten the user through JSON first.
	const safeUser = JSON.parse(JSON.stringify(user));

	const isStaff =
		!hubMembership?.revokedAt &&
		(hubMembership?.role === "Admin" || hubMembership?.role === "Owner");

	return {
		...safeUser,
		isStaff,
		activeSubscription: activeSubscription?.id,
		googleTokenExpiresAt: googleAccount?.expires_at ?? null,
		syncedAt: Date.now(),
	};
}

export const authConfig: NextAuthConfig = {
	adapter: PrismaAdapter(prisma),
	secret: env("NEXTAUTH_SECRET"),
	trustHost: true,
	session: { strategy: "jwt" },
	pages: {
		signIn: "/signin",
	},
	providers: [
		...(isE2EAuth ? [e2eCredentialsProvider] : []),
		GoogleProvider({
			clientId: process.env.GOOGLE_OAUTH_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET as string,
			authorization: { params: { access_type: "offline", prompt: "consent" } },
			allowDangerousEmailAccountLinking: true,
		}),
		EmailProvider({
			id: "email",
			from: process.env.EMAIL_FROM as string,
			server: process.env.EMAIL_SERVER as string,
			async sendVerificationRequest({ identifier: email, url, provider }) {
				// In development, send via SMTP (EMAIL_SERVER) so we can use a local
				// MailHog/MailPit. Brevo HTTP API is used only in production.
				if (process.env.NODE_ENV !== "production") {
					const transport = createTransport(provider.server);
					await transport.sendMail({
						to: email,
						from: provider.from,
						subject: "Sign in",
						text: `Sign in: ${url}`,
						html: `<p>Sign in: <a href="${url}">${url}</a></p>`,
					});
					console.log("sendVerificationRequest sent via SMTP", { email });
					return;
				}

				try {
					const userExist = await prisma.user.findUnique({ where: { email } });
					let sendResult: HttpResponse<CreateSmtpEmail, ErrorModel>;

					if (userExist) {
						sendResult = await brevoApi.smtp.sendTransacEmail({
							to: [{ email }],
							templateId:
								brevoTemplates[userExist.lang as keyof typeof brevoTemplates]
									.signin,
							params: { link: url },
						});
					} else {
						const params = new URL(url).searchParams;
						const callbackUrl = params.get("callbackUrl") || "";
						const callback = new URL(callbackUrl).searchParams;
						const callbackLocale = callback.get("locale");
						const locale = isAvailableLocale(callbackLocale)
							? callbackLocale
							: defaultLocale;

						sendResult = await brevoApi.smtp.sendTransacEmail({
							to: [{ email }],
							templateId:
								brevoTemplates[locale as keyof typeof brevoTemplates]
									.registration,
							params: { link: url },
						});
					}

					if (sendResult.error) throw Error(sendResult.error.message);

					console.log("sendVerificationRequest was sent");
				} catch (error) {
					console.error("sendVerificationRequest error", error);
				}
			},
		}),
	],
	callbacks: {
		async jwt({ token, trigger }) {
			if (!token.email) return token;

			// The JWT already carries the whole user record, and this callback runs
			// on *every* request that touches `auth()` — the proxy, every server
			// component, every API route. Re-reading the user from Postgres each
			// time costs 4 queries per request, so the row is only re-synced once
			// per interval. `resyncSession()` (trigger === "update") always syncs,
			// which is what onboarding and profile forms rely on.
			const syncedAt = typeof token.syncedAt === "number" ? token.syncedAt : 0;
			if (!trigger && Date.now() - syncedAt < USER_SYNC_INTERVAL_MS) {
				return token;
			}

			// Bare `auth()` drops the refreshed cookie, so a stale token lands here
			// on every call; Redis keeps that to one database read per interval.
			const key = `session-user:${token.email}`;
			const ttl = USER_SYNC_INTERVAL_MS / 1000;
			const synced = trigger
				? await readSessionUser(token).then(async (fresh) => {
						await cacheSet(key, fresh, ttl);
						return fresh;
					})
				: await cached(key, ttl, () => readSessionUser(token));

			if (!synced) return token;

			return { ...token, ...synced } as any;
		},
		async session({ session, token }) {
			if (!token) return { ...session, error: "InvalidGrantError" } as any;

			session.user = token as any;

			// Only hit the database when the cached expiry says the Google token
			// has run out; users without a Google account never do.
			const googleTokenExpiresAt = (token as any).googleTokenExpiresAt as
				| number
				| null
				| undefined;

			if (!googleTokenExpiresAt || googleTokenExpiresAt * 1000 >= Date.now()) {
				return session;
			}

			const [google] = await prisma.account.findMany({
				where: { userId: (token as any).id, provider: "google" },
			});

			if (google?.expires_at && google.expires_at * 1000 < Date.now()) {
				try {
					const response = await fetch("https://oauth2.googleapis.com/token", {
						headers: { "Content-Type": "application/x-www-form-urlencoded" },
						body: new URLSearchParams({
							client_id: process.env.GOOGLE_OAUTH_CLIENT_ID as string,
							client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET as string,
							grant_type: "refresh_token",
							refresh_token: google.refresh_token as string,
						}),
						method: "POST",
					});

					const tokens: Record<string, any> = await response.json();

					if (!response.ok) {
						console.error("Token refresh response not OK:", tokens);

						await prisma.account.delete({
							where: {
								provider_providerAccountId: {
									provider: "google",
									providerAccountId: google.providerAccountId,
								},
							},
						});

						if (tokens.error === "invalid_grant") {
							console.error(
								"Invalid grant error - refresh token is expired or revoked",
							);
							session.error = "InvalidGrantError";

							return {
								...session,
								error: "InvalidGrantError",
								redirect: "/signin",
							} as any;
						}

						throw tokens;
					}

					await prisma.account.update({
						data: {
							access_token: tokens.access_token,
							expires_at: Math.floor(Date.now() / 1000 + tokens.expires_in),
							refresh_token: tokens.refresh_token ?? google.refresh_token,
						},
						where: {
							provider_providerAccountId: {
								provider: "google",
								providerAccountId: google.providerAccountId,
							},
						},
					});
				} catch (error) {
					console.error("Error refreshing access token", error);

					const errorObj = error as any;
					if (errorObj?.error === "invalid_grant") {
						console.error(
							"Invalid grant error - refresh token is expired or revoked",
						);
						session.error = "InvalidGrantError";
					} else {
						session.error = "RefreshAccessTokenError";
					}
				}
			}

			return session;
		},
	},
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

/**
 * The session for server components, layouts and gates: one read per render,
 * however many of them ask. `auth()` itself runs the jwt callback on every call.
 */
export const getSession = cache(() => auth());

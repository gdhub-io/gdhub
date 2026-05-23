import { PrismaAdapter } from "@auth/prisma-adapter";
import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import NextAuth, { type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/nodemailer";
import { brevoTemplates } from "@/config/brevo-templates";
import { defaultLocale, isAvailableLocale } from "@/config/locale";
import { env } from "@/helpers/env";
import { brevoApi } from "@/services/brevo";
import { ensureMatrixUser } from "@/services/matrix/admin";
import { prisma } from "@/services/prisma";
import type {
	CreateSmtpEmail,
	ErrorModel,
	HttpResponse,
} from "./services/brevo/api";

export const authConfig: NextAuthConfig = {
	adapter: PrismaAdapter(prisma as unknown as prismaClient.PrismaClient),
	secret: env("NEXTAUTH_SECRET"),
	trustHost: true,
	session: { strategy: "jwt" },
	pages: {
		signIn: "/signin",
	},
	providers: [
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
			async sendVerificationRequest({ identifier: email, url }) {
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
		async jwt({ token }) {
			if (!token.email) return token;

			const user = await prisma.user.findUnique({
				where: { email: token.email },
				include: { profile: true },
			});

			if (!user) return token;

			if (!user.matrixUserId) {
				await ensureMatrixUser(
					user.id,
					user.email || token.email || undefined,
					user.profile?.name || user.name || token.name || undefined,
					user.image || token.picture || undefined,
				);
			}

			const activeSubscription = await prisma.user.activeSubscription(user.id);

			// Auth.js v5 encodes the JWT via jose, which calls `structuredClone`
			// on the payload. Prisma rows can contain values that don't clone
			// (Decimal, BigInt, etc.), so flatten the user through JSON first.
			const safeUser = JSON.parse(JSON.stringify(user));

			return {
				...token,
				...safeUser,
				activeSubscription: activeSubscription?.id,
			} as any;
		},
		async session({ session, token }) {
			if (!token) return { ...session, error: "InvalidGrantError" } as any;

			session.user = token as any;

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

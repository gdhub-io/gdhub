import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
	const session = req.auth;

	if (
		req.nextUrl.pathname.startsWith("/_next") ||
		req.nextUrl.pathname === "/favicon.ico"
	) {
		return;
	}

	const localeMatch = req.nextUrl.pathname.match(/^\/(en|ru)(\/.*)?$/);
	if (localeMatch) {
		const rest = localeMatch[2] || "/";
		return NextResponse.redirect(new URL(rest, req.url));
	}

	if (!session) {
		const signInUrl = new URL("/signin", req.url);
		signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
		return NextResponse.redirect(signInUrl);
	}

	const { onboardingDone, roles } = session.user;

	if (
		!onboardingDone &&
		!req.nextUrl.pathname.startsWith("/registration/onboarding")
	) {
		return NextResponse.redirect(new URL("/registration/onboarding", req.url));
	}

	if (
		onboardingDone &&
		req.nextUrl.pathname.startsWith("/registration/onboarding")
	) {
		return NextResponse.redirect(new URL("/hub", req.url));
	}

	if (
		req.nextUrl.pathname.startsWith("/live/room/reports") &&
		Array.isArray(roles) &&
		!roles.includes(prismaClient.UserRole.Author) &&
		!roles.includes(prismaClient.UserRole.Member) &&
		!roles.includes(prismaClient.UserRole.Admin) &&
		!roles.includes(prismaClient.UserRole.Mentor)
	) {
		return NextResponse.redirect(new URL("/hub", req.url));
	}

	if (req.nextUrl.pathname === "/user/settings") {
		return NextResponse.redirect(new URL("/user/settings/general", req.url));
	}
});

export const config = {
	matcher: [
		"/en/:path*",
		"/ru/:path*",
		"/registration/onboarding",
		"/hub",
		"/hub/:path*",
		"/profile",
		"/profile/:path*",
		"/user/:path*",
		"/live/:path*",
		"/admin/:path*",
		"/dev/:path*",
	],
};

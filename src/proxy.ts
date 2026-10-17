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
		// Keep the query: a chat deep link is `/hub?chat=1&roomId=…`, and a path
		// without it drops the reader on the hub with no chat open.
		signInUrl.searchParams.set(
			"callbackUrl",
			`${req.nextUrl.pathname}${req.nextUrl.search}`,
		);
		return NextResponse.redirect(signInUrl);
	}

	const { onboardingDone } = session.user;

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

	// A material change, or a document never accepted: nothing else opens until it is.
	if (onboardingDone && session.user.legalPending) {
		const gate = new URL("/legal-update", req.url);
		gate.searchParams.set(
			"callbackUrl",
			`${req.nextUrl.pathname}${req.nextUrl.search}`,
		);
		return NextResponse.redirect(gate);
	}

	// Permission checks do not belong here: middleware runs on the edge, with no
	// database and therefore no permission matrix. `/live/room/reports` is gated
	// by `hub.live_room.use` in its own layout.

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

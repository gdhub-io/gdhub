import {
	CHECKPOINT_ENTRY_HREF,
	CHECKPOINT_INTENT,
} from "@/components/checkpoint-landing/constants";

const isUnder = (pathname: string, root: string) =>
	pathname === root || pathname.startsWith(`${root}/`);

/**
 * Where the proxy sends a signed-out visitor. Most of the entry hub's visitors
 * come from the landing without an account, so they sign up; registration
 * links "I already have an account" back to the hub. The checkout is reached
 * from the hub, by someone who has one.
 */
export const signedOutRedirect = (
	pathname: string,
	search: string,
	base: string,
) => {
	if (
		isUnder(pathname, CHECKPOINT_ENTRY_HREF) &&
		!isUnder(pathname, `${CHECKPOINT_ENTRY_HREF}/checkout`)
	) {
		const url = new URL("/registration", base);
		url.searchParams.set("intent", CHECKPOINT_INTENT);
		return url;
	}

	const url = new URL("/signin", base);
	// Keep the query: a chat deep link is `/hub?chat=1&roomId=…`, and a path
	// without it drops the reader on the hub with no chat open.
	url.searchParams.set("callbackUrl", `${pathname}${search}`);
	return url;
};

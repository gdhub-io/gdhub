import { GDHUB_MATRIX_LOCALPART } from "@/config/chat";

/** Who sees the composer in Announcements; the route re-checks on every post. */
export function canPostAnnouncements(
	user:
		| { isSuperAdmin?: boolean | null; isStaff?: boolean | null }
		| null
		| undefined,
): boolean {
	return !!(user?.isSuperAdmin || user?.isStaff);
}

/** The GDHub Matrix account: Announcements' creator and its only poster. */
export function isGdhubUserId(userId: string | null | undefined): boolean {
	return !!userId?.startsWith(`@${GDHUB_MATRIX_LOCALPART}:`);
}

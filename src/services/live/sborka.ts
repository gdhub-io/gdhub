import {
	SBORKA_MAX_PARTICIPANTS,
	SBORKA_ROOM,
	SBORKA_ROOM_HOURS,
} from "@/config/live";
import { env } from "@/helpers/env";
import { getAccessUsers } from "@/repositories/user/access";
import { getLeadSpeciality } from "@/repositories/user/speciality";
import { can, getSpaceAccess, type MaybeAccessUser } from "@/services/access";
import {
	closeCallRoom,
	liveRoom,
	liveToken,
	roomPresence,
	roomUrl,
} from "@/services/daily";
import type { SborkaGuestProfile } from "@/types/live";

const closesAt = () => new Date(Date.now() + SBORKA_ROOM_HOURS * 3600_000);

export const canHostSborka = async (user: MaybeAccessUser) =>
	can(await getSpaceAccess("hub", null, user), "hub.live_room.manage");

/** Whether this environment's Daily domain is set up to live stream. */
export const sborkaCanBroadcast = () =>
	env<string>("DAILY_LIVE_STREAMING", "") === "1";

export const isSborkaOpen = async () => (await roomUrl(SBORKA_ROOM)) !== null;

export const openSborka = () =>
	liveRoom(SBORKA_ROOM, closesAt(), SBORKA_MAX_PARTICIPANTS);

export const closeSborka = () => closeCallRoom(SBORKA_ROOM).catch(() => null);

/** A seat in the open room; `null` while the host has not opened it. */
export const sborkaSeat = async (user: {
	id: string;
	name: string;
	host: boolean;
}) => {
	const url = await roomUrl(SBORKA_ROOM);
	if (!url) return null;
	const token = await liveToken({
		room: SBORKA_ROOM,
		userId: user.id,
		userName: user.name,
		owner: user.host,
		closesAt: closesAt(),
	});
	return { url, token };
};

/**
 * The show ends with its host. A guest's browser reports that the host left;
 * the room is closed only if nobody who may host is still in it, so a guest
 * cannot end the show while the host is there.
 */
export const closeSborkaIfHostGone = async () => {
	const present = await roomPresence(SBORKA_ROOM);
	const users = present.length ? await getAccessUsers(present) : [];
	for (const user of users) {
		if (await canHostSborka(user)) return false;
	}
	await closeSborka();
	return true;
};

/** The guest's role starts as the name of their speciality. */
export const sborkaGuestProfile = async (
	userId: string,
): Promise<SborkaGuestProfile> => {
	const speciality = await getLeadSpeciality(userId);
	return {
		role: speciality?.name ?? "",
		direction: speciality?.direction.name ?? null,
	};
};

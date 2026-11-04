import { idsOfSignedToken, signedToken } from "@/lib/signed-token";

/** The calendar subscription names one person and one checkpoint; calendar apps fetch it without signing in. */
export const calendarToken = (userId: string, checkpointId: string) =>
	signedToken("calendar", userId, checkpointId);

/** Who and which checkpoint the token names, or null when the signature does not hold. */
export const calendarTokenOf = (token: string) => {
	const ids = idsOfSignedToken("calendar", token, 2);
	return ids ? { userId: ids[0], checkpointId: ids[1] } : null;
};

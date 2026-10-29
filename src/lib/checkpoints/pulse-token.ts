import { idsOfSignedToken, signedToken } from "@/lib/signed-token";

/** The pulse link names one person's pulse for one sprint. */
export const pulseToken = (pulseId: string) => signedToken("pulse", pulseId);

/** The pulse id the token names, or null when the signature does not hold. */
export const pulseIdOf = (token: string) =>
	idsOfSignedToken("pulse", token, 1)?.[0] ?? null;

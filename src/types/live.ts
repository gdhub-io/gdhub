/** Who the signed-in user is in the Sborka studio, and whether it is open. */
export type SborkaStateDto = {
	open: boolean;
	host: boolean;
	profile: SborkaGuestProfile;
	/** The host may go on air: this environment's Daily domain can live stream. */
	canBroadcast: boolean;
};

export type SborkaGuestProfile = {
	/** Prefilled from the user's lead speciality; free text after that. */
	role: string;
	/** Work direction name of that speciality, `null` without one. */
	direction: string | null;
};

export type SborkaSeatDto = { url: string; token: string };

/**
 * Whether a payout account can be paid into. Browser-safe: the form and the
 * route run the same check.
 */

const stripSpaces = (value: string) => value.replace(/\s+/g, "");

export const normalisePayoutAccount = (value: string) =>
	stripSpaces(value).toUpperCase();

/** ISO 13616 mod-97: the country and check digits moved to the end, letters as numbers. */
const ibanChecksumOk = (iban: string) => {
	const moved = `${iban.slice(4)}${iban.slice(0, 4)}`;
	const digits = moved.replace(/[A-Z]/g, (letter) =>
		String(letter.charCodeAt(0) - 55),
	);
	let remainder = 0;
	for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
	return remainder === 1;
};

/** An IBAN (starts with two letters) must pass its checksum; anything else needs 8 digits. */
export const validPayoutAccount = (value: string) => {
	const account = normalisePayoutAccount(value);
	if (/^[A-Z]{2}/.test(account)) {
		return (
			/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(account) && ibanChecksumOk(account)
		);
	}
	return (account.match(/\d/g)?.length ?? 0) >= 8;
};

/** First 4 and last 4: enough to recognise an account, never enough to use it. */
export const maskAccount = (account: string) => {
	const plain = stripSpaces(account);
	return plain.length > 8
		? `${plain.slice(0, 4)} •••• ${plain.slice(-4)}`
		: "••••";
};

/** A payout can be sent: the holder, the account and the invoicing are all given. */
export const hasPayoutDetails = <
	P extends {
		payoutHolder: string | null;
		payoutAccount: string | null;
		invoicing: unknown;
	},
>(
	profile: P | null | undefined,
): profile is P & {
	payoutHolder: string;
	payoutAccount: string;
	invoicing: NonNullable<P["invoicing"]>;
} => !!(profile?.payoutHolder && profile.payoutAccount && profile.invoicing);

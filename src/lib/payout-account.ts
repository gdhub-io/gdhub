/**
 * Whether a payout account can be paid into. Browser-safe: the form and the
 * route run the same check.
 */

const plain = (value: string) => value.replace(/\s+/g, "").toUpperCase();

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
	const account = plain(value);
	if (/^[A-Z]{2}/.test(account)) {
		return (
			/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(account) && ibanChecksumOk(account)
		);
	}
	return (account.match(/\d/g)?.length ?? 0) >= 8;
};

export const normalisePayoutAccount = plain;

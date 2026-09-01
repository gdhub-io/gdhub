const STORAGE_KEY = "gdhub_welcome_character";

export const WELCOME_CHARACTERS = ["female", "male"] as const;

export type WelcomeCharacter = (typeof WELCOME_CHARACTERS)[number];

function isWelcomeCharacter(value: unknown): value is WelcomeCharacter {
	return WELCOME_CHARACTERS.includes(value as WelcomeCharacter);
}

function roll(): WelcomeCharacter {
	return WELCOME_CHARACTERS[
		Math.floor(Math.random() * WELCOME_CHARACTERS.length)
	];
}

/**
 * The greeting character this browser shows, drawn once and then kept.
 *
 * The draw happens on the first hub visit of a session and the result lives in
 * local storage next to the rest of the sign-in bookkeeping, so the character
 * does not flip on every render or navigation. `clearWelcomeCharacter` runs on
 * sign-out, which is what makes the next sign-in draw again — including for the
 * same account on the same browser.
 *
 * The stored user id guards the other direction: a second account signing in
 * without a clean sign-out gets its own draw instead of inheriting one.
 */
export function getWelcomeCharacter(userId: string): WelcomeCharacter {
	if (typeof window === "undefined") return WELCOME_CHARACTERS[0];

	try {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored) as unknown;
			if (
				parsed &&
				typeof parsed === "object" &&
				(parsed as { userId?: unknown }).userId === userId &&
				isWelcomeCharacter((parsed as { character?: unknown }).character)
			) {
				return (parsed as { character: WelcomeCharacter }).character;
			}
		}
	} catch {}

	const character = roll();

	try {
		window.localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ userId, character }),
		);
	} catch {}

	return character;
}

/** Drop the draw so the next sign-in on this browser gets a new character. */
export function clearWelcomeCharacter() {
	if (typeof window === "undefined") return;

	try {
		window.localStorage.removeItem(STORAGE_KEY);
	} catch {}
}

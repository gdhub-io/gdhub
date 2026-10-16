type Translate = (key: string, defaultValue: string) => string;

/**
 * The genre dictionary stores slugs (`tbs`, `fps`); `Project.genre` is free text
 * shown as written on cards, so a project stores the English name. The keys are
 * the ones onboarding already builds at runtime, written out here so the
 * extractor sees them.
 */
const GENRE_NAMES: Record<string, (t: Translate) => [string, string]> = {
	shooter: (t) => [
		"Shooter",
		t("onboarding.interests.gameGenres.shooter", "Shooter"),
	],
	fps: (t) => [
		"First-person shooter",
		t("onboarding.interests.gameGenres.fps", "First-person shooter"),
	],
	adventure: (t) => [
		"Adventure",
		t("onboarding.interests.gameGenres.adventure", "Adventure"),
	],
	"action-adventure": (t) => [
		"Action-adventure",
		t("onboarding.interests.gameGenres.action-adventure", "Action-adventure"),
	],
	rts: (t) => [
		"Real-time strategy",
		t("onboarding.interests.gameGenres.rts", "Real-time strategy"),
	],
	tbs: (t) => [
		"Turn-based strategy",
		t("onboarding.interests.gameGenres.tbs", "Turn-based strategy"),
	],
	rpg: (t) => ["RPG", t("onboarding.interests.gameGenres.rpg", "RPG")],
	mmorpg: (t) => [
		"MMORPG",
		t("onboarding.interests.gameGenres.mmorpg", "MMORPG"),
	],
	simulation: (t) => [
		"Simulation",
		t("onboarding.interests.gameGenres.simulation", "Simulation"),
	],
	sports: (t) => [
		"Sports",
		t("onboarding.interests.gameGenres.sports", "Sports"),
	],
	dance: (t) => ["Dance", t("onboarding.interests.gameGenres.dance", "Dance")],
	puzzle: (t) => [
		"Puzzle",
		t("onboarding.interests.gameGenres.puzzle", "Puzzle"),
	],
	platformer: (t) => [
		"Platformer",
		t("onboarding.interests.gameGenres.platformer", "Platformer"),
	],
	fighting: (t) => [
		"Fighting",
		t("onboarding.interests.gameGenres.fighting", "Fighting"),
	],
	"survival horror": (t) => [
		"Survival horror",
		t("onboarding.interests.gameGenres.survival horror", "Survival horror"),
	],
	other: (t) => ["Other", t("onboarding.interests.gameGenres.other", "Other")],
};

const capitalise = (slug: string) =>
	slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");

/** Select options: the stored English name as the value, the translated one as the label. */
export const genreOptions = (slugs: string[], t: Translate) =>
	slugs.map((slug) => {
		const [value, label] = GENRE_NAMES[slug.toLowerCase()]?.(t) ?? [
			capitalise(slug),
			capitalise(slug),
		];
		return { value, label };
	});

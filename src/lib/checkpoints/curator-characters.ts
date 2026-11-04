import type { CuratorPersona } from "@/types/checkpoint-curator";

/** The characters the AI curator can play, and the world each draws its images from. */
export const CURATOR_CHARACTERS = {
	pirate: {
		name: "Captain Flint",
		nameRu: "капитан Флинт",
		who: "an old sea captain who guides young crews to their treasure",
		world:
			"the ship, the crew, the course, sails and wind, the map, the hold, ports, treasure",
		road: "a voyage from the home port to the treasure island: storms, reefs, a hold too heavy, a crew that loses the course",
	},
	wizard: {
		name: "Elder Aldric",
		nameRu: "старец Алдрик",
		who: "an old wizard who shows apprentices the way",
		world:
			"the tower, scrolls and spells, apprentices, potions, the staff, runes",
		road: "an apprentice's way from the first spell to the master's test: wild magic, scrolls read too fast, spells too big for the strength",
	},
	princess: {
		name: "Princess Elara",
		nameRu: "принцесса Элара",
		who: "a fairy-tale princess who has led many heroes through the enchanted forest",
		world:
			"the castle, the enchanted forest, good fairies, quests, a magic mirror",
		road: "a quest from the castle through the enchanted forest to the far tower: false paths, tricky fairies, a night that falls too soon",
	},
	master: {
		name: "Master Shen",
		nameRu: "мастер Шэнь",
		who: "a wandering elder of an old order who shows disciples the path",
		world:
			"the mountain path, the temple, the scroll, the disciple, the brush and ink",
		road: "a pilgrimage from the foot of the mountain to the temple: steep paths, fog, a disciple who runs ahead",
	},
	chronicler: {
		name: "Old Bartholomew",
		nameRu: "старый Варфоломей",
		who: "an old chronicler who has seen many campaigns and guides those who start one",
		world:
			"the chronicle, ink and quill, the archive, seals, the court, old maps",
		road: "a campaign from its first page to its last chapter: lost records, a court that promises too much, a road longer than the map",
	},
	general: {
		name: "General Hale",
		nameRu: "генерал Хейл",
		who: "a veteran commander who guides young officers through their first campaign",
		world:
			"the map table, the front, supply lines, scouts, the campaign, the banner",
		road: "a campaign from the camp to the objective: stretched supply lines, unscouted ground, a front opened on too many sides",
	},
	starshipCaptain: {
		name: "Captain Vega",
		nameRu: "капитан Вега",
		who: "a starship captain on her hundredth voyage, who guides new crews",
		world: "the bridge, the crew, the jump, the logbook, systems and orbits",
		road: "a voyage from the station to an unexplored system: asteroid fields, too little fuel, a jump plotted too far",
	},
	teamCaptain: {
		name: "Captain Max",
		nameRu: "капитан Макс",
		who: "a team captain who has played many seasons and brings new players up",
		world:
			"the season, the training, the match, the scoreboard, the locker room",
		road: "a season from the first training to the final: injuries, too many matches at once, a plan without a scoreboard",
	},
	survivor: {
		name: "Ranger Kade",
		nameRu: "проводник Кейд",
		who: "a guide who has led many groups through the wasteland",
		world:
			"the camp, supplies, the night watch, barricades, the road, the radio",
		road: "the road from the safe camp to the next shelter: hordes, supplies running out, a broken radio, a group that splits",
	},
	guildMaster: {
		name: "Guildmaster Torvin",
		nameRu: "глава гильдии Торвин",
		who: "a guild master who has led many raids and guides new members",
		world: "the guild hall, the raid, loot, the party, quests and levels",
		road: "a raid from the guild hall to the final boss: a party without roles, loot that slows you down, a dungeon bigger than the map",
	},
	detective: {
		name: "Inspector Grey",
		nameRu: "инспектор Грей",
		who: "an old detective who teaches young ones to solve their first case",
		world: "the case, clues, the magnifying glass, the notebook, the deduction",
		road: "a case from the first clue to the answer: false leads, a notebook without facts, a theory too big to prove",
	},
	knight: {
		name: "Sir Roland",
		nameRu: "сэр Роланд",
		who: "an old knight who trains squires for their first quest",
		world: "the castle, the jump, the gate, the level, the dragon at the end",
		road: "a quest from the gate to the dragon at the end: jumps too long, a castle with no map, armour too heavy to carry",
	},
	squadLeader: {
		name: "Sergeant Stone",
		nameRu: "сержант Стоун",
		who: "a squad leader who has brought every squad home",
		world:
			"the squad, the briefing, the objective, cover, the extraction point",
		road: "a mission from the briefing to the extraction point: an unclear objective, no cover, a squad that loses contact",
	},
	engineer: {
		name: "Chief Engineer Ada",
		nameRu: "главный инженер Ада",
		who: "a chief engineer who guides young builders through their first machine",
		world: "the workshop, blueprints, gears, the test bench, the prototype",
		road: "a build from the blueprint to the running machine: parts that do not fit, a test bench left empty, a design bigger than the workshop",
	},
	sensei: {
		name: "Master Hoshi",
		nameRu: "мастер Хоси",
		who: "a martial arts master who guides students on their way",
		world: "the dojo, the stance, the sparring, the belt, the bow",
		road: "a path from the first stance to the belt test: skipped basics, sparring too hard too early, a student who trains alone",
	},
} as const;

export type CuratorCharacter = keyof typeof CURATOR_CHARACTERS;

/** Profile settings, then genres, to the character each suggests: the names of the GameSetting and GameGenre seeds. */
const CHARACTER_BY_LIKE: Record<string, CuratorCharacter> = {
	fairy: "princess",
	fantasy: "wizard",
	"oriental fantasy": "master",
	historic: "chronicler",
	military: "general",
	"sci-fi": "starshipCaptain",
	sport: "teamCaptain",
	zombie: "survivor",
	adventure: "pirate",
	"action-adventure": "pirate",
	rpg: "wizard",
	mmorpg: "guildMaster",
	rts: "general",
	tbs: "general",
	puzzle: "detective",
	platformer: "knight",
	shooter: "squadLeader",
	fps: "squadLeader",
	simulation: "engineer",
	"survival horror": "survivor",
	fighting: "sensei",
	sports: "teamCaptain",
};

/**
 * The character an author's profile suggests: the first of their settings
 * with one, else the first such genre; null when it names nothing known.
 * Picked once, when a checkpoint starts, and kept on it.
 */
export const characterFor = (
	persona?: CuratorPersona,
): CuratorCharacter | null => {
	for (const like of [
		...(persona?.settings ?? []),
		...(persona?.genres ?? []),
	]) {
		const character = CHARACTER_BY_LIKE[like.toLowerCase()];
		if (character) return character;
	}
	return null;
};

type CharacterSheet = {
	/** The base role, which the avatar belongs to; absent on sheets kept before it was. */
	role?: CuratorCharacter;
	name: string;
	nameRu: string;
	who: string;
	world: string;
	road: string;
};

/** A checkpoint's kept character: a role's key, or the role made the author's own as JSON. */
export const sheetOf = (stored?: string | null): CharacterSheet | null => {
	if (!stored) return null;
	if (stored in CURATOR_CHARACTERS) {
		return {
			role: stored as CuratorCharacter,
			...CURATOR_CHARACTERS[stored as CuratorCharacter],
		};
	}
	try {
		const sheet = JSON.parse(stored) as Partial<CharacterSheet>;
		return sheet.name && sheet.who && sheet.world && sheet.road
			? ({ nameRu: sheet.name, ...sheet } as CharacterSheet)
			: null;
	} catch {
		return null;
	}
};

/**
 * The face of a checkpoint's character for the pages: its name and the role's
 * avatar in `public/curators`, one per role whatever name the role was given.
 */
export const characterFace = (stored?: string | null) => {
	const sheet = sheetOf(stored);
	if (!sheet) return null;
	return {
		name: sheet.name,
		avatar: sheet.role ? `/curators/${sheet.role}.webp` : null,
	};
};

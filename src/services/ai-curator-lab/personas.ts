import type { CuratorPersona } from "@/services/checkpoint-curator/types";
import type { LabLanguage } from "./schemas";

/** Authors' profiles to colour the curator's character with, to compare its letters side by side. */
export const LAB_PERSONAS: {
	id: string;
	label: Record<LabLanguage, string>;
	persona: CuratorPersona;
}[] = [
	{
		id: "none",
		label: { en: "Nothing in the profile", ru: "В профиле ничего не указано" },
		persona: { genres: [], settings: [], levels: [] },
	},
	{
		id: "fairy",
		label: {
			en: "Fairy tales → Princess Elara",
			ru: "Сказки → принцесса Элара",
		},
		persona: {
			genres: ["adventure", "puzzle"],
			settings: ["fairy"],
			levels: ["casual"],
		},
	},
	{
		id: "fantasy",
		label: {
			en: "Fantasy RPG → Elder Aldric, a wizard",
			ru: "Фэнтези RPG → старец Алдрик, чародей",
		},
		persona: {
			genres: ["rpg"],
			settings: ["fantasy"],
			levels: ["mid-core"],
		},
	},
	{
		id: "pirate",
		label: {
			en: "Adventures → Captain Flint, a pirate",
			ru: "Приключения → капитан Флинт, пират",
		},
		persona: { genres: ["adventure"], settings: [], levels: ["casual"] },
	},
	{
		id: "scifi",
		label: {
			en: "Sci-fi strategy → Captain Vega",
			ru: "Sci-fi стратегии → капитан Вега",
		},
		persona: {
			genres: ["tbs", "rts"],
			settings: ["sci-fi"],
			levels: ["mid-core"],
		},
	},
	{
		id: "historic",
		label: {
			en: "Historic puzzles → Old Bartholomew, a chronicler",
			ru: "Исторические головоломки → летописец Варфоломей",
		},
		persona: {
			genres: ["puzzle"],
			settings: ["historic"],
			levels: ["casual"],
		},
	},
	{
		id: "zombie",
		label: {
			en: "Zombie survival → Ranger Kade",
			ru: "Зомби → проводник Кейд",
		},
		persona: {
			genres: ["survival horror"],
			settings: ["zombie"],
			levels: ["hard-core"],
		},
	},
	{
		id: "mixed",
		label: {
			en: "The screenshot's profile → Princess Elara",
			ru: "Профиль со скриншота → принцесса Элара",
		},
		persona: {
			genres: ["adventure", "tbs", "puzzle", "platformer"],
			settings: ["fairy", "fantasy", "historic", "sci-fi"],
			levels: ["casual", "mid-core"],
		},
	},
];

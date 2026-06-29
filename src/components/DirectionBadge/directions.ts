import {
	type Icon,
	IconBox,
	IconBug,
	IconClipboardList,
	IconCode,
	IconDeviceGamepad2,
	IconMovie,
	IconMusic,
	IconPalette,
	IconPencil,
	IconSchool,
	IconServer,
	IconShape,
	IconSparkles,
	IconSpeakerphone,
	IconTrendingUp,
	IconUsers,
	IconWand,
	IconWorld,
} from "@tabler/icons-react";

/** A single work direction with its visual identity (icon + light background color). */
export type WorkDirectionMeta = {
	/** Slug used for the `bg-direc-*` class and lookups, e.g. "3d-art-animation". */
	slug: string;
	/** Human-readable name, e.g. "3d art & animation". */
	label: string;
	/** Light background color. Mirrors the `--bg-direc-*` CSS variables in globals.scss. */
	color: string;
	/** Associated tabler icon. */
	icon: Icon;
};

/**
 * Single source of truth mapping work directions to their icon and color.
 * The order matches the seed list in the database and the `--bg-direc-*`
 * variables in `src/styles/globals.scss`.
 */
export const WORK_DIRECTIONS: WorkDirectionMeta[] = [
	{
		slug: "development",
		label: "development",
		color: "#E5F1FF",
		icon: IconCode,
	},
	{
		slug: "web-development",
		label: "web development",
		color: "#D3F7FF",
		icon: IconWorld,
	},
	{
		slug: "game-design",
		label: "game design",
		color: "#EDE9FE",
		icon: IconDeviceGamepad2,
	},
	{
		slug: "2d-art-animation",
		label: "2d art & animation",
		color: "#FFEBEB",
		icon: IconPalette,
	},
	{
		slug: "3d-art-animation",
		label: "3d art & animation",
		color: "#FFE6CC",
		icon: IconBox,
	},
	{
		slug: "management",
		label: "management",
		color: "#E9EEF5",
		icon: IconClipboardList,
	},
	{
		slug: "game-writer",
		label: "game writer",
		color: "#FDFEC8",
		icon: IconPencil,
	},
	{ slug: "learning", label: "learning", color: "#DCFFF9", icon: IconSchool },
	{
		slug: "technical-art",
		label: "technical art",
		color: "#F2FEE6",
		icon: IconWand,
	},
	{
		slug: "music-sound",
		label: "music & sound",
		color: "#C9EBFF",
		icon: IconMusic,
	},
	{
		slug: "marketing",
		label: "marketing",
		color: "#FFD5C8",
		icon: IconSpeakerphone,
	},
	{ slug: "vfx", label: "vfx", color: "#F3E8FF", icon: IconSparkles },
	{ slug: "qa", label: "qa", color: "#E3F7EA", icon: IconBug },
	{ slug: "hr", label: "hr", color: "#FFE2F0", icon: IconUsers },
	{
		slug: "video-editing",
		label: "video editing",
		color: "#FFEDFB",
		icon: IconMovie,
	},
	{
		slug: "backend-development",
		label: "backend development",
		color: "#E6EAFB",
		icon: IconServer,
	},
	{
		slug: "investment",
		label: "investment",
		color: "#D9F2DF",
		icon: IconTrendingUp,
	},
	{ slug: "other", label: "other", color: "#EEEEEE", icon: IconShape },
];

/** Lookup by slug. */
export const WORK_DIRECTIONS_BY_SLUG: Record<string, WorkDirectionMeta> =
	Object.fromEntries(WORK_DIRECTIONS.map((d) => [d.slug, d]));

/**
 * Normalize a work-direction name to its slug.
 * e.g. "3d art & animation" -> "3d-art-animation"
 */
export function directionSlug(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/\s*&\s*/g, "-")
		.replace(/\s+/g, "-");
}

/** Resolve a direction name to its metadata, falling back to "other". */
export function getWorkDirection(name: string): WorkDirectionMeta {
	const slug = directionSlug(name);
	return WORK_DIRECTIONS_BY_SLUG[slug] ?? WORK_DIRECTIONS_BY_SLUG.other;
}

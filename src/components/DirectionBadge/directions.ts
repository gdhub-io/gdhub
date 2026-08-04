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
import { type DirectionSlug, directionColors } from "@/config/design/tokens";

/** A single work direction with its visual identity (icon + colour pair). */
export type WorkDirectionMeta = {
	/** Slug used for the `bg-direc-*` class and lookups, e.g. "3d-art-animation". */
	slug: DirectionSlug;
	/** Human-readable name, e.g. "3d art & animation". */
	label: string;
	/** Light background tint. Mirrors `--gd-direction-*-tint`. */
	color: string;
	/** Label and icon colour for content drawn on `color`. */
	ink: string;
	/** Associated tabler icon. */
	icon: Icon;
};

/**
 * Icon and label per direction. Colours are not repeated here — they come from
 * the design tokens, so the palette has one owner. Typing the slug as
 * `DirectionSlug` makes a direction without a colour pair a compile error.
 *
 * The order matches the seed list in the database.
 */
const DIRECTION_IDENTITY: {
	slug: DirectionSlug;
	label: string;
	icon: Icon;
}[] = [
	{ slug: "development", label: "development", icon: IconCode },
	{ slug: "web-development", label: "web development", icon: IconWorld },
	{ slug: "game-design", label: "game design", icon: IconDeviceGamepad2 },
	{ slug: "2d-art-animation", label: "2d art & animation", icon: IconPalette },
	{ slug: "3d-art-animation", label: "3d art & animation", icon: IconBox },
	{ slug: "management", label: "management", icon: IconClipboardList },
	{ slug: "game-writer", label: "game writer", icon: IconPencil },
	{ slug: "learning", label: "learning", icon: IconSchool },
	{ slug: "technical-art", label: "technical art", icon: IconWand },
	{ slug: "music-sound", label: "music & sound", icon: IconMusic },
	{ slug: "marketing", label: "marketing", icon: IconSpeakerphone },
	{ slug: "vfx", label: "vfx", icon: IconSparkles },
	{ slug: "qa", label: "qa", icon: IconBug },
	{ slug: "hr", label: "hr", icon: IconUsers },
	{ slug: "video-editing", label: "video editing", icon: IconMovie },
	{
		slug: "backend-development",
		label: "backend development",
		icon: IconServer,
	},
	{ slug: "investment", label: "investment", icon: IconTrendingUp },
	{ slug: "other", label: "other", icon: IconShape },
];

/** Single source of truth mapping work directions to their icon and colours. */
export const WORK_DIRECTIONS: WorkDirectionMeta[] = DIRECTION_IDENTITY.map(
	({ slug, label, icon }) => ({
		slug,
		label,
		icon,
		color: directionColors[slug].tint,
		ink: directionColors[slug].ink,
	}),
);

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

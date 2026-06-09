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
import styles from "./styles.module.scss";

/**
 * Normalize a work-direction name to its slug.
 * Matches the `--bg-direc-*` CSS variables / `.bg-direc-*` classes in globals.scss.
 * e.g. "3d art & animation" -> "3d-art-animation"
 */
export function directionSlug(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/\s*&\s*/g, "-")
		.replace(/\s+/g, "-");
}

/** Work direction -> icon. Background color comes from the `bg-direc-*` class. */
const DIRECTION_ICONS: Record<string, Icon> = {
	development: IconCode,
	"web-development": IconWorld,
	"game-design": IconDeviceGamepad2,
	"2d-art-animation": IconPalette,
	"3d-art-animation": IconBox,
	management: IconClipboardList,
	"game-writer": IconPencil,
	learning: IconSchool,
	"technical-art": IconWand,
	"music-sound": IconMusic,
	marketing: IconSpeakerphone,
	vfx: IconSparkles,
	qa: IconBug,
	hr: IconUsers,
	"video-editing": IconMovie,
	"backend-development": IconServer,
	investment: IconTrendingUp,
	other: IconShape,
};

export type DirectionBadgeProps = {
	/** Work direction name, e.g. "3d art & animation". */
	name: string;
	/** Render only the icon chip, without the label. */
	onlyIcon?: boolean;
	/** Chip size in px. Default 28. */
	size?: number;
	className?: string;
};

/**
 * Renders a work-direction icon chip (icon on its associated light background)
 * with the direction name next to it. Use `onlyIcon` to show just the chip.
 */
export function DirectionBadge({
	name,
	onlyIcon = false,
	size = 28,
	className,
}: DirectionBadgeProps) {
	const slug = directionSlug(name);
	const key = slug in DIRECTION_ICONS ? slug : "other";
	const Icon = DIRECTION_ICONS[key];

	const chip = (
		<span
			className={`${styles.chip} bg-direc-${key}`}
			style={{
				width: size,
				height: size,
				borderRadius: Math.round(size * 0.29),
			}}
		>
			<Icon size={Math.round(size * 0.57)} stroke={2} color="#18181B" />
		</span>
	);

	if (onlyIcon) {
		return className ? <span className={className}>{chip}</span> : chip;
	}

	return (
		<span className={`${styles.badge}${className ? ` ${className}` : ""}`}>
			{chip}
			<span className={styles.label}>{name}</span>
		</span>
	);
}

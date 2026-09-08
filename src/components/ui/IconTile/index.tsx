import type { Icon } from "@tabler/icons-react";
import { getWorkDirection } from "@/components/DirectionBadge";
import { radius } from "@/config/design";
import styles from "./style.module.scss";

const SIZES = {
	sm: { box: 32, radius: radius.control, icon: 16 },
	md: { box: 40, radius: radius.card, icon: 19 },
	lg: { box: 56, radius: radius.panel, icon: 26 },
} as const;

export type IconTileProps = {
	icon: Icon;
	/**
	 * Work direction name or slug. Fills the tile from the direction palette, so
	 * the colour says which craft the row belongs to.
	 */
	direction?: string;
	/** Explicit pair, for tiles that are not about a direction. */
	tint?: string;
	ink?: string;
	size?: keyof typeof SIZES;
	className?: string;
};

/**
 * A tinted square holding one icon — the platform's way of giving a list row,
 * an action or an empty state a colour without painting the chrome.
 *
 * Pass `direction` to inherit the craft colour, or a `tint`/`ink` pair for
 * anything else. With neither, the tile falls back to neutral.
 */
export function IconTile({
	icon: IconComponent,
	direction,
	tint,
	ink,
	size = "md",
	className,
}: IconTileProps) {
	const palette = direction ? getWorkDirection(direction) : undefined;
	const background = tint ?? palette?.color;
	const color = ink ?? palette?.ink;
	const { box, radius, icon } = SIZES[size];

	return (
		<span
			className={`${styles.tile}${className ? ` ${className}` : ""}`}
			style={{ width: box, height: box, borderRadius: radius, background }}
		>
			<IconComponent size={icon} stroke={2} color={color} />
		</span>
	);
}

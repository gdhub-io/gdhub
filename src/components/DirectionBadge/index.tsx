import { getWorkDirection } from "./directions";
import styles from "./styles.module.scss";

export {
	directionSlug,
	getWorkDirection,
	WORK_DIRECTIONS,
	WORK_DIRECTIONS_BY_SLUG,
	type WorkDirectionMeta,
} from "./directions";

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
	const { slug, icon: Icon } = getWorkDirection(name);

	const chip = (
		<span
			className={`${styles.chip} bg-direc-${slug}`}
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

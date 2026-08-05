import { SkillLevel } from "@/config/prisma-enums";
import styles from "./style.module.scss";

/** Rank of each level on the five-step scale. */
export const SKILL_LEVEL_STEP: Record<SkillLevel, number> = {
	[SkillLevel.Novice]: 1,
	[SkillLevel.Beginner]: 2,
	[SkillLevel.Skillful]: 3,
	[SkillLevel.Experienced]: 4,
	[SkillLevel.Expert]: 5,
};

export const SKILL_LEVEL_STEPS = 5;

export type SkillLevelMeterProps = {
	level: SkillLevel;
	/** `compact` is for dense rows — talent pool, table cells. */
	size?: "default" | "compact";
	className?: string;
};

/**
 * A skill level as a five-block meter, filled to the level.
 *
 * The scale is ordinal, so it is drawn as a quantity: rank you can count needs
 * no legend. It replaces the five-hue ramp the level icons used to be — hue
 * carries no order, and running it red → green told a Novice that their level
 * was an error state.
 *
 * The blocks alone are a chart, not a word: always pair this with the level
 * name, which is why the component deliberately does not render one (the label
 * is a Tolgee key owned by the caller).
 */
export function SkillLevelMeter({
	level,
	size = "default",
	className,
}: SkillLevelMeterProps) {
	const step = SKILL_LEVEL_STEP[level] ?? 0;

	return (
		<span
			className={`${styles.meter}${className ? ` ${className}` : ""}`}
			data-size={size}
			role="img"
			aria-label={`${step} of ${SKILL_LEVEL_STEPS}`}
		>
			{Array.from({ length: SKILL_LEVEL_STEPS }, (_, index) => (
				<span
					key={`${level}-${index + 1}`}
					className={styles.segment}
					data-filled={index < step ? "true" : "false"}
				/>
			))}
		</span>
	);
}

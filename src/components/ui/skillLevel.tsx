import { T } from "@tolgee/react";
import { Tooltip } from "antd";
import type { ReactElement } from "react";
import { SkillLevelMeter } from "@/components/ui/SkillLevelMeter";
import { SkillLevel } from "@/config/prisma-enums";

/**
 * The five-step skill scale.
 *
 * Rank is drawn by `SkillLevelMeter` as a filled count, not by colour: an
 * ordinal scale is a quantity, and the previous red → green ramp encoded the
 * order twice while painting a Novice in the colour the system reserves for
 * failure.
 */
export const skillLevelsList: {
	index: number;
	value: SkillLevel;
	label: ReactElement;
	meter: ReactElement;
	description: ReactElement;
}[] = [
	{
		index: 1,
		value: SkillLevel.Novice,
		label: <T keyName={SkillLevel.Novice} />,
		meter: <SkillLevelMeter level={SkillLevel.Novice} />,
		description: (
			<T keyName="skill.novice.description">
				You know how to do the job, but you don’t have experience yet
			</T>
		),
	},
	{
		index: 2,
		value: SkillLevel.Beginner,
		label: <T keyName={SkillLevel.Beginner} />,
		meter: <SkillLevelMeter level={SkillLevel.Beginner} />,
		description: (
			<T keyName="skill.beginner.description">
				You know how to do the job, you already have some experience
			</T>
		),
	},
	{
		index: 3,
		value: SkillLevel.Skillful,
		label: <T keyName={SkillLevel.Skillful} />,
		meter: <SkillLevelMeter level={SkillLevel.Skillful} />,
		description: (
			<T keyName="skill.skillful.description">
				Accept responsibility for choosing how work will be done and can
				prioritize work by level of importance
			</T>
		),
	},
	{
		index: 4,
		value: SkillLevel.Experienced,
		label: <T keyName={SkillLevel.Experienced} />,
		meter: <SkillLevelMeter level={SkillLevel.Experienced} />,
		description: (
			<T keyName="skill.experienced.description">
				In your work you use intuition based on your experience
			</T>
		),
	},
	{
		index: 5,
		value: SkillLevel.Expert,
		label: <T keyName={SkillLevel.Expert} />,
		meter: <SkillLevelMeter level={SkillLevel.Expert} />,
		description: (
			<T keyName="skill.expert.description">
				You have a huge library of distinct situations (cases), built on the
				basis of your experience
			</T>
		),
	},
];

/**
 * Meter plus name for a level.
 *
 * Matches on `value`: the previous version compared `label` — a `<T>` element —
 * against the level string, so the lookup never hit and the helper rendered an
 * empty tooltip.
 */
export const renderSkillLevel = (levelName: SkillLevel) => {
	const level = skillLevelsList.find((item) => item.value === levelName);
	if (!level) return null;

	return (
		<Tooltip title={level.description}>
			<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
				{level.meter} {level.label}
			</span>
		</Tooltip>
	);
};

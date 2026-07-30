import { T } from "@tolgee/react";
import { Tooltip } from "antd";
import type { ReactElement } from "react";
import SkillBeginnerIcon from "@/assets/images/skills/beginner.svg";
import SkillExperiencedIcon from "@/assets/images/skills/experienced.svg";
import SkillExpertIcon from "@/assets/images/skills/expert.svg";
import SkillNoviceIcon from "@/assets/images/skills/novice.svg";
import SkillSkillfulIcon from "@/assets/images/skills/skillful.svg";
import { SkillLevel } from "@/config/prisma-enums";

export const skillLevelsList: {
	index: number;
	value: string;
	label: string | ReactElement;
	icon: ReactElement;
	color: string;
	description: string | ReactElement;
}[] = [
	{
		index: 1,
		value: SkillLevel.Novice,
		label: <T keyName={SkillLevel.Novice} />,
		icon: <SkillNoviceIcon />,
		color: "#ffeb3b",
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
		icon: <SkillBeginnerIcon />,
		color: "#FF9159",
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
		icon: <SkillSkillfulIcon />,
		color: "#F3B721",
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
		icon: <SkillExperiencedIcon />,
		color: "#80CC14",
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
		icon: <SkillExpertIcon />,
		color: "#25B869",
		description: (
			<T keyName="skill.expert.description">
				You have a huge library of distinct situations (cases), built on the
				basis of your experience
			</T>
		),
	},
];

export const renderSkillLevel = (levelName: SkillLevel) => {
	const level = skillLevelsList.find((i) => i.label == levelName);
	return (
		<Tooltip title={level?.description}>
			{level?.icon} {level?.label}
		</Tooltip>
	);
};

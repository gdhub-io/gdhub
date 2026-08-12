"use client";

import {
	IconBinoculars,
	IconFeather,
	IconSchool,
	IconUsers,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Grid, Select } from "antd";
import { PrimaryInterest } from "@/config/prisma-enums";
import styles from "./style.module.scss";

const OPTIONS = [
	{
		value: PrimaryInterest.Author,
		icon: IconFeather,
		titleKey: "onboarding.interests.wantToBe.author",
		titleDefault: "Author",
		subtitleKey: "onboarding.interests.author.description",
		subtitleDefault: "I want to collect a team for development of my own game",
	},
	{
		value: PrimaryInterest.Specialist,
		icon: IconUsers,
		titleKey: "onboarding.interests.wantToBe.specialist",
		titleDefault: "Specialist",
		subtitleKey: "onboarding.interests.specialist.description",
		subtitleDefault: "I want to join the team",
	},
	{
		value: PrimaryInterest.Mentor,
		icon: IconSchool,
		titleKey: "onboarding.interests.wantToBe.mentor",
		titleDefault: "Mentor",
		subtitleKey: "onboarding.interests.mentor.description",
		subtitleDefault: "I want to share my expertise",
	},
	{
		value: PrimaryInterest.Scout,
		icon: IconBinoculars,
		titleKey: "onboarding.interests.wantToBe.scout",
		titleDefault: "Scout",
		subtitleKey: "onboarding.interests.scout.description",
		subtitleDefault:
			"I want to find amazing games and help them reach the market",
	},
];

/**
 * "I want to be…" — the four cards the onboarding asks this with.
 *
 * Shared so the question looks the same wherever it is asked. Settings used to
 * put the same choice in a `Segmented` with a second layout for phones, and the
 * two drifted: the same decision looked like two different questions depending
 * on where a person met it.
 *
 * On a phone the cards become a select. Stacked, four of them ran past a
 * screen's height and buried whatever the form asked next; the select states the
 * same choice in one row, and each option still carries its description.
 *
 * Controlled the way antd's Form expects, so it drops into a `Form.Item`.
 */
export function InterestPicker({
	value,
	onChange,
}: {
	value?: string;
	onChange?: (value: string) => void;
}) {
	const { t } = useTranslate();
	const screens = Grid.useBreakpoint();

	if (!screens.md) {
		return (
			<Select
				value={value}
				onChange={onChange}
				className={styles.select}
				placeholder={t("onboarding.interests.wantToBe.text", "I want to be")}
				options={OPTIONS.map((option) => ({
					value: option.value,
					label: t(option.titleKey, option.titleDefault),
					subtitle: t(option.subtitleKey, option.subtitleDefault),
					icon: option.icon,
				}))}
				optionRender={({ data }) => {
					const Icon = data.icon;

					return (
						<div className={styles.option}>
							<Icon size={20} className={styles.optionIcon} />
							<span className={styles.optionText}>
								<span className={styles.optionTitle}>{data.label}</span>
								<span className={styles.optionSubtitle}>{data.subtitle}</span>
							</span>
						</div>
					);
				}}
			/>
		);
	}

	return (
		<div className={styles.cards} role="radiogroup">
			{OPTIONS.map((option) => {
				const isSelected = value === option.value;
				const Icon = option.icon;

				return (
					<div
						key={option.value}
						role="radio"
						aria-checked={isSelected}
						tabIndex={0}
						className={`${styles.card} ${isSelected ? styles.selected : ""}`}
						onClick={() => onChange?.(option.value)}
						onKeyDown={(event) => {
							if (event.key !== "Enter" && event.key !== " ") return;

							event.preventDefault();
							onChange?.(option.value);
						}}
					>
						<div className={styles.cardContent}>
							<div
								className={`${styles.iconCircle} ${isSelected ? styles.selectedIcon : ""}`}
							>
								<Icon size={28} />
							</div>
							<div className={styles.cardTitle}>
								<span>
									{t("onboarding.interests.wantToBe.text", "I want to be")}
								</span>
								<strong>{t(option.titleKey, option.titleDefault)}</strong>
							</div>
						</div>
						<div
							className={`${styles.cardFooter} ${isSelected ? styles.selectedFooter : ""}`}
						>
							{t(option.subtitleKey, option.subtitleDefault)}
						</div>
					</div>
				);
			})}
		</div>
	);
}

export default InterestPicker;

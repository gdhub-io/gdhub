"use client";

import { useTranslate } from "@tolgee/react";
import { Grid, Steps, Typography } from "antd";
import type { ReactNode } from "react";
import GdhubLogo from "@/assets/images/gdhub-beta-black-logo.svg";
import styles from "./style.module.scss";

const { Title } = Typography;

const STEP_INDEXES = [0, 1, 2, 3];

export type OnboardingLayoutProps = {
	/**
	 * Index of the current step, or `null` for the full-page screens (welcome,
	 * completed) — those are centred and carry neither title nor progress.
	 */
	step: number | null;
	children: ReactNode;
};

/**
 * Chrome shared by every onboarding screen: logo, registration title and step
 * progress (named steps from `md` up, a segmented bar below), plus the content
 * box the steps' own `.onboarding-*` classes are styled against.
 */
export function OnboardingLayout({ step, children }: OnboardingLayoutProps) {
	const { t } = useTranslate();
	const screens = Grid.useBreakpoint();

	const stepItems = [
		{ title: screens.md ? t("user-profile", "Profile") : undefined },
		{ title: screens.md ? t("speciality-step", "Speciality") : undefined },
		{ title: screens.md ? t("interests", "Interests") : undefined },
		{ title: screens.md ? t("resources", "Resources") : undefined },
	];

	return (
		<div
			className={`${styles.container} ${step === null ? styles.centered : ""}`}
		>
			<div className={styles.onboardingBox}>
				<div className={styles.logo}>
					<GdhubLogo style={{ width: 100 }} />
				</div>

				{step !== null && (
					<div className={styles.header}>
						<Title className={styles.headerTitle}>
							{t("onboarding.registration.title", "Registration")}
						</Title>
						{screens.md ? (
							<Steps
								current={step}
								size="small"
								className={styles.steps}
								items={stepItems}
							/>
						) : (
							<div className={styles.progressBar}>
								{STEP_INDEXES.map((i) => (
									<div
										key={i}
										className={`${styles.progressSegment} ${i <= step ? styles.progressActive : ""}`}
									/>
								))}
							</div>
						)}
					</div>
				)}

				<div className={styles.content}>{children}</div>
			</div>
		</div>
	);
}

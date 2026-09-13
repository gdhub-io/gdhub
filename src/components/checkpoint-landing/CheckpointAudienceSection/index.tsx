import { IconCheck, IconX } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { CheckpointSection } from "../CheckpointSection";
import { SectionIntro } from "../SectionIntro";
import styles from "./style.module.scss";

export const CheckpointAudienceSection = () => {
	const { t } = useTranslate();

	const forYou = [
		t(
			"checkpointLanding.audience.for.project",
			"You have a project on GDHub and a team you can fix for 28 days",
		),
		t(
			"checkpointLanding.audience.for.goals",
			"You can name the goals 28 days could actually hold",
		),
		t(
			"checkpointLanding.audience.for.devlogs",
			"You will publish four devlogs and turn up to four sessions",
		),
		t(
			"checkpointLanding.audience.for.outside",
			"You want the work judged by someone who is not on your team",
		),
	];

	const notForYou = [
		t(
			"checkpointLanding.audience.not.outsource",
			"You want someone to make the game — code, art or text",
		),
		t(
			"checkpointLanding.audience.not.marketing",
			"You want marketing, a publisher introduction or legal advice",
		),
		t(
			"checkpointLanding.audience.not.guarantee",
			"You want a guarantee that the goals will be met",
		),
		t(
			"checkpointLanding.audience.not.time",
			"You cannot give the sessions and the devlogs the time they take",
		),
	];

	return (
		<CheckpointSection tone="surface">
			<div className={styles.layout}>
				<SectionIntro
					className={styles.heading}
					eyebrow={t("checkpointLanding.audience.eyebrow", "Before you buy")}
					headline={t(
						"checkpointLanding.audience.headline",
						"A Checkpoint is not for every project.",
					)}
					lead={t(
						"checkpointLanding.audience.lead",
						"Read the second column first. If one of those lines describes you, this is probably not the right program yet.",
					)}
				/>

				<div className={styles.columns}>
					<section className={styles.column}>
						<h3 className={`${styles.columnTitle} ${styles.titleFor}`}>
							{t("checkpointLanding.audience.for.title", "This is for you if")}
						</h3>
						<ul className={styles.list}>
							{forYou.map((line) => (
								<li key={line} className={styles.item}>
									<IconCheck size={18} className={styles.iconFor} />
									{line}
								</li>
							))}
						</ul>
					</section>

					<section className={styles.column}>
						<h3 className={`${styles.columnTitle} ${styles.titleNot}`}>
							{t(
								"checkpointLanding.audience.not.title",
								"This is not for you if",
							)}
						</h3>
						<ul className={styles.list}>
							{notForYou.map((line) => (
								<li key={line} className={styles.item}>
									<IconX size={18} className={styles.iconNot} />
									{line}
								</li>
							))}
						</ul>
					</section>
				</div>
			</div>
		</CheckpointSection>
	);
};

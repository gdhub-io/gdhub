import { useTranslate } from "@tolgee/react";
import { CheckpointSection } from "../CheckpointSection";
import { SectionIntro } from "../SectionIntro";
import styles from "./style.module.scss";

export const CheckpointHowItWorksSection = () => {
	const { t } = useTranslate();

	const steps = [
		{
			title: t(
				"checkpointLanding.how.step1.title",
				"Set a result you can prove",
			),
			body: t(
				"checkpointLanding.how.step1.body",
				"Choose three to five outcomes and attach evidence to each: a build, gameplay video, image, or document.",
			),
		},
		{
			title: t("checkpointLanding.how.step2.title", "Work in weekly sprints"),
			body: t(
				"checkpointLanding.how.step2.body",
				"Open each sprint with curator feedback. Close it with a devlog that shows what changed.",
			),
		},
		{
			title: t("checkpointLanding.how.step3.title", "Leave with a verdict"),
			body: t(
				"checkpointLanding.how.step3.body",
				"Get a written assessment of what landed, what did not, and the strongest next move for the project.",
			),
		},
	];

	const sprintReview = t(
		"checkpointLanding.how.rail.sprint",
		"Sprint + review",
	);
	const rail = [
		{
			day: t("checkpointLanding.how.rail.day1", "Day 1"),
			label: t("checkpointLanding.how.rail.scope", "Scope"),
			edge: true,
		},
		{
			day: t("checkpointLanding.how.rail.week1", "Week 1"),
			label: sprintReview,
		},
		{
			day: t("checkpointLanding.how.rail.week2", "Week 2"),
			label: sprintReview,
		},
		{
			day: t("checkpointLanding.how.rail.week3", "Week 3"),
			label: sprintReview,
		},
		{
			day: t("checkpointLanding.how.rail.week4", "Week 4"),
			label: t("checkpointLanding.how.rail.finalSprint", "Final sprint"),
		},
		{
			day: t("checkpointLanding.how.rail.day28", "Day 28"),
			label: t("checkpointLanding.how.rail.reached", "Checkpoint reached"),
			edge: true,
		},
	];

	return (
		<CheckpointSection tone="surface" anchor="how-it-works">
			<div className={styles.layout}>
				<SectionIntro
					layout="split"
					eyebrow={t("checkpointLanding.how.eyebrow", "How it works")}
					headline={t(
						"checkpointLanding.how.headline",
						"One goal. Four focused weeks. A saved Checkpoint at the end.",
					)}
					lead={t(
						"checkpointLanding.how.lead",
						"You do not hand the project over. The curator helps cut the scope, reviews evidence every week, and records the result so the next cycle starts from what is already true.",
					)}
				/>

				<ol className={styles.steps}>
					{steps.map((step, index) => (
						<li key={step.title} className={styles.step}>
							<span className={styles.marker}>
								{String(index + 1).padStart(2, "0")}
							</span>
							<div className={styles.stepCopy}>
								<h3 className={styles.stepTitle}>{step.title}</h3>
								<p className={styles.stepBody}>{step.body}</p>
							</div>
						</li>
					))}
				</ol>

				<ol className={styles.rail}>
					{rail.map((cell) => (
						<li key={cell.day} className={styles.railCell}>
							<span className={cell.edge ? styles.railDayEdge : styles.railDay}>
								{cell.day}
							</span>
							<span className={styles.railLabel}>{cell.label}</span>
						</li>
					))}
				</ol>
			</div>
		</CheckpointSection>
	);
};

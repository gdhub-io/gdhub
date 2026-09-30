import { IconChevronDown } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Collapse } from "antd";
import { CheckpointSection } from "../CheckpointSection";
import { SectionIntro } from "../SectionIntro";
import styles from "./style.module.scss";

export const CheckpointFaqSection = () => {
	const { t } = useTranslate();

	const questions = [
		{
			q: t(
				"checkpointLanding.faq.end.q",
				"What happens at the end of the 28 days?",
			),
			a: t(
				"checkpointLanding.faq.end.a",
				"Within 48 hours, your curator publishes a final verdict: what changed, what to keep, and what the next Checkpoint should be. The result is saved as the baseline for the next cycle.",
			),
		},
		{
			q: t("checkpointLanding.faq.unfinished.q", "What if I don’t finish?"),
			a: t(
				"checkpointLanding.faq.unfinished.a",
				"The 28 days still end in a verdict. It names what got done, what did not, and what the next Checkpoint should start from. There is no extension inside a Checkpoint.",
			),
		},
		{
			q: t(
				"checkpointLanding.faq.idea.q",
				"My project is only an idea so far.",
			),
			a: t(
				"checkpointLanding.faq.idea.a",
				"That is a fine place to start. Set goals an idea can reach in 28 days: a concept document, a paper prototype, a first playable scene. On day 1 the curator cuts the list to what four weeks can hold.",
			),
		},
		{
			q: t("checkpointLanding.faq.solo.q", "I work alone. Is that a problem?"),
			a: t(
				"checkpointLanding.faq.solo.a",
				"No. The lowest price is the one for an author working alone. A team can hold up to eight people besides you, and the price grows with it.",
			),
		},
		{
			q: t(
				"checkpointLanding.faq.ai.q",
				"What can the AI curator actually see?",
			),
			a: t(
				"checkpointLanding.faq.ai.a",
				"Your devlogs, the artifacts you attach, and the team’s activity during the sprint. It holds no calls. On each session day it returns written feedback and shows what is not moving, and you decide what to cut.",
			),
		},
		{
			q: t(
				"checkpointLanding.faq.missed.q",
				"What if my curator misses sessions?",
			),
			a: t(
				"checkpointLanding.faq.missed.a",
				"Two missed sessions in a row and the platform replaces the curator inside the same Checkpoint and returns the money for the sessions that did not happen. If no verdict is published by day 30, an administrator closes the Checkpoint and that money goes back as well.",
			),
		},
	];

	return (
		<CheckpointSection tone="sunken" anchor="faq">
			<div className={styles.layout}>
				<SectionIntro
					eyebrow={t("checkpointLanding.faq.eyebrow", "Questions")}
					headline={t(
						"checkpointLanding.faq.headline",
						"Before you plan the next Checkpoint.",
					)}
					lead={t(
						"checkpointLanding.faq.lead",
						"The practical details about scope, curators, AI and what happens after day 28.",
					)}
				/>

				<Collapse
					accordion
					bordered={false}
					className={styles.accordion}
					defaultActiveKey={["0"]}
					expandIconPlacement="end"
					expandIcon={({ isActive }) => (
						<IconChevronDown
							size={18}
							className={isActive ? styles.iconOpen : styles.icon}
						/>
					)}
					items={questions.map((item, index) => ({
						key: String(index),
						label: item.q,
						children: <p className={styles.answer}>{item.a}</p>,
					}))}
				/>
			</div>
		</CheckpointSection>
	);
};

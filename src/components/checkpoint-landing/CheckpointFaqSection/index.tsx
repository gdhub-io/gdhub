import { IconChevronDown } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Collapse } from "antd";
import { useEffect, useState } from "react";
import { AI_ACCURACY_ANCHOR } from "@/components/checkpoints/entry/hrefs";
import { EXPERT_CHECKPOINT_OPEN } from "@/config/checkpoint";
import { CheckpointSection } from "../CheckpointSection";
import { SectionIntro } from "../SectionIntro";
import styles from "./style.module.scss";

export const CheckpointFaqSection = () => {
	const { t } = useTranslate();
	const [open, setOpen] = useState<string | string[]>("faq-end");

	// A link to one question (the "AI can make mistakes" line's) opens it and brings it into view.
	useEffect(() => {
		const key = window.location.hash.slice(1);
		if (!key.startsWith("faq-")) return;
		setOpen(key);
		document.getElementById(key)?.scrollIntoView({ block: "center" });
	}, []);

	const questions = [
		{
			key: "faq-end",
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
			key: "faq-unfinished",
			q: t("checkpointLanding.faq.unfinished.q", "What if I don’t finish?"),
			a: t(
				"checkpointLanding.faq.unfinished.a",
				"The 28 days still end in a verdict. It names what got done, what did not, and what the next Checkpoint should start from. There is no extension inside a Checkpoint.",
			),
		},
		{
			key: "faq-idea",
			q: t("checkpointLanding.faq.idea.q", "My project is only an idea so far"),
			a: t(
				"checkpointLanding.faq.idea.a",
				"That is a fine place to start. Set goals an idea can reach in 28 days: a concept document, a paper prototype, a first playable scene. On day 1 the curator cuts the list to what four weeks can hold.",
			),
		},
		{
			key: "faq-solo",
			q: t("checkpointLanding.faq.solo.q", "I work alone. Is that a problem?"),
			a: t(
				"checkpointLanding.faq.solo.a",
				"No. The lowest price is the one for an author working alone. A team can hold up to eight people besides you, and the price grows with it.",
			),
		},
		{
			key: "faq-ai",
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
			key: AI_ACCURACY_ANCHOR,
			q: t(
				"checkpointLanding.faq.aiAccuracy.q",
				"How accurate is the AI curator?",
			),
			a: t(
				"checkpointLanding.faq.aiAccuracy.a",
				"We have built the AI curator to read your project carefully: your devlogs, the artifacts and the team’s activity, against your goal and what the stage expects. Still, no one can predict an AI’s answer one hundred percent, so now and then a review may miss a detail or read it slightly off. Checkpoints are a new feature and we keep improving them. If something looks off, write to info@gdhub.io and we will look into it.",
			),
		},
		// Only an expert holds sessions to miss; back with expert checkpoints.
		...(EXPERT_CHECKPOINT_OPEN
			? [
					{
						key: "faq-missed",
						q: t(
							"checkpointLanding.faq.missed.q",
							"What if my curator misses sessions?",
						),
						a: t(
							"checkpointLanding.faq.missed.a",
							"Two missed sessions in a row and the platform replaces the curator inside the same Checkpoint and returns the money for the sessions that did not happen. If no verdict is published by day 30, an administrator closes the Checkpoint and that money goes back as well.",
						),
					},
				]
			: []),
	];

	return (
		<CheckpointSection tone="sunken" anchor="faq">
			<div className={styles.layout}>
				<SectionIntro
					eyebrow={t("checkpointLanding.faq.eyebrow", "Questions")}
					headline={t(
						"checkpointLanding.faq.headline",
						"Before you plan the next Checkpoint",
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
					activeKey={open}
					onChange={setOpen}
					expandIconPlacement="end"
					expandIcon={({ isActive }) => (
						<IconChevronDown
							size={18}
							className={isActive ? styles.iconOpen : styles.icon}
						/>
					)}
					items={questions.map((item) => ({
						key: item.key,
						label: <span id={item.key}>{item.q}</span>,
						children: <p className={styles.answer}>{item.a}</p>,
					}))}
				/>
			</div>
		</CheckpointSection>
	);
};

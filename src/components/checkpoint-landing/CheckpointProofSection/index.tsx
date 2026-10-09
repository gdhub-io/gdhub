import { useTranslate } from "@tolgee/react";
import {
	CHECKPOINT_AI_PRICE,
	CHECKPOINT_PRICE_CURRENCY,
} from "@/config/checkpoint";
import { CheckpointSection } from "../CheckpointSection";
import styles from "./style.module.scss";

export const CheckpointProofSection = () => {
	const { t } = useTranslate();

	const facts = [
		{
			title: t("checkpointLanding.proof.sprints.title", "4 weekly sprints"),
			body: t(
				"checkpointLanding.proof.sprints.body",
				"A clear goal for each week",
			),
		},
		{
			title: t(
				"checkpointLanding.proof.reviews.title",
				"5 reviews or live calls",
			),
			body: t(
				"checkpointLanding.proof.reviews.body",
				"One before each sprint, and one that decides the Checkpoint",
			),
		},
		{
			title: t("checkpointLanding.proof.nextMove.title", "A clear next move"),
			body: t(
				"checkpointLanding.proof.nextMove.body",
				"The verdict becomes the baseline for your next cycle",
			),
		},
		{
			title: t(
				"checkpointLanding.proof.price.title",
				"From {currency}{price} per cycle",
				{
					currency: CHECKPOINT_PRICE_CURRENCY,
					price: CHECKPOINT_AI_PRICE,
				},
			),
			body: t(
				"checkpointLanding.proof.price.body",
				"A dedicated AI or game industry curator",
			),
		},
	];

	return (
		<CheckpointSection tone="sunken" className={styles.section}>
			<ul className={styles.grid}>
				{facts.map((fact, index) => (
					<li key={fact.title} className={styles.fact}>
						<span className={styles.number}>
							{String(index + 1).padStart(2, "0")}
						</span>
						<h2 className={styles.title}>{fact.title}</h2>
						<p className={styles.body}>{fact.body}</p>
					</li>
				))}
			</ul>
		</CheckpointSection>
	);
};

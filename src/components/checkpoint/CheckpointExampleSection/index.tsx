import {
	IconDeviceGamepad2,
	IconFileText,
	IconVideo,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { StatusDot } from "@/components/ui/StatusDot";
import { CheckpointSection } from "../CheckpointSection";
import styles from "./style.module.scss";

export const CheckpointExampleSection = () => {
	const { t } = useTranslate();

	const facts = [
		{
			label: t("checkpointLanding.example.fact1.label", "Day 1 · Ambition"),
			value: t(
				"checkpointLanding.example.fact1.value",
				"Two enemies, a boss, progression, and a polished combat loop",
			),
		},
		{
			label: t("checkpointLanding.example.fact2.label", "Day 15 · Re-scope"),
			value: t(
				"checkpointLanding.example.fact2.value",
				"With the curator: cut the boss and progression; finish one complete encounter",
			),
		},
		{
			label: t("checkpointLanding.example.fact3.label", "Day 28 · Evidence"),
			value: t(
				"checkpointLanding.example.fact3.value",
				"Playable build, gameplay capture and final devlog",
			),
		},
	];

	const evidence = [
		{
			icon: IconDeviceGamepad2,
			label: t("checkpointLanding.example.evidence.build", "Playable build"),
		},
		{
			icon: IconVideo,
			label: t("checkpointLanding.example.evidence.video", "Gameplay video"),
		},
		{
			icon: IconFileText,
			label: t("checkpointLanding.example.evidence.devlog", "Final devlog"),
		},
	];

	return (
		<CheckpointSection tone="dark">
			<div className={styles.layout}>
				<div className={styles.story}>
					<p className={styles.eyebrow}>
						{t("checkpointLanding.example.eyebrow", "Example checkpoint")}
					</p>
					<h2 className={styles.headline}>
						{t(
							"checkpointLanding.example.headline",
							"From “make the combat better” to a complete playable loop.",
						)}
					</h2>
					<p className={styles.context}>
						{t(
							"checkpointLanding.example.context",
							"A two-person action game team arrived with an unstable prototype and an open-ended combat rewrite.",
						)}
					</p>

					<dl className={styles.facts}>
						{facts.map((fact) => (
							<div key={fact.label} className={styles.fact}>
								<dt className={styles.factLabel}>{fact.label}</dt>
								<dd className={styles.factValue}>{fact.value}</dd>
							</div>
						))}
					</dl>
				</div>

				<article className={styles.card}>
					<header className={styles.cardHeader}>
						<p className={styles.cardEyebrow}>
							{t("checkpointLanding.example.card.eyebrow", "Final assessment")}
						</p>
						<h3 className={styles.cardTitle}>
							{t(
								"checkpointLanding.example.card.title",
								"Hollow Step · Combat milestone",
							)}
						</h3>
						<StatusDot
							tone="success"
							label={t(
								"checkpointLanding.example.card.status",
								"Ready for the next cycle",
							)}
						/>
					</header>

					<blockquote className={styles.verdict}>
						<p className={styles.verdictLabel}>
							{t(
								"checkpointLanding.example.card.verdictLabel",
								"Curator verdict",
							)}
						</p>
						<p className={styles.verdictQuote}>
							{t(
								"checkpointLanding.example.card.verdict",
								"Use this result as the starting point for the next cycle. Keep the completed combat loop, cut the second enemy, and set the vertical slice as the next Checkpoint.",
							)}
						</p>
					</blockquote>

					<ul className={styles.evidence}>
						{evidence.map(({ icon: Icon, label }) => (
							<li key={label} className={styles.evidenceItem}>
								<Icon size={18} />
								{label}
							</li>
						))}
					</ul>

					<p className={styles.note}>
						{t(
							"checkpointLanding.example.card.note",
							"Illustrative example — the materials and verdict show the format of a finished Checkpoint.",
						)}
					</p>
				</article>
			</div>
		</CheckpointSection>
	);
};

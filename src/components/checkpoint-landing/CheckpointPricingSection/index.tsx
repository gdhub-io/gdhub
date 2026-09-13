import { IconSparkles } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button } from "antd";
import Link from "next/link";
import { CheckpointSection } from "../CheckpointSection";
import { CHECKPOINT_CTA_HREF } from "../constants";
import { SectionIntro } from "../SectionIntro";
import styles from "./style.module.scss";

/** Prices per checkpoint, from `docs/checkpoint-standard.md` §9. */
const LEVELS = [
	{ key: "middle", prices: [250, 283, 317, 367] },
	{ key: "experienced", prices: [312, 354, 396, 458] },
	{ key: "expert", prices: [375, 425, 475, 550] },
] as const;

export const CheckpointPricingSection = () => {
	const { t } = useTranslate();

	const levelNames: Record<(typeof LEVELS)[number]["key"], string> = {
		middle: t("checkpointLanding.pricing.level.middle", "Middle"),
		experienced: t(
			"checkpointLanding.pricing.level.experienced",
			"Experienced",
		),
		expert: t("checkpointLanding.pricing.level.expert", "Expert"),
	};

	const teamSizes = [
		t("checkpointLanding.pricing.column.alone", "Author alone"),
		t("checkpointLanding.pricing.column.plus2", "+2 in the team"),
		t("checkpointLanding.pricing.column.plus4", "+4 in the team"),
		t("checkpointLanding.pricing.column.plus7", "+7 in the team"),
	];

	const from = t("checkpointLanding.pricing.from", "from");

	return (
		<CheckpointSection tone="dark" anchor="pricing">
			<div className={styles.layout}>
				<SectionIntro
					layout="split"
					eyebrow={t("checkpointLanding.pricing.eyebrow", "Pricing")}
					headline={t(
						"checkpointLanding.pricing.headline",
						"AI for $19. A human curator from $250.",
					)}
					lead={t(
						"checkpointLanding.pricing.lead",
						"Choose the review that fits the project and the budget. The complete price is shown before payment and does not change during the checkpoint.",
					)}
				/>

				<table className={styles.table}>
					<thead>
						<tr>
							<th scope="col" className={styles.levelHead}>
								{t("checkpointLanding.pricing.column.level", "Curator level")}
							</th>
							{teamSizes.map((size) => (
								<th key={size} scope="col">
									{size}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{LEVELS.map(({ key, prices }) => (
							<tr key={key}>
								<th scope="row" className={styles.level}>
									{levelNames[key]}
								</th>
								{prices.map((price, index) => (
									<td
										key={teamSizes[index]}
										className={index > 0 ? styles.wideOnly : undefined}
									>
										{index === 0 ? (
											<span className={styles.from}>{from} </span>
										) : null}
										${price}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>

				<div className={styles.aiPanel}>
					<span className={styles.aiTile}>
						<IconSparkles size={21} />
					</span>
					<div className={styles.aiCopy}>
						<p className={styles.aiTitle}>
							{t(
								"checkpointLanding.pricing.ai.title",
								"Checkpoint with the AI curator",
							)}
						</p>
						<p className={styles.aiBody}>
							{t(
								"checkpointLanding.pricing.ai.body",
								"One lower fixed price, whatever the size of the team. Written feedback instead of calls, and the same verdict on the platform.",
							)}
						</p>
					</div>
					<p className={styles.aiPrice}>
						<span className={styles.aiPriceValue}>$19</span>
						<span className={styles.aiPriceNote}>
							{t(
								"checkpointLanding.pricing.ai.note",
								"per cycle · any team size",
							)}
						</span>
					</p>
				</div>

				<p className={styles.anchor}>
					{t(
						"checkpointLanding.pricing.anchor",
						"For scale: Indie Game Academy runs a two-month program at $999–5,400, while CG Spectrum starts at $9,999. One human-curated 28-day cycle starts at $250; the AI curator is $19.",
					)}
				</p>

				<Link href={CHECKPOINT_CTA_HREF} className={styles.ctaLink}>
					<Button type="primary" className={styles.cta}>
						{t("checkpointLanding.cta.plan", "Plan my next Checkpoint")}
					</Button>
				</Link>
			</div>
		</CheckpointSection>
	);
};

import { IconSparkles } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Select, Typography } from "antd";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import rumourArt from "@/assets/images/checkpoint/checkpoint-rumour.png";
import {
	CHECKPOINT_AI_PRICE,
	CHECKPOINT_PRICE_CURRENCY,
} from "@/config/checkpoint";
import {
	CHECKPOINT_MIN_CURATOR_PRICE,
	CURATOR_LEVELS,
	type CuratorLevel,
	curatorPrices,
} from "@/config/checkpoint-pricing";
import { CheckpointSection } from "../CheckpointSection";
import { CHECKPOINT_CTA_HREF } from "../constants";
import { SectionIntro } from "../SectionIntro";
import styles from "./style.module.scss";

export const CheckpointPricingSection = () => {
	const { t } = useTranslate();
	// Below 992 only one column of the matrix fits, so the reader picks which.
	const [teamSize, setTeamSize] = useState(0);

	const levelNames: Record<CuratorLevel, string> = {
		Experienced: t(
			"checkpointLanding.pricing.level.experienced",
			"Experienced",
		),
		Expert: t("checkpointLanding.pricing.level.expert", "Expert"),
	};

	const teamSizes = [
		t("checkpointLanding.pricing.column.alone", "Author alone"),
		t("checkpointLanding.pricing.column.plus2", "+2 in the team"),
		t("checkpointLanding.pricing.column.plus4", "+4 in the team"),
		t("checkpointLanding.pricing.column.plus7", "+7 in the team"),
	];

	return (
		<CheckpointSection tone="dark" anchor="pricing">
			<div className={styles.layout}>
				<SectionIntro
					className={styles.intro}
					eyebrow={t("checkpointLanding.pricing.eyebrow", "Pricing")}
					headline={t(
						"checkpointLanding.pricing.headline",
						"AI for {currency}{ai}. A human curator from {currency}{human}",
						{
							currency: CHECKPOINT_PRICE_CURRENCY,
							ai: CHECKPOINT_AI_PRICE,
							human: CHECKPOINT_MIN_CURATOR_PRICE,
						},
					)}
					lead={t(
						"checkpointLanding.pricing.lead",
						"Choose the review that fits the project and the budget. The complete price is shown before payment and does not change during the checkpoint.",
					)}
				/>

				<div className={styles.tableRow}>
					<div className={styles.priceCard}>
						<div className={styles.tableHead}>
							<Typography.Text className={styles.tableTitle}>
								{t("checkpointLanding.pricing.human.title", "Human curator")}
							</Typography.Text>
							<Select
								size="small"
								value={teamSize}
								onChange={setTeamSize}
								options={teamSizes.map((size, index) => ({
									value: index,
									label: size,
								}))}
							/>
						</div>

						<table className={styles.table}>
							<thead>
								<tr>
									<th scope="col" className={styles.levelHead}>
										{t(
											"checkpointLanding.pricing.column.level",
											"Curator level",
										)}
									</th>
									{teamSizes.map((size) => (
										<th key={size} scope="col">
											{size}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{CURATOR_LEVELS.map((level) => (
									<tr key={level}>
										<th scope="row" className={styles.level}>
											{levelNames[level]}
										</th>
										{curatorPrices(level).map((price, index) => (
											<td
												key={teamSizes[index]}
												className={
													index === teamSize ? undefined : styles.wideOnly
												}
											>
												{CHECKPOINT_PRICE_CURRENCY}
												{price}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Stands on the top edge of the AI panel below — frame `ELy4D`. */}
					<Image
						src={rumourArt}
						alt={t(
							"checkpointLanding.pricing.rumour.alt",
							"I have heard rumours that sometimes curators aren't entirely sane and can even take you to the next checkpoint for free",
						)}
						className={styles.art}
						sizes="(min-width: 992px) 400px, 100vw"
					/>
				</div>

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
						<span className={styles.aiPriceValue}>
							{CHECKPOINT_PRICE_CURRENCY}
							{CHECKPOINT_AI_PRICE}
						</span>
						<span className={styles.aiPriceNote}>
							{t(
								"checkpointLanding.pricing.ai.note",
								"per cycle · any team size",
							)}
						</span>
					</p>
				</div>

				<Link href={CHECKPOINT_CTA_HREF} className={styles.ctaLink}>
					<Button type="primary" className={styles.cta}>
						{t("checkpointLanding.cta.plan", "Plan my next Checkpoint")}
					</Button>
				</Link>
			</div>
		</CheckpointSection>
	);
};

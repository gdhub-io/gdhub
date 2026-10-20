import { IconSparkles } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Typography } from "antd";
import Image from "next/image";
import Link from "next/link";
import rumourArt from "@/assets/images/checkpoint/checkpoint-rumour.png";
import { CHECKPOINT_ENTRY_HREF } from "@/components/checkpoints/entry/hrefs";
import {
	CHECKPOINT_AI_PRICE,
	CHECKPOINT_LARGE_TEAM_EMAIL,
	CHECKPOINT_MAX_TEAM,
	CHECKPOINT_PRICE_CURRENCY,
} from "@/config/checkpoint";
import {
	CHECKPOINT_MIN_CURATOR_PRICE,
	CURATOR_LEVELS,
	type CuratorLevel,
	curatorPrice,
} from "@/config/checkpoint-pricing";
import { trackCheckpoint } from "@/helpers/gtm";
import { CheckpointSection } from "../CheckpointSection";
import { SectionIntro } from "../SectionIntro";
import styles from "./style.module.scss";

export const CheckpointPricingSection = () => {
	const { t } = useTranslate();

	const levelNames: Record<CuratorLevel, string> = {
		Experienced: t(
			"checkpointLanding.pricing.level.experienced",
			"Experienced",
		),
		Expert: t("checkpointLanding.pricing.level.expert", "Expert"),
	};

	const upTo = t("checkpointLanding.pricing.column.upTo", "Team of 1–{max}", {
		max: CHECKPOINT_MAX_TEAM,
	});

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
						"checkpointLanding.pricing.leadTeam",
						"Choose the review that fits the project and the budget. One price for a team of 1 to {max}, shown before payment and unchanged during the checkpoint. A larger team? Write to {email}.",
						{ max: CHECKPOINT_MAX_TEAM, email: CHECKPOINT_LARGE_TEAM_EMAIL },
					)}
				/>

				<div className={styles.tableRow}>
					<div className={styles.priceCard}>
						<div className={styles.tableHead}>
							<Typography.Text className={styles.tableTitle}>
								{t("checkpointLanding.pricing.human.title", "Human curator")}
							</Typography.Text>
							<Typography.Text className={styles.tableNote}>
								{upTo}
							</Typography.Text>
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
									<th scope="col">{upTo}</th>
									<th scope="col" className={styles.wideOnly}>
										{t("checkpointLanding.pricing.column.over", "Over {max}", {
											max: CHECKPOINT_MAX_TEAM,
										})}
									</th>
								</tr>
							</thead>
							<tbody>
								{CURATOR_LEVELS.map((level) => (
									<tr key={level}>
										<th scope="row" className={styles.level}>
											{levelNames[level]}
										</th>
										<td>
											{CHECKPOINT_PRICE_CURRENCY}
											{curatorPrice(level)}
										</td>
										<td className={styles.wideOnly}>
											<Typography.Link
												href={`mailto:${CHECKPOINT_LARGE_TEAM_EMAIL}`}
												className={styles.onRequest}
											>
												{t("checkpointLanding.pricing.onRequest", "On request")}
											</Typography.Link>
										</td>
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
								"checkpointLanding.pricing.ai.bodyTeam",
								"One lower fixed price for a team of up to {max}. Written feedback instead of calls, and the same verdict on the platform.",
								{ max: CHECKPOINT_MAX_TEAM },
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
								"checkpointLanding.pricing.ai.noteTeam",
								"per cycle · team of 1–{max}",
								{ max: CHECKPOINT_MAX_TEAM },
							)}
						</span>
					</p>
				</div>

				<Link
					href={CHECKPOINT_ENTRY_HREF}
					className={styles.ctaLink}
					onClick={() =>
						trackCheckpoint("checkpoint_landing_cta", { section: "pricing" })
					}
				>
					<Button type="primary" className={styles.cta}>
						{t("checkpointLanding.cta.plan", "Plan my next Checkpoint")}
					</Button>
				</Link>
			</div>
		</CheckpointSection>
	);
};

import { IconSparkles, IconUser } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Tag, Typography } from "antd";
import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import curatorsArt from "@/assets/images/checkpoint/checkpoint-curators.webp";
import { CHECKPOINT_ENTRY_HREF } from "@/components/checkpoints/entry/hrefs";
import {
	CHECKPOINT_AI_PRICE,
	CHECKPOINT_LARGE_TEAM_EMAIL,
	CHECKPOINT_MAX_TEAM,
	CHECKPOINT_PRICE_CURRENCY,
	EXPERT_CHECKPOINT_OPEN,
} from "@/config/checkpoint";
import {
	CHECKPOINT_MIN_CURATOR_PRICE,
	CURATOR_LEVELS,
	type CuratorLevel,
	curatorPrice,
} from "@/config/checkpoint-pricing";
import { trackCheckpoint } from "@/helpers/gtm";
import { CheckpointSection } from "../CheckpointSection";
import { ExpertWaitlistForm } from "../ExpertWaitlistForm";
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

				<div className={styles.offers}>
					<OfferHead
						className={styles.aiPanel}
						icon={<IconSparkles size={21} />}
						tone="accent"
						title={t(
							"checkpointLanding.pricing.ai.title",
							"Checkpoint with the AI curator",
						)}
						body={t(
							"checkpointLanding.pricing.ai.bodyTeam",
							"One lower fixed price for a team of up to {max}. Written feedback instead of calls, and the same verdict on the platform.",
							{ max: CHECKPOINT_MAX_TEAM },
						)}
						price={`${CHECKPOINT_PRICE_CURRENCY}${CHECKPOINT_AI_PRICE}`}
						note={t(
							"checkpointLanding.pricing.ai.noteTeam",
							"per cycle · team of 1–{max}",
							{ max: CHECKPOINT_MAX_TEAM },
						)}
					/>

					{EXPERT_CHECKPOINT_OPEN ? (
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
											{t(
												"checkpointLanding.pricing.column.over",
												"Over {max}",
												{
													max: CHECKPOINT_MAX_TEAM,
												},
											)}
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
													{t(
														"checkpointLanding.pricing.onRequest",
														"On request",
													)}
												</Typography.Link>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						// Frame `o5oi2`.
						<div className={styles.expertCard}>
							<OfferHead
								icon={<IconUser size={21} />}
								tone="muted"
								title={t(
									"checkpointLanding.pricing.expert.title",
									"Checkpoint with an expert",
								)}
								tag={
									<Tag className={styles.soonTag}>
										{t("checkpointLanding.pricing.soon", "Coming soon")}
									</Tag>
								}
								body={t(
									"checkpointLanding.pricing.expert.body",
									"Calls with an industry expert every sprint and a final verdict. It opens later: leave your email and we'll write when it does.",
								)}
								price={t(
									"checkpointLanding.pricing.expert.from",
									"from {currency}{price}",
									{
										currency: CHECKPOINT_PRICE_CURRENCY,
										price: CHECKPOINT_MIN_CURATOR_PRICE,
									},
								)}
								note={upTo}
							/>
							<ExpertWaitlistForm />
						</div>
					)}

					{/* Stands beside both offers — frame `ELy4D`. */}
					<Image
						src={curatorsArt}
						alt={t(
							"checkpointLanding.pricing.curators.alt",
							"A grey-bearded industry expert in a red cloak, arms crossed, beside the AI curator robot",
						)}
						className={styles.art}
						sizes="(min-width: 1280px) 520px, 260px"
					/>
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

type OfferHeadProps = {
	className?: string;
	icon: ReactNode;
	tone: "accent" | "muted";
	title: string;
	tag?: ReactNode;
	body: string;
	price: string;
	note: string;
};

function OfferHead({
	className,
	icon,
	tone,
	title,
	tag,
	body,
	price,
	note,
}: OfferHeadProps) {
	return (
		<div className={clsx(styles.offerHead, className)}>
			<span className={styles.tile} data-tone={tone}>
				{icon}
			</span>
			<div className={styles.offerCopy}>
				<p className={styles.offerTitle}>
					{title}
					{tag}
				</p>
				<p className={styles.offerBody}>{body}</p>
			</div>
			<p className={styles.offerPrice}>
				<span className={styles.offerPriceValue}>{price}</span>
				<span className={styles.offerPriceNote}>{note}</span>
			</p>
		</div>
	);
}

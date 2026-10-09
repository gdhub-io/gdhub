import { useTranslate } from "@tolgee/react";
import { Button } from "antd";
import Image from "next/image";
import Link from "next/link";
import heroImage from "@/assets/images/checkpoint/checkpoint-hero.png";
import {
	CHECKPOINT_AI_PRICE,
	CHECKPOINT_PRICE_CURRENCY,
} from "@/config/checkpoint";
import { CHECKPOINT_MIN_CURATOR_PRICE } from "@/config/checkpoint-pricing";
import { CheckpointSection } from "../CheckpointSection";
import { CHECKPOINT_CTA_HREF } from "../constants";
import styles from "./style.module.scss";

export const CheckpointHeroSection = () => {
	const { t } = useTranslate();

	return (
		<CheckpointSection tone="dark" className={styles.section}>
			<div className={styles.hero}>
				<div className={styles.copy}>
					<div className={styles.badge}>
						<p className={styles.product}>
							{t("checkpointLanding.productName", "Checkpoint")}
						</p>
						<p className={styles.descriptor}>
							{t(
								"checkpointLanding.hero.descriptor",
								"A repeatable 28-day program for game developers",
							)}
						</p>
					</div>

					<h1 className={styles.headline}>
						{t(
							"checkpointLanding.hero.headline",
							"Reach your next Checkpoint in 28 days",
						)}
					</h1>

					<p className={styles.subhead}>
						{t(
							"checkpointLanding.hero.subhead",
							"The Checkpoint Program helps game developers organize their work around a clear goal and move their project closer to release.",
						)}
					</p>

					<Link href={CHECKPOINT_CTA_HREF} className={styles.ctaLink}>
						<Button type="primary" className={styles.primary}>
							{t("checkpointLanding.cta.plan", "Plan my next Checkpoint")}
						</Button>
					</Link>
				</div>

				<div className={styles.visual}>
					<Image
						src={heroImage}
						alt={t(
							"checkpointLanding.hero.artworkAlt",
							"A team running toward a checkpoint gate",
						)}
						className={styles.artwork}
						sizes="(min-width: 992px) 430px, 250px"
						priority
					/>
				</div>

				<p className={styles.priceNote}>
					{t(
						"checkpointLanding.hero.priceNote",
						"AI curator — {currency}{ai} · Industry curator — from {currency}{human}",
						{
							currency: CHECKPOINT_PRICE_CURRENCY,
							ai: CHECKPOINT_AI_PRICE,
							human: CHECKPOINT_MIN_CURATOR_PRICE,
						},
					)}
				</p>
			</div>
		</CheckpointSection>
	);
};

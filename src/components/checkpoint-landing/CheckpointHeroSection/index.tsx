import { useTranslate } from "@tolgee/react";
import { Button } from "antd";
import Image from "next/image";
import Link from "next/link";
import heroImage from "@/assets/images/checkpoint/checkpoint-hero-bridge.jpg";
import { CHECKPOINT_ENTRY_HREF } from "@/components/checkpoints/entry/hrefs";
import {
	CHECKPOINT_AI_PRICE,
	CHECKPOINT_PRICE_CURRENCY,
} from "@/config/checkpoint";
import { CHECKPOINT_MIN_CURATOR_PRICE } from "@/config/checkpoint-pricing";
import { trackCheckpoint } from "@/helpers/gtm";
import { CheckpointSection } from "../CheckpointSection";
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

					<Link
						href={CHECKPOINT_ENTRY_HREF}
						className={styles.ctaLink}
						onClick={() =>
							trackCheckpoint("checkpoint_landing_cta", { section: "hero" })
						}
					>
						<Button type="primary" className={styles.primary}>
							{t("checkpointLanding.cta.plan", "Plan my next Checkpoint")}
						</Button>
					</Link>
				</div>

				<div className={styles.visual}>
					<div className={styles.frame}>
						<Image
							src={heroImage}
							alt={t(
								"checkpointLanding.hero.artworkAlt",
								"A team crossing a bridge toward a lit door",
							)}
							fill
							className={styles.artwork}
							sizes="100vw"
							placeholder="blur"
							priority
						/>
					</div>
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

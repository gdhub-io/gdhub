import { useTranslate } from "@tolgee/react";
import { Button } from "antd";
import Image from "next/image";
import Link from "next/link";
import heroImage from "@/assets/images/checkpoint/checkpoint-hero.png";
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
							"Reach your next Checkpoint in 28 days.",
						)}
					</h1>

					<p className={styles.subhead}>
						{t(
							"checkpointLanding.hero.subhead",
							"Each cycle turns a realistic goal into saved progress. A curator reviews your builds, gameplay video, images, or documents — and the verdict becomes the starting point for the next cycle.",
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
						"AI curator — $19 · Industry curator — from $250 · Exact price before payment",
					)}
				</p>
			</div>
		</CheckpointSection>
	);
};

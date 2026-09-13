import { useTranslate } from "@tolgee/react";
import { Button } from "antd";
import Image from "next/image";
import Link from "next/link";
import roadImage from "@/assets/images/checkpoint/checkpoint-road.png";
import { CheckpointSection } from "../CheckpointSection";
import { CHECKPOINT_CTA_HREF } from "../constants";
import styles from "./style.module.scss";

export const CheckpointFinalCtaSection = () => {
	const { t } = useTranslate();

	return (
		<CheckpointSection tone="dark" className={styles.section}>
			<div className={styles.artwork}>
				<Image
					src={roadImage}
					alt=""
					aria-hidden
					fill
					className={styles.artworkImage}
					sizes="100vw"
				/>
			</div>

			<div className={styles.copy}>
				<p className={styles.eyebrow}>
					{t("checkpointLanding.finalCta.eyebrow", "The road to release")}
				</p>
				<h2 className={styles.headline}>
					{t(
						"checkpointLanding.finalCta.headline",
						"One Checkpoint after another — until your game is released.",
					)}
				</h2>
				<p className={styles.subhead}>
					{t(
						"checkpointLanding.finalCta.subhead",
						"Save what changed, set the next goals, and keep moving through repeatable 28-day cycles.",
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

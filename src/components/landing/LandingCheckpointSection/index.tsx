import { IconAward, IconEye, IconListCheck } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Typography } from "antd";
import Link from "next/link";
import CuratorsArt from "@/assets/images/checkpoint/checkpoint-curators.webp";
import { IconTile } from "@/components/ui";
import { AppImage } from "@/components/ui/AppImage";
import buttons from "../buttons.module.scss";
import styles from "./style.module.scss";

const { Title, Text } = Typography;

/**
 * Frames `tTRUe` / `DcxM1`: the one coral band, selling the Checkpoint — what
 * it is, how the 28 days go and why a team would run one.
 */
export function LandingCheckpointSection() {
	const { t } = useTranslate();

	const stops = [
		{
			name: t("landing.checkpoint.stop1.name", "Goal"),
			line: t("landing.checkpoint.stop1.line", "One goal for 28 days"),
		},
		{
			name: t("landing.checkpoint.stop2.name", "Sprint review"),
			line: t("landing.checkpoint.stop2.line", "The curator checks the work"),
		},
		{
			name: t("landing.checkpoint.stop3.name", "Goal correction"),
			line: t("landing.checkpoint.stop3.line", "Adjust the plan in time"),
		},
		{
			name: t("landing.checkpoint.stop4.name", "Verdict"),
			line: t("landing.checkpoint.stop4.line", "Reached or not, and why"),
		},
		{
			name: t("landing.checkpoint.stop5.name", "Next checkpoint"),
			line: t("landing.checkpoint.stop5.line", "Keep the game moving"),
		},
	];

	const reasons = [
		{
			icon: IconListCheck,
			name: t("landing.checkpoint.why1.name", "Just enough structure"),
			line: t(
				"landing.checkpoint.why1.line",
				"A goal, a deadline and a review every sprint: the bit of organisation indie teams so often lack.",
			),
		},
		{
			icon: IconEye,
			name: t("landing.checkpoint.why2.name", "An outside eye every sprint"),
			line: t(
				"landing.checkpoint.why2.line",
				"A curator sees problems before they cost you a month.",
			),
		},
		{
			icon: IconAward,
			name: t("landing.checkpoint.why3.name", "Progress you can show"),
			line: t(
				"landing.checkpoint.why3.line",
				"Each verdict stays on the project — proof for players, publishers and investors.",
			),
		},
	];

	return (
		// biome-ignore lint/correctness/useUniqueElementIds: a page anchor, rendered once
		<section id="checkpoint" className={styles.section}>
			<div className={styles.inner}>
				<div className={styles.copy}>
					<div className={styles.heading}>
						<Title level={2} className={styles.title}>
							{t(
								"landing.checkpoint.title",
								"Checkpoint: the engine that drives your game to release",
							)}
						</Title>
					</div>

					{/* ui-guard-ignore frame vlVwn: a dot-and-rail timeline that turns vertical on a phone; antd Steps fights that shape */}
					<ol className={styles.timeline}>
						{stops.map((stop) => (
							// ui-guard-ignore frame vlVwn timeline stop, see above
							<li key={stop.name} className={styles.stop}>
								<span className={styles.rail} aria-hidden />
								<Text strong className={styles.stopName}>
									{stop.name}
								</Text>
								<Text className={styles.stopLine}>{stop.line}</Text>
							</li>
						))}
					</ol>

					<div className={styles.reasons}>
						{reasons.map((reason) => (
							<div key={reason.name} className={styles.reason}>
								<IconTile
									icon={reason.icon}
									tint="var(--gd-neutral-0)"
									ink="var(--gd-brand-700)"
								/>
								<Text strong className={styles.reasonName}>
									{reason.name}
								</Text>
								<Text className={styles.reasonLine}>{reason.line}</Text>
							</div>
						))}
					</div>

					<Link href="/checkpoint" className={styles.ctaLink}>
						<Button size="large" className={buttons.ink} block>
							{t("landing.checkpoint.cta", "Learn about Checkpoint")}
						</Button>
					</Link>
				</div>

				<div className={styles.art}>
					<AppImage
						src={CuratorsArt}
						alt=""
						sizes="(max-width: 991px) 100vw, 480px"
						className={styles.image}
					/>
				</div>
			</div>
		</section>
	);
}

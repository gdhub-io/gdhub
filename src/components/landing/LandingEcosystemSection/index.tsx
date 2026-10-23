import { useTranslate } from "@tolgee/react";
import { Avatar, Typography } from "antd";
import AdvisorIsland from "@/assets/images/landing/v2/district-advisor.webp";
import HubIsland from "@/assets/images/landing/v2/district-hub.webp";
import ProjectsIsland from "@/assets/images/landing/v2/district-projects.webp";
import ScoutIsland from "@/assets/images/landing/v2/district-scout.webp";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { AppImage } from "@/components/ui/AppImage";
import type { LandingData } from "@/repositories/landing.repository";
import styles from "./style.module.scss";

const { Title, Paragraph, Text } = Typography;

/** Under this many the line reads as empty rather than alive, so it is hidden. */
const LIVE_LINE_MIN = 3;

/** Frames `ToJm8` / `CCQuW`: the four spaces as islands on one board. */
export function LandingEcosystemSection({
	liveLine,
}: Pick<LandingData, "liveLine">) {
	const { t } = useTranslate();

	const districts = [
		{
			art: HubIsland,
			name: t("landing.ecosystem.hub.name", "Hub"),
			line: t(
				"landing.ecosystem.hub.line",
				"Game industry talents who love making games come together here.",
			),
		},
		{
			art: ProjectsIsland,
			name: t("landing.ecosystem.projects.name", "Project Space"),
			line: t(
				"landing.ecosystem.projects.line",
				"Where unique, author-driven games get made.",
			),
		},
		{
			art: AdvisorIsland,
			name: t("landing.ecosystem.advisor.name", "Advisor Space"),
			line: t(
				"landing.ecosystem.advisor.line",
				"Experts help other teams with feedback or curate a project to keep it moving.",
			),
		},
		{
			art: ScoutIsland,
			name: t("landing.ecosystem.scout.name", "Scout Space"),
			line: t(
				"landing.ecosystem.scout.line",
				"Publishers and anyone who invests in games find and follow the projects that interest them.",
			),
		},
	];

	return (
		// biome-ignore lint/correctness/useUniqueElementIds: a page anchor, rendered once
		<section id="ecosystem" className={styles.section}>
			<div className={styles.inner}>
				<div className={styles.heading}>
					<Title level={2} className={styles.title}>
						{t(
							"landing.ecosystem.title",
							"Four places to build a game together",
						)}
					</Title>
					<Paragraph className={styles.lead}>
						{t(
							"landing.ecosystem.lead",
							"Make games, share what you know or find the next hit to back — everyone finds something worth doing here.",
						)}
					</Paragraph>
				</div>

				<div className={styles.board}>
					{districts.map((district) => (
						<div key={district.name} className={styles.district}>
							<AppImage
								src={district.art}
								alt=""
								sizes="(max-width: 991px) 50vw, 304px"
								className={styles.island}
							/>
							<div className={styles.label}>
								<Text strong className={styles.name}>
									{district.name}
								</Text>
								<Text type="secondary" className={styles.line}>
									{district.line}
								</Text>
							</div>
						</div>
					))}
				</div>

				{liveLine.count >= LIVE_LINE_MIN && (
					<div className={styles.liveLine}>
						<Avatar.Group>
							{liveLine.avatars.map((image) => (
								<AppAvatar key={image} src={image ?? undefined} size={40} />
							))}
						</Avatar.Group>
						<Text type="secondary" className={styles.line}>
							{t(
								"landing.ecosystem.live",
								"{count} specialists open to collaborate this week",
								{ count: liveLine.count },
							)}
						</Text>
					</div>
				)}
			</div>
		</section>
	);
}

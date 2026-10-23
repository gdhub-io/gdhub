import { useTranslate } from "@tolgee/react";
import { Button, Col, Grid, Row, Space, Typography } from "antd";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import heroBgImage from "@/assets/images/landing/gdhub-hero-image.png";
import { AppImage } from "@/components/ui/AppImage";
import { staticImageUrl } from "@/helpers/image";
import { HeroStats } from "../HeroStats";
import styles from "./style.module.scss";

const { Title, Text } = Typography;

export const LandingHeroSection = ({
	stats,
	art,
}: {
	/**
	 * Takes the illustration's place, and the stats', from a tablet up. On a
	 * phone the illustration and the stats stay, and the art is never mounted,
	 * so it costs nothing there.
	 */
	art?: ReactNode;
	stats: {
		usersCount: number | null;
		specialitiesCount: number | null;
		projectsCount: number | null;
		vacanciesCount: number | null;
		investmentAmount: number;
	};
}) => {
	const screens = Grid.useBreakpoint();
	const { t } = useTranslate();
	// Known only after mount; until then neither the game nor the old
	// illustration is drawn, so nothing flashes before the game's still.
	const showArt = Boolean(art && screens.md);

	const hasEmptyStats =
		!stats ||
		stats?.usersCount === null ||
		stats?.specialitiesCount === null ||
		stats?.projectsCount === null ||
		stats?.vacanciesCount === null;

	return (
		<div
			className={styles.section}
			style={
				art
					? undefined
					: ({
							"--hero-illustration": `url(${staticImageUrl(heroBgImage.src, 1920)})`,
						} as CSSProperties)
			}
		>
			<div className={styles.container}>
				<Row gutter={[screens.lg ? 64 : 0, 64]}>
					<Col xs={{ span: 24 }} lg={{ span: 12 }}>
						<Space
							size={[32, 32]}
							orientation="vertical"
							className={styles.heroMain}
						>
							<Title>
								{t("landing.hero.title", "Ecosystem for video game creators")}
							</Title>

							<Text className={styles.lead}>
								{t(
									"landing.hero.lead",
									"If you want to make your own games, you're in the right place.",
								)}
							</Text>
							<Space orientation="vertical">
								<Link href="/registration">
									<Button className={styles.heroButton} type="primary">
										{t(
											"landing.hero.getStartedForFree",
											"Get started for free",
										)}
									</Button>
								</Link>
								<Text type="secondary">
									{t(
										"landing.hero.noCreditCardRequired",
										"No credit card required",
									)}
								</Text>
							</Space>
						</Space>
					</Col>
					<Col
						xs={{ span: 24 }}
						lg={{ span: 12 }}
						style={{ position: "relative" }}
					>
						{showArt && art}
						{art ? (
							// A phone keeps the illustration and the stats; CSS hides them
							// from a tablet up, so they never flash before the game.
							<div className={styles.phoneOnly}>
								<AppImage
									src={heroBgImage}
									alt=""
									sizes="100vw"
									className={styles.phoneIllustration}
								/>
								{!hasEmptyStats && <HeroStats stats={stats} />}
							</div>
						) : (
							!hasEmptyStats && <HeroStats stats={stats} />
						)}
					</Col>
				</Row>
			</div>
		</div>
	);
};

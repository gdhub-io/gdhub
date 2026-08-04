import Icon from "@ant-design/icons";
import { useTranslate } from "@tolgee/react";
import { Button, Col, Grid, Row, Space, Typography } from "antd";
import Link from "next/link";
import heroBgImage from "@/assets/images/landing/gdhub-hero-image.png";
import StarIcon from "@/assets/images/landing/star.svg";
import { HeroStats } from "../HeroStats";
import styles from "./style.module.scss";

const { Title, Text } = Typography;

export const LandingHeroSection = ({
	stats,
}: {
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

	const hasEmptyStats =
		!stats ||
		stats?.usersCount === null ||
		stats?.specialitiesCount === null ||
		stats?.projectsCount === null ||
		stats?.vacanciesCount === null;

	return (
		<div
			className={styles.section}
			style={{
				backgroundImage: screens.lg ? `url(${heroBgImage.src})` : undefined,
			}}
		>
			<div className={styles.container}>
				<Row gutter={[screens.lg ? 64 : 0, 64]}>
					<Col xs={{ span: 24 }} lg={{ span: 12 }}>
						<Space
							size={[64, 64]}
							orientation="vertical"
							className={styles.heroMain}
						>
							<Title>
								{t("landing.hero.title", "Ecosystem for video game creators")}
							</Title>

							<ul>
								<li>
									<Space>
										<Icon
											component={StarIcon}
											style={{ fontSize: screens.md ? 32 : 19 }}
										/>
										<Text>
											{t(
												"landing.hero.text1",
												"Make your game — find the people it is missing, or join a project that needs your craft.",
											)}
										</Text>
									</Space>
								</li>
								<li>
									<Space>
										<Icon
											component={StarIcon}
											style={{ fontSize: screens.md ? 32 : 19 }}
										/>
										<Text>
											{t(
												"landing.hero.text2",
												"Share what you know and help others — the experts here are members like you, answering from their own practice.",
											)}
										</Text>
									</Space>
								</li>
							</ul>
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
						{!hasEmptyStats && <HeroStats stats={stats} />}
					</Col>
				</Row>
			</div>
		</div>
	);
};

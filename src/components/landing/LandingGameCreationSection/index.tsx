import { useTranslate } from "@tolgee/react";
import { Button, Col, Flex, Grid, Row, Space, Typography } from "antd";
import Image from "next/image";
import { useId } from "react";
import GameCreationProgramLogo from "@/assets/images/landing/gcp-logo.svg";
import styles from "./style.module.scss";

const { Title, Text } = Typography;

export const LandingGameCreationSection = () => {
	const screens = Grid.useBreakpoint();
	const { t } = useTranslate();
	const sectionId = useId();

	return (
		<div id={sectionId} className={styles.root}>
			<section className={styles.section}>
				<div className={styles.container}>
					<Row gutter={[48, 48]} align="middle" justify="center">
						<Col xs={{ span: 24 }} lg={{ span: 14 }}>
							<div className={styles.preTitle}>
								{t(
									"landing.gameCreation.pretitle",
									"Bachelor’s program in Game Creation at EHU",
								)}
							</div>
							<Title level={2} className={styles.title}>
								{t(
									"landing.gameCreation.title",
									"Build your future in the video game industry",
								)}
							</Title>
							<Text className={styles.subtitle}>
								{t(
									"landing.gameCreation.subtitle",
									"Together with Europian Humanities University we designed a bachelor’s program for future game creators with a focus on authorship, art and real projects during the studies that grants a European-standard bachelor diploma.",
								)}
							</Text>
						</Col>

						<Col xs={{ span: 24 }} lg={{ span: 10 }}>
							<Flex justify={!screens.lg ? "start" : "center"} align={"center"}>
								<GameCreationProgramLogo
									style={{ maxWidth: "300px", height: "auto" }}
								/>
							</Flex>
						</Col>
					</Row>

					<Button
						href="https://gamecreation.lt"
						target="_blank"
						className={styles.heroButton}
						type="primary"
						size={screens.xs ? "large" : "middle"}
					>
						{t(
							"component.landingGameCreationSection.joinTheProgram",
							"Go to Game Creation Program",
						)}
					</Button>
				</div>
			</section>
		</div>
	);
};

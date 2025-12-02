import { BiLogoLinkedin } from "@react-icons/all-files/bi/BiLogoLinkedin";
import { BiLogoYoutube } from "@react-icons/all-files/bi/BiLogoYoutube";
import { useTolgee, useTranslate } from "@tolgee/react";
import { Col, Grid, Row, Space, Typography } from "antd";
import Link from "next/link";
import EmailIcon from "@/assets/images/icons/email.svg";
import TelegramIcon from "@/assets/images/icons/telegram.svg";
import BgImage from "@/assets/images/landing/gdhub-contacts-image.png";
import styles from "./style.module.scss";

const { Title, Text } = Typography;

export const LandingContactsSection = () => {
	const screens = Grid.useBreakpoint();
	const { t } = useTranslate();
	const { getLanguage } = useTolgee();

	return (
		// biome-ignore lint/correctness/useUniqueElementIds: <explanation>
		<div
			id="contacts"
			className={styles.section}
			style={{ backgroundImage: `url(${BgImage.src})` }}
		>
			<div className={styles.container}>
				<div className={styles.preTitle}>
					{t("contacts.preTitle", "Contacts")}
				</div>
				<Title level={2}>{t("contacts.title", "Get in touch")}</Title>
				<div className={styles.subTitle}>
					{t(
						"contacts.subTitle",
						"Join us and become a part of new era in the gaming industry!",
					)}
				</div>
				<div className={styles.content}>
					<Row align="middle" justify="center">
						<Col>
							<Space
								style={{ width: "100%", justifyContent: "center" }}
								size={screens.lg ? 56 : 24}
								wrap
							>
								<div className={styles.contactItem}>
									<Link href="mailto:info@gdhub.io" target="_blank">
										<Space direction="vertical" size={32}>
											<div className={styles.contactIcon}>
												<EmailIcon />
											</div>
											<Text>{t("contacts.email", "Email")}</Text>
										</Space>
									</Link>
								</div>
								<div className={styles.contactItem}>
									<Link
										href={
											getLanguage() === "en"
												? "https://t.me/gdhub_en"
												: "https://t.me/gdhub_io"
										}
										target="_blank"
									>
										<Space direction="vertical" size={32}>
											<div className={styles.contactIcon}>
												<TelegramIcon />
											</div>
											<Text>{t("contacts.telegram", "Telegram")}</Text>
										</Space>
									</Link>
								</div>
								{/* <div className={styles.contactItem}>
									<Link href="https://discord.gg/WcUFD3tHqg" target="_blank">
										<Space direction="vertical" size={32}>
											<div className={styles.contactIcon}>
												<DiscordIcon />
											</div>
											<Text>
												{t('contacts.discord', 'Discord')}
											</Text>
										</Space>
									</Link>
								</div> */}
								<div className={styles.contactItem}>
									<Link
										href="https://www.youtube.com/@gamedev_hub"
										target="_blank"
									>
										<Space direction="vertical" size={32}>
											<div className={styles.contactIcon}>
												<BiLogoYoutube
													size={100}
													style={{ width: "initial", height: "initial" }}
												/>
											</div>
											<Text>{t("contacts.youtube", "Youtube")}</Text>
										</Space>
									</Link>
								</div>
								<div className={styles.contactItem}>
									<Link
										href="https://www.linkedin.com/company/game-developers-hub"
										target="_blank"
									>
										<Space direction="vertical" size={32}>
											<div className={styles.contactIcon}>
												<BiLogoLinkedin
													size={100}
													style={{ width: "initial", height: "initial" }}
												/>
											</div>
											<Text>{t("contacts.linkedin", "Linkedin")}</Text>
										</Space>
									</Link>
								</div>
							</Space>
						</Col>
					</Row>
				</div>
			</div>
		</div>
	);
};

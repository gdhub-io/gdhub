import { useTranslate } from "@tolgee/react";
import { Button, Space, Typography } from "antd";
import Link from "next/link";
import RegistrationBgImage from "@/assets/images/registration-bg.jpg";
import styles from "./style.module.scss";

const { Paragraph, Title } = Typography;

export const OnboardingError = ({ error }: { error: string }) => {
	const { t } = useTranslate();

	return (
		<div
			className={`${styles.container}`}
			style={{ backgroundImage: `url(${RegistrationBgImage.src})`, alignItems: "center" }}
		>
			<div className={styles.completedBox}>
				<div className="completed-content" style={{ textAlign: "center" }}>
					<Space direction="vertical" size={56}>
						<Title>{t("page.onboardingError.title", "Error!")}</Title>
						<Paragraph>{t("page.onboardingError.description", error)}</Paragraph>
						<Link href="/registration">
							<Button style={{ width: "300px" }}>
								{t("page.onboardingError.goToRegistration", "Go to registration")}
							</Button>
						</Link>
					</Space>
				</div>
			</div>
		</div>
	);
};

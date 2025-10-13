import { T } from "@tolgee/react";
import { Button, Grid, Space, Typography } from "antd";
import { useRouter } from "next/router";
import RegistrationBgImage from "@/assets/images/registration-bg.jpg";
import styles from "./style.module.scss";

const { Paragraph, Title } = Typography;

export const OnboardingWelcome = ({ onNext }: { onNext: () => void }) => {
	const screens = Grid.useBreakpoint();
	const router = useRouter();

	return (
		<div
			className={`${styles.container} bright-container`}
			style={{
				backgroundImage: screens.sm
					? `url(${RegistrationBgImage.src})`
					: undefined,
			}}
		>
			<div className="onboarding-box">
				<div className="onboarding-content">
					<Space direction="vertical" size={56}>
						<Title>
							<T keyName="onboarding.welcome.title">
								Welcome to the Game Developers Hub community!
							</T>
						</Title>
						<Paragraph>
							<T keyName="onboarding.welcome.text1">
								We are glad that you are with us!A little more and you can use
								all available opportunities for today our portal.In order for it
								to be useful to you, you need to tell a little about yourself
								and your interests.
							</T>
						</Paragraph>

						<Button
							type="primary"
							style={{ width: "300px" }}
							onClick={() => onNext()}
						>
							<T keyName="onboarding.welcome.button1">Fill out the profile</T>
						</Button>
					</Space>
				</div>
			</div>
		</div>
	);
};

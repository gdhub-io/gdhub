import { T } from "@tolgee/react";
import { Button, Space, Typography } from "antd";

const { Paragraph, Title } = Typography;

export const OnboardingWelcome = ({ onNext }: { onNext: () => void }) => {
	return (
		<Space orientation="vertical" size={32} align="center">
			<Title>
				<T keyName="onboarding.welcome.title">
					Welcome to the Game Developers Hub community!
				</T>
			</Title>
			<Paragraph style={{ maxWidth: 560 }}>
				<T keyName="onboarding.welcome.text1">
					We are glad that you are with us! A little more and you can use all
					available opportunities our portal offers today. To make it useful to
					you, please tell us a little about yourself and your interests.
				</T>
			</Paragraph>
			<Button
				type="primary"
				size="large"
				style={{ width: 300, maxWidth: "100%" }}
				onClick={() => onNext()}
			>
				<T keyName="onboarding.welcome.button1">Fill out the profile</T>
			</Button>
		</Space>
	);
};

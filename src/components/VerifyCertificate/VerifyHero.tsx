import { useTranslate } from "@tolgee/react";
import { Flex, Typography } from "antd";

const { Text } = Typography;

export const VerifyHero = () => {
	const { t } = useTranslate();

	return (
		<Flex justify="center" style={{ padding: "24px 0 0" }}>
			<Text
				type="secondary"
				style={{
					fontSize: 15,
					lineHeight: 1.5,
					textAlign: "center",
					maxWidth: 520,
				}}
			>
				{t(
					"verify.hero.subtitle",
					"Enter the certificate number printed on the document to confirm its authenticity and view its details.",
				)}
			</Text>
		</Flex>
	);
};

import { IconSearch } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Alert } from "antd";

type VerifyNotFoundProps = {
	number: string;
};

export const VerifyNotFound = ({ number }: VerifyNotFoundProps) => {
	const { t } = useTranslate();

	return (
		<Alert
			type="error"
			icon={<IconSearch size={20} />}
			showIcon
			message={t("verify.notFound.title", "No signed certificate found")}
			description={t(
				"verify.notFound.text",
				"We couldn't find a signed certificate with number {number}. Either no certificate exists with this number, or it has not been signed yet. Double-check the code and try again.",
				{ number },
			)}
			style={{ width: "100%", maxWidth: 520, borderRadius: 14 }}
		/>
	);
};

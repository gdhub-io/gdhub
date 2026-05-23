import { IconHash, IconInfoCircle, IconShieldCheck } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Alert, Button, Card, Flex, Form, Input, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

const { Text } = Typography;

type VerifyFormProps = {
	initialNumber?: string;
	hasError?: boolean;
};

export const VerifyForm = ({
	initialNumber = "",
	hasError = false,
}: VerifyFormProps) => {
	const router = useRouter();
	const { t } = useTranslate();
	const [number, setNumber] = useState(initialNumber);
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = () => {
		const trimmed = number.trim();
		if (!trimmed) return;
		setSubmitting(true);
		router.push(`/verify/${encodeURIComponent(trimmed)}`);
	};

	return (
		<Card
			style={{ width: "100%", maxWidth: 520, borderRadius: 16 }}
			styles={{ body: { padding: 24 } }}
		>
			<Form layout="vertical" onFinish={handleSubmit} requiredMark={false}>
				<Form.Item
					label={
						<Text strong style={{ fontSize: 13 }}>
							{t("verify.form.label", "Certificate number")}
						</Text>
					}
					validateStatus={hasError ? "error" : undefined}
					style={{ marginBottom: 16 }}
				>
					<Flex gap={8}>
						<Input
							size="large"
							prefix={<IconHash size={16} color="#a1a1aa" />}
							placeholder={t("verify.form.placeholder", "GDH-XXXXXX")}
							value={number}
							onChange={(e) => setNumber(e.target.value)}
							style={{ flex: 1, borderRadius: 10 }}
						/>
						<Button
							type="primary"
							danger
							size="large"
							htmlType="submit"
							icon={<IconShieldCheck size={16} />}
							loading={submitting}
							disabled={!number.trim()}
							style={{ borderRadius: 10, fontWeight: 600 }}
						>
							{t("verify.form.submit", "Verify")}
						</Button>
					</Flex>
				</Form.Item>
				<Alert
					type="info"
					icon={<IconInfoCircle size={16} />}
					showIcon
					message={t(
						"verify.form.hint",
						"You can also open gdhub.io/verify/<NUMBER> to see the result directly.",
					)}
					style={{ borderRadius: 10, background: "#fafafa", border: "none" }}
				/>
			</Form>
		</Card>
	);
};

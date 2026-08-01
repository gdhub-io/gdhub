"use client";

import { Alert, Button, Card, Form, Input, Space, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useFirebaseMessagingToken } from "@/hooks/useFirebaseMessagingToken";

const { Title, Paragraph, Text } = Typography;

type TestResult = {
	type: "success" | "error";
	message: string;
	details?: unknown;
};

export default function DevPushTestPage() {
	const { token, permissionState, error, ready } = useFirebaseMessagingToken();
	const [pushKey, setPushKey] = useState("");
	const [message, setMessage] = useState("Hello from GDHub dev push tester 👋");
	const [result, setResult] = useState<TestResult | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (token && !pushKey) {
			setPushKey(token);
		}
	}, [token, pushKey]);

	const isFormValid = useMemo(() => pushKey.trim().length > 0, [pushKey]);

	const handleTestPush = async () => {
		if (!isFormValid) return;

		setLoading(true);
		setResult(null);

		try {
			const response = await fetch("/api/dev/push-test", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					pushKey: pushKey.trim(),
					message,
				}),
			});

			const data = await response.json();

			if (response.ok) {
				setResult({
					type: "success",
					message: "Push request sent successfully",
					details: data,
				});
			} else {
				setResult({
					type: "error",
					message: data?.message || "Failed to send push request",
					details: data,
				});
			}
		} catch (err) {
			setResult({
				type: "error",
				message: err instanceof Error ? err.message : "Unknown error",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<main
			style={{
				minHeight: "100vh",
				background: "#f5f5f5",
				padding: "40px 16px",
				display: "flex",
				justifyContent: "center",
			}}
		>
			<Card style={{ width: "100%", maxWidth: 720 }}>
				<Space orientation="vertical" size="large" style={{ width: "100%" }}>
					<div>
						<Title level={3}>Push Notification Tester</Title>
						<Paragraph>
							Эта страница доступна только в dev и предназначена для быстрой
							проверки FCM токена и отправки тестового пуша через Sygnal.
						</Paragraph>
					</div>

					<Space orientation="vertical" style={{ width: "100%" }}>
						<Text strong>FCM Token status</Text>
						<Text>Permission: {permissionState}</Text>
						{!ready && <Text type="secondary">Идёт регистрация…</Text>}
						{error && (
							<Alert
								type="error"
								showIcon
								title="Не удалось получить FCM токен"
								description={error.message}
							/>
						)}
					</Space>

					<Form
						layout="vertical"
						onFinish={handleTestPush}
						requiredMark="optional"
					>
						<Form.Item
							label="Push key (FCM token)"
							required
							validateStatus={!pushKey ? "error" : ""}
							help={!pushKey ? "FCM токен обязателен" : undefined}
						>
							<Input.TextArea
								value={pushKey}
								autoSize={{ minRows: 3 }}
								placeholder="Вставьте FCM токен"
								onChange={(event) => setPushKey(event.target.value)}
							/>
						</Form.Item>
						<Form.Item label="Message">
							<Input.TextArea
								value={message}
								autoSize={{ minRows: 2 }}
								onChange={(event) => setMessage(event.target.value)}
							/>
						</Form.Item>
						<Button
							type="primary"
							htmlType="submit"
							onClick={handleTestPush}
							disabled={!isFormValid}
							loading={loading}
						>
							Test push notification
						</Button>
					</Form>

					{result && (
						<Alert
							type={result.type}
							title={result.message}
							description={
								result.details ? (
									<pre
										style={{
											margin: 0,
											whiteSpace: "pre-wrap",
											wordBreak: "break-all",
										}}
									>
										{JSON.stringify(result.details, null, 2)}
									</pre>
								) : undefined
							}
							showIcon
						/>
					)}
				</Space>
			</Card>
		</main>
	);
}

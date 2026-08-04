"use client";

import {
	Alert,
	Button,
	Card,
	Form,
	Input,
	InputNumber,
	Space,
	Typography,
} from "antd";
import { useEffect, useState } from "react";

const { Title, Paragraph } = Typography;

type TestResult = {
	type: "success" | "error";
	message: string;
	details?: unknown;
};

export default function DevTelegramTestPage() {
	const [chatId, setChatId] = useState("");
	const [topicId, setTopicId] = useState<number | null>(null);
	const [message, setMessage] = useState(
		"Hello from GDHub dev telegram tester",
	);
	const [result, setResult] = useState<TestResult | null>(null);
	const [botHealth, setBotHealth] = useState<{
		ok: boolean;
		mode?: "test" | "production";
		bot?: { first_name?: string; username?: string };
		reason?: string;
		error?: unknown;
	} | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		fetch("/api/dev/telegram-test")
			.then((r) => r.json())
			.then((data) => {
				setBotHealth({
					ok: !!data?.ok,
					mode: data?.mode,
					bot: data?.bot,
					reason: data?.reason,
					error: data?.error,
				});
			})
			.catch(() => setBotHealth({ ok: false, reason: "fetch failed" }));
	}, []);

	const handleSend = async () => {
		if (!chatId || !message) return;

		setLoading(true);
		setResult(null);

		try {
			const response = await fetch("/api/dev/telegram-test", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					chatId: Number(chatId),
					topicId: topicId || undefined,
					message,
				}),
			});

			const data = await response.json();

			if (response.ok && data.ok) {
				setResult({
					type: "success",
					message: "Message sent successfully",
					details: data,
				});
			} else {
				const errMsg =
					typeof data?.error === "string"
						? data.error
						: data?.error?.description ||
							JSON.stringify(data?.error) ||
							"Failed to send message";
				setResult({
					type: "error",
					message: errMsg,
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
				background: "var(--gd-color-surface-sunken)",
				padding: "40px 16px",
				display: "flex",
				justifyContent: "center",
			}}
		>
			<Card style={{ width: "100%", maxWidth: 720 }}>
				<Space direction="vertical" size="large" style={{ width: "100%" }}>
					<div>
						<Title level={3}>Telegram Bot Tester</Title>
						<Paragraph type="secondary">
							Dev-only page for sending test messages via TelegramService.
						</Paragraph>
					</div>

					<Alert
						type={botHealth?.ok ? "success" : "warning"}
						showIcon
						title={
							botHealth === null
								? "Checking bot..."
								: botHealth.ok
									? `Bot connected: @${botHealth.bot?.username || botHealth.bot?.first_name || "ok"}`
									: `Bot is not available: ${botHealth.reason || JSON.stringify(botHealth.error) || "unknown"}`
						}
						description={
							botHealth?.mode ? (
								<>
									API mode:{" "}
									<strong
										style={{
											color:
												botHealth.mode === "test"
													? "var(--gd-warning-solid)"
													: "var(--gd-success-solid)",
										}}
									>
										{botHealth.mode.toUpperCase()}
									</strong>
									{botHealth.mode === "test" &&
										" — real chats are not available, only test environment chats"}
								</>
							) : undefined
						}
					/>

					<Form layout="vertical" onFinish={handleSend}>
						<Form.Item
							label="Chat ID"
							required
							help="Telegram chat ID (negative for groups)"
						>
							<Input
								value={chatId}
								placeholder="-1001234567890"
								onChange={(e) => setChatId(e.target.value)}
							/>
						</Form.Item>

						<Form.Item
							label="Topic ID"
							help="Message thread ID for forum-style chats (optional)"
						>
							<InputNumber
								value={topicId}
								placeholder="12345"
								style={{ width: "100%" }}
								onChange={(val) => setTopicId(val)}
							/>
						</Form.Item>

						<Form.Item label="Message" required>
							<Input.TextArea
								value={message}
								autoSize={{ minRows: 3 }}
								onChange={(e) => setMessage(e.target.value)}
							/>
						</Form.Item>

						<Button
							type="primary"
							htmlType="submit"
							disabled={!chatId || !message}
							loading={loading}
						>
							Send to Telegram
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

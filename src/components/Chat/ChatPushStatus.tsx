import { IconCircleCheck, IconCircleX } from "@tabler/icons-react";
import { Flex, Typography } from "antd";
import { useChat } from "./useChat";

const { Text } = Typography;

function Row({ ok, label }: { ok: boolean; label: string }) {
	return (
		<Flex align="center" gap={6}>
			{ok ? (
				<IconCircleCheck size={14} color="#52c41a" />
			) : (
				<IconCircleX size={14} color="#ff4d4f" />
			)}
			<Text style={{ fontSize: 12 }}>{label}</Text>
		</Flex>
	);
}

/**
 * Diagnostics for push notifications, shown in the chat info popover. Helps
 * answer "why didn't I get a notification?" — it surfaces browser support,
 * permission, the FCM token and whether the Matrix pusher was registered.
 */
export default function ChatPushStatus() {
	const pushStatus = useChat((s) => s.pushStatus);

	if (!pushStatus) {
		return (
			<Text type="secondary" style={{ fontSize: 12 }}>
				Notifications: checking…
			</Text>
		);
	}

	const allGood =
		pushStatus.supported &&
		pushStatus.permission === "granted" &&
		pushStatus.hasToken &&
		pushStatus.pusherRegistered;

	return (
		<Flex vertical gap={4}>
			<Text strong style={{ fontSize: 12 }}>
				Push notifications {allGood ? "✓ active" : "— not fully set up"}
			</Text>
			<Row ok={pushStatus.supported} label="Supported by this browser" />
			<Row
				ok={pushStatus.permission === "granted"}
				label={`Permission: ${pushStatus.permission}`}
			/>
			<Row ok={pushStatus.hasToken} label="Firebase token obtained" />
			<Row ok={pushStatus.pusherRegistered} label="Matrix pusher registered" />
			{pushStatus.permission === "denied" && (
				<Text type="secondary" style={{ fontSize: 11 }}>
					Notifications are blocked — enable them in the browser site settings.
				</Text>
			)}
			{pushStatus.error && (
				<Text type="danger" style={{ fontSize: 11 }}>
					{pushStatus.error}
				</Text>
			)}
		</Flex>
	);
}

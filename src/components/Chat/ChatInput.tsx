// import { useMatrix } from '@/hooks/useMatrix'
import { Sender } from "@ant-design/x";
import { message } from "antd";
import { EventType, MsgType } from "matrix-js-sdk";
import type { RoomMessageEventContent } from "matrix-js-sdk/lib/@types/events";
import { useState } from "react";
import styles from "./ChatModal.module.scss";
import { useChat } from "./useChat";

export default function ChatInput() {
	const [value, setValue] = useState("");
	const [loading, setLoading] = useState(false);
	const { selectedRoomId, chatClient, ready } = useChat();

	const sendMessage = async (text: string) => {
		if (!selectedRoomId || !chatClient || !ready) return;

		const content: RoomMessageEventContent = {
			msgtype: MsgType.Text,
			body: text,
		};

		await chatClient.sendEvent(selectedRoomId, EventType.RoomMessage, content);
	};

	return (
		<Sender
			loading={loading}
			value={value}
			placeholder="Type a message..."
			className={styles.chatInput}
			onChange={(v) => {
				setValue(v);
			}}
			onSubmit={async () => {
				if (!selectedRoomId || !value.trim()) return;
				setLoading(true);
				try {
					await sendMessage(value.trim());
					setValue("");
				} catch (e) {
					message.error("Failed to send");
				} finally {
					setLoading(false);
				}
			}}
			onCancel={() => {
				setLoading(false);
				message.error("Cancel sending!");
			}}
			autoSize={{ minRows: 1, maxRows: 3 }}
		/>
	);
}

import { Typography } from "antd";
import { useEffect, useState } from "react";
import { resolveRoomDisplayName } from "./roomName";
import { useChat } from "./useChat";

const { Text } = Typography;

export default function ChatTitle() {
	const [title, setTitle] = useState("");
	const { selectedRoomId, chatClient, ready } = useChat();

	useEffect(() => {
		if (!ready) {
			setTitle("");
			return;
		}
		if (!selectedRoomId) {
			setTitle("");
			return;
		}

		const room = chatClient?.getRoom(selectedRoomId);

		setTitle(resolveRoomDisplayName(room, chatClient));
	}, [selectedRoomId, ready, chatClient?.baseUrl, chatClient?.getRoom]);

	return ready && title ? <Text>Chat with {title}</Text> : <Text>Chat</Text>;
}

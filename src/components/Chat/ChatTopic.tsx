import { Flex, Typography } from "antd";
import styles from "./ChatModal.module.scss";
import { useChat } from "./useChat";

const { Text } = Typography;

export default function ChatTopic() {
	const { chatContext } = useChat();

	if (!chatContext) return null;

	return (
		<div className={styles.chatTopicContainer}>
			<Flex vertical style={{ width: "100%" }}>
				<Text strong ellipsis>
					Topic: {chatContext.data?.topic}
				</Text>
				<Text ellipsis>Project: {chatContext.data?.project?.name}</Text>
				<Text ellipsis>Comment: {chatContext.data?.comment}</Text>
			</Flex>
		</div>
	);
}

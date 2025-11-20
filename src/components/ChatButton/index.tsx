import { AiOutlineMessage } from "@react-icons/all-files/ai/AiOutlineMessage";
import { Badge, Button } from "antd";
import { useChat } from "@/components/Chat/useChat";

export const ChatButton = ({
	onClick,
}: {
	onClick: (open: boolean) => void;
}) => {
	const { unreadTotal } = useChat();
	return (
		<Badge
			count={unreadTotal}
			overflowCount={99}
			size="small"
			color="red"
			offset={[-6, 22]}
		>
			<Button
				type="text"
				shape="circle"
				onClick={() => onClick(true)}
				icon={<AiOutlineMessage />}
			/>
		</Badge>
	);
};

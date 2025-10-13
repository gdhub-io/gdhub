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
		<Badge count={unreadTotal} dot offset={[-10, 14]}>
			<Button
				type="text"
				shape="circle"
				onClick={() => onClick(true)}
				icon={<AiOutlineMessage />}
			/>
		</Badge>
	);
};

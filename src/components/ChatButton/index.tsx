import { AiOutlineMessage } from "@react-icons/all-files/ai/AiOutlineMessage";
import { Badge, Button } from "antd";

export const ChatButton = ({
	onClick,
}: {
	onClick: (open: boolean) => void;
}) => {
	return (
		<Badge dot color="red" offset={[-10, 26]}>
			<Button
				type="text"
				shape="circle"
				onClick={() => onClick(true)}
				icon={<AiOutlineMessage />}
			/>
		</Badge>
	);
};

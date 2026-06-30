import { Prompts, Welcome } from "@ant-design/x";
import axios from "axios";
import { useState } from "react";
import { useChat } from "../useChat";
import styles from "./style.module.scss";

// fire-and-forget: tell the backend to notify the inviter (Novu inbox)
function notifyInviteResponse(roomId: string, action: "accepted" | "declined") {
	axios
		.post(`/api/chat/rooms/${encodeURIComponent(roomId)}/invite-response`, {
			action,
		})
		.catch(() => {});
}

export default function VacancyChatInvite() {
	const [isJoining, setIsJoining] = useState(false);
	const [isDeclining, setIsDeclining] = useState(false);
	const { selectedRoomId, chatClient, chatContext } = useChat();

	const vacancyTitle = chatContext?.data?.vacancy?.title;
	const projectName = chatContext?.data?.project?.name;
	const description = vacancyTitle
		? `Invitation to discuss the vacancy "${vacancyTitle}"${
				projectName ? ` on ${projectName}` : ""
			}. Accept to start messaging.`
		: "You were invited to discuss a vacancy. Accept to start messaging.";

	return (
		<div className={styles.chatMessages} style={{ paddingInline: 16 }}>
			<Welcome title="Invitation pending" description={description} />
			<div style={{ marginTop: 12 }}>
				<Prompts
					title="Actions"
					items={[
						{ key: "accept", label: "Accept invite" },
						{ key: "decline", label: "Decline invite" },
					]}
					onItemClick={async ({ data }) => {
						if (!selectedRoomId || !chatClient) return;
						if (data.key === "accept") {
							try {
								setIsJoining(true);
								await chatClient.joinRoom(selectedRoomId);
								notifyInviteResponse(selectedRoomId, "accepted");
							} finally {
								setIsJoining(false);
							}
						}
						if (data.key === "decline") {
							try {
								setIsDeclining(true);
								await chatClient.leave(selectedRoomId);
								notifyInviteResponse(selectedRoomId, "declined");
							} finally {
								setIsDeclining(false);
							}
						}
					}}
					styles={{
						item: {
							cursor: isJoining || isDeclining ? "not-allowed" : "pointer",
							opacity: isJoining || isDeclining ? 0.6 : 1,
						},
					}}
				/>
			</div>
		</div>
	);
}

import { Prompts, Welcome } from "@ant-design/x";
import { useState } from "react";
import { useChat } from "../useChat";
import styles from "./style.module.scss";

export default function AdviceRequestInvite() {
	const [isJoining, setIsJoining] = useState(false);
	const [isDeclining, setIsDeclining] = useState(false);
	const { selectedRoomId, chatClient, chatContext } = useChat();

	return (
		<div className={styles.chatMessages} style={{ paddingInline: 16 }}>
			<Welcome
				title="Invitation pending"
				description={`Your advice request was accepted. Accept to start messaging with ${chatContext?.data?.toUser?.name || "the expert"}.`}
			/>
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
							} finally {
								setIsJoining(false);
							}
						}
						if (data.key === "decline") {
							try {
								setIsDeclining(true);
								await chatClient.leave(selectedRoomId);
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

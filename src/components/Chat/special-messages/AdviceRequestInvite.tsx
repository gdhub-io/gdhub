import { Prompts, Welcome } from "@ant-design/x";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Typography } from "antd";
import axios from "axios";
import { useChat } from "../useChat";
import styles from "./style.module.scss";

const { Text, Paragraph } = Typography;

export default function AdviceRequestInvite({
	adviceRequestId,
}: {
	adviceRequestId: string;
}) {
	const { selectedRoomId, chatClient, setUserMembership } = useChat();

	const { data: adviceRequest, isLoading: isLoadingAdviceRequest } = useQuery({
		queryKey: ["adviceRequest", adviceRequestId],
		queryFn: () =>
			axios
				.get(`/api/user/advice-request/${adviceRequestId}`)
				.then((res) => res.data),
	});

	const { mutateAsync: acceptAdviceRequest, isPending: isAccepting } =
		useMutation({
			mutationFn: (id: string) =>
				axios.put(`/api/user/advice-request/${id}/accept`),
			onSuccess: async () => {
				if (!selectedRoomId || !chatClient) return;
				await chatClient.joinRoom(selectedRoomId);
				const room = chatClient.getRoom(selectedRoomId);
				setUserMembership(room?.getMyMembership() || null);
			},
		});

	const { mutateAsync: declineAdviceRequest, isPending: isDeclining } =
		useMutation({
			mutationFn: (id: string) =>
				axios.put(`/api/user/advice-request/${id}/decline`),
			onSuccess: async () => {
				if (!selectedRoomId || !chatClient) return;
				await chatClient.leave(selectedRoomId);
				const room = chatClient.getRoom(selectedRoomId);
				setUserMembership(room?.getMyMembership() || null);
			},
		});

	if (!adviceRequest) return null;

	return (
		<div className={styles.chatMessages} style={{ paddingInline: 16 }}>
			<Welcome
				title="Waiting for a response"
				description={
					<Paragraph>
						<Text>
							You have received a consultation request regarding the topic
							&quot;
							{adviceRequest.topic}&quot; from {adviceRequest.fromUser.name}{" "}
							from the project {adviceRequest.project.name}
						</Text>

						{!!adviceRequest.comment && (
							<blockquote>{adviceRequest.comment}</blockquote>
						)}

						<Text>Accept to start messaging or decline the request.</Text>
					</Paragraph>
				}
			/>
			<div style={{ marginTop: 12 }}>
				<Prompts
					items={[
						{ key: "accept", label: "Accept request" },
						{ key: "decline", label: "Decline request" },
					]}
					onItemClick={async ({ data }) => {
						if (!selectedRoomId || !chatClient) return;

						if (data.key === "accept") {
							await acceptAdviceRequest(adviceRequestId);
						}

						if (data.key === "decline") {
							await declineAdviceRequest(adviceRequestId);
						}
					}}
					styles={{
						item: {
							cursor:
								isAccepting || isDeclining || isLoadingAdviceRequest
									? "not-allowed"
									: "pointer",
							opacity:
								isAccepting || isDeclining || isLoadingAdviceRequest ? 0.6 : 1,
						},
					}}
				/>
			</div>
		</div>
	);
}

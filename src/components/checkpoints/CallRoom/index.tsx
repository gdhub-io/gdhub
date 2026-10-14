"use client";

import { IconVideoOff } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Skeleton } from "antd";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useChat } from "@/components/Chat/useChat";
import { EmptyState } from "@/components/ui";
import { useCheckpointCall } from "@/hooks/checkpoint-call";
import { useCheckpointChat } from "@/hooks/checkpoints";
import { CallGoal } from "./CallGoal";
import { CallHeader, callTime } from "./CallHeader";
import { CallPanel } from "./CallPanel";
import { CallClosed, CallLayout } from "./CallParts";

// Daily touches the browser's media APIs as it loads.
const OpenCall = dynamic(
	() => import("./DailyRoom").then((module) => module.OpenCall),
	{ ssr: false, loading: () => <Skeleton active paragraph={{ rows: 8 }} /> },
);

export type CallRoomProps = {
	checkpointId: string;
	index: number;
	backHref: string;
};

/**
 * A checkpoint call, for its curator and its team alike. The room is Daily's;
 * who may enter it and when is the server's, asked again while waiting.
 */
export function CallRoom({ checkpointId, index, backHref }: CallRoomProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const [joined, setJoined] = useState(false);
	const {
		data: call,
		isPending,
		refetch,
	} = useCheckpointCall(checkpointId, index, { poll: !joined });
	const openChat = useCheckpointChat(checkpointId);

	if (isPending) return <Skeleton active paragraph={{ rows: 8 }} />;

	if (!call) {
		return (
			<EmptyState
				icon={IconVideoOff}
				description={t(
					"checkpoints.call.missing",
					"This call is not one of yours, or its checkpoint is not running.",
				)}
			/>
		);
	}

	const chat = () =>
		openChat.mutate(undefined, {
			onSuccess: ({ roomId }) => {
				const { setSelectedRoomId, setOpenChatModal } = useChat.getState();
				setSelectedRoomId(roomId);
				setOpenChatModal(true);
			},
			onError: () =>
				message.error(
					t("workflow.aside.chatFailed", "The chat could not open"),
				),
		});

	const copyLink = () =>
		navigator.clipboard
			.writeText(window.location.href)
			.then(() =>
				message.success(t("checkpoints.call.linkCopied", "Link copied")),
			);

	const header = {
		backHref,
		onChat: chat,
		chatLoading: openChat.isPending,
		onCopyLink: copyLink,
	};

	const below = (
		<>
			<CallGoal call={call} />
			<CallPanel call={call} />
		</>
	);

	if (call.state === "open") {
		return (
			<OpenCall
				call={call}
				header={header}
				onJoinedChange={setJoined}
				refetch={refetch}
				below={below}
			/>
		);
	}

	return (
		<CallLayout
			header={<CallHeader {...header} call={call} joined={false} />}
			stage={
				call.state === "early" ? (
					<CallClosed
						over={false}
						title={t("checkpoints.call.opensAt", "The room opens at {time}", {
							time: callTime(call.opensAt),
						})}
						text={t(
							"checkpoints.call.startsAtLine",
							"The call starts at {time}.",
							{
								time: callTime(call.scheduledAt),
							},
						)}
					/>
				) : (
					<CallClosed
						over
						title={t("checkpoints.call.over", "This call is over")}
						text={t(
							"checkpoints.call.overLine",
							"The plan and the notes from it are below.",
						)}
					/>
				)
			}
			below={below}
		/>
	);
}

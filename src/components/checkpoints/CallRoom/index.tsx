"use client";

import { IconVideoOff } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App } from "antd";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useChat } from "@/components/Chat/useChat";
import {
	CuratorAside,
	teamProject,
} from "@/components/checkpoints/CuratorReview/CuratorAside";
import { CuratorReviewSkeleton } from "@/components/checkpoints/CuratorReview/CuratorReviewSkeleton";
import { PreviousVerdict } from "@/components/checkpoints/CuratorReview/PreviousVerdict";
import { EmptyState } from "@/components/ui";
import { CheckpointSessionContentStatus } from "@/config/prisma-enums";
import { useCheckpointCall } from "@/hooks/checkpoint-call";
import { useCheckpointChat } from "@/hooks/checkpoints";
import { useAddressPick } from "@/hooks/useAddressPick";
import type { PathTab } from "@/lib/checkpoint-hrefs";
import { CallGoal } from "./CallGoal";
import { CallHeader } from "./CallHeader";
import { CallPanel } from "./CallPanel";
import { CallLayout } from "./CallParts";
import { ClosedStage } from "./ClosedStage";

// Daily touches the browser's media APIs as it loads.
const OpenCall = dynamic(
	() => import("./DailyRoom").then((module) => module.OpenCall),
	{ ssr: false, loading: () => <CuratorReviewSkeleton /> },
);

export type CallRoomProps = {
	checkpointId: string;
	index: number;
	backHref: string;
	/** The tab a link asked for. */
	tab?: PathTab;
};

/**
 * A checkpoint call, for its curator and its team alike. The room is Daily's;
 * who may enter it and when is the server's, asked again while waiting.
 */
export function CallRoom({
	checkpointId,
	index,
	backHref,
	tab: asked,
}: CallRoomProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const [joined, setJoined] = useState(false);
	const [tab, setTab] = useAddressPick<PathTab>("tab", asked ?? null);
	const {
		data: call,
		isPending,
		refetch,
	} = useCheckpointCall(checkpointId, index, { poll: !joined });
	const openChat = useCheckpointChat(checkpointId);

	if (isPending) return <CuratorReviewSkeleton />;

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
			{call.previous && (
				<PreviousVerdict
					previous={call.previous}
					resultsHref={
						call.role === "team"
							? `/user/project/${call.project.slug}/workflow?results=${call.previous.checkpointId}`
							: undefined
					}
				/>
			)}
			<CallGoal call={call} />
			<CallPanel call={call} picked={tab} onPick={setTab} />
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

	const notesReady =
		call.sessions.find((session) => session.index === call.index)
			?.contentStatus === CheckpointSessionContentStatus.Ready;

	return (
		<CallLayout
			header={<CallHeader {...header} call={call} joined={false} />}
			stage={
				<ClosedStage
					call={call}
					notesReady={notesReady}
					onChat={chat}
					chatLoading={openChat.isPending}
					onOpenReview={() => setTab("review")}
				/>
			}
			aside={
				<CuratorAside
					projectId={teamProject(call)}
					checkpointId={call.checkpointId}
				/>
			}
			below={below}
		/>
	);
}

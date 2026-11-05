import { useTranslate } from "@tolgee/react";
import { App } from "antd";
import {
	ClientEvent,
	type MatrixClient,
	type MatrixEvent,
	PushRuleKind,
} from "matrix-js-sdk";
import { useCallback, useEffect, useState } from "react";
import { PUSH_RULES_EVENT } from "./matrix-events";
import { mutedRoomIds, muteRuleBody } from "./model/mute";
import { useChat } from "./useChat";

/** Muted room ids, re-read whenever the push rules come down the sync. */
export function useMutedRooms(): Set<string> {
	const chatClient = useChat((s) => s.chatClient);
	const [muted, setMuted] = useState(() => mutedRoomIds(chatClient?.pushRules));

	useEffect(() => {
		if (!chatClient) return;
		setMuted(mutedRoomIds(chatClient.pushRules));
		const onAccountData = (event: MatrixEvent) => {
			if (event.getType() === PUSH_RULES_EVENT) {
				setMuted(mutedRoomIds(chatClient.pushRules));
			}
		};
		chatClient.on(ClientEvent.AccountData, onAccountData);
		return () => {
			chatClient.removeListener(ClientEvent.AccountData, onAccountData);
		};
	}, [chatClient]);

	return muted;
}

async function writeMute(client: MatrixClient, roomId: string, mute: boolean) {
	if (mute) {
		await client.addPushRule(
			"global",
			PushRuleKind.Override,
			roomId,
			muteRuleBody(roomId),
		);
		return;
	}
	const global = client.pushRules?.global;
	const deletions: Promise<unknown>[] = [];
	if (global?.override?.some((rule) => rule.rule_id === roomId)) {
		deletions.push(
			client.deletePushRule("global", PushRuleKind.Override, roomId),
		);
	}
	// A mute set by another Matrix client.
	if (global?.room?.some((rule) => rule.rule_id === roomId)) {
		deletions.push(
			client.deletePushRule("global", PushRuleKind.RoomSpecific, roomId),
		);
	}
	await Promise.all(deletions);
}

/** Mute or unmute any room; the sync's push-rules update re-renders the list. */
export function useSetRoomMute() {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const chatClient = useChat((s) => s.chatClient);

	return useCallback(
		(roomId: string, mute: boolean) => {
			if (!chatClient) return;
			writeMute(chatClient, roomId, mute).catch(() => {
				message.error(
					mute
						? t("chat.mute.error", "Couldn't mute the chat")
						: t("chat.mute.unmuteError", "Couldn't unmute the chat"),
				);
			});
		},
		[chatClient, message, t],
	);
}

import { EventType, MsgType } from "matrix-js-sdk";
import type { RoomMessageEventContent } from "matrix-js-sdk/lib/@types/events";
import { useChat } from "../useChat";
import { ChatComposer } from "./index";

/**
 * Sends without waiting: the local echo shows at once as "Sending…", and a
 * failure stays in the timeline with Retry instead of a toast.
 */
export function ConnectedComposer({ roomId }: { roomId: string }) {
	const draft = useChat((s) => s.drafts[roomId] ?? "");
	const mode = useChat((s) => s.modes[roomId] ?? null);
	const { setDraft, setMode } = useChat.getState();

	const submit = () => {
		const text = draft.trim();
		const client = useChat.getState().chatClient;
		if (!text || !client) return;

		let content: RoomMessageEventContent;
		if (mode?.type === "edit") {
			if (text === mode.original.trim()) {
				setMode(roomId, null);
				return;
			}
			content = {
				msgtype: MsgType.Text,
				body: `* ${text}`,
				"m.new_content": { msgtype: MsgType.Text, body: text },
				"m.relates_to": { rel_type: "m.replace", event_id: mode.eventId },
			} as RoomMessageEventContent;
		} else {
			content = {
				msgtype: MsgType.Text,
				body: text,
				...(mode?.type === "reply" && {
					"m.relates_to": { "m.in_reply_to": { event_id: mode.eventId } },
				}),
			} as RoomMessageEventContent;
		}

		client
			.sendEvent(roomId, EventType.RoomMessage, content)
			.catch(() => undefined);
		setMode(roomId, null);
		setDraft(roomId, "");
	};

	return (
		<ChatComposer
			autoFocus
			value={draft}
			onChange={(value) => setDraft(roomId, value)}
			onSubmit={submit}
			mode={mode}
			onCancelMode={() => setMode(roomId, null)}
		/>
	);
}

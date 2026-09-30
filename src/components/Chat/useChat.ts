import type * as sdk from "matrix-js-sdk";
import { create } from "zustand";

export type PushStatus = {
	supported: boolean;
	permission: NotificationPermission;
	hasToken: boolean;
	pusherRegistered: boolean;
	error: string | null;
};

/** What the composer is doing besides writing a new message. */
export type ComposerMode =
	| { type: "reply"; eventId: string; senderName: string; preview: string }
	| { type: "edit"; eventId: string; original: string };

export type ChatStore = {
	ready: boolean;
	/** The first sync failed and has not recovered yet. */
	syncError: boolean;
	openChatModal: boolean;
	selectedRoomId: string | null;
	chatClient: sdk.MatrixClient | null;
	unreadTotal: number;
	pushStatus: PushStatus | null;
	/** Per room, so a draft survives going back to the list. */
	drafts: Record<string, string>;
	modes: Record<string, ComposerMode | null>;
	setDraft: (roomId: string, draft: string) => void;
	setMode: (roomId: string, mode: ComposerMode | null) => void;
	setOpenChatModal: (openChatModal: boolean) => void;
	setReady: (ready: boolean) => void;
	setSyncError: (syncError: boolean) => void;
	setSelectedRoomId: (selectedRoomId: string | null) => void;
	setSelectedRoomByAlias: (alias: string) => Promise<void>;
	setChatClient: (chatClient: sdk.MatrixClient | null) => void;
	setUnreadTotal: (unreadTotal: number) => void;
	setPushStatus: (pushStatus: PushStatus | null) => void;
};

export const useChat = create<ChatStore>((set, get) => ({
	ready: false,
	syncError: false,
	openChatModal: false,
	selectedRoomId: null,
	chatClient: null,
	unreadTotal: 0,
	pushStatus: null,
	drafts: {},
	modes: {},
	setDraft: (roomId, draft) =>
		set((s) => ({ drafts: { ...s.drafts, [roomId]: draft } })),
	// Editing takes over the textarea with the message; leaving edit clears it.
	setMode: (roomId, mode) =>
		set((s) => ({
			modes: { ...s.modes, [roomId]: mode },
			drafts:
				mode?.type === "edit"
					? { ...s.drafts, [roomId]: mode.original }
					: s.modes[roomId]?.type === "edit"
						? { ...s.drafts, [roomId]: "" }
						: s.drafts,
		})),
	setChatClient: (chatClient: sdk.MatrixClient | null) => set({ chatClient }),
	setUnreadTotal: (unreadTotal: number) => set({ unreadTotal }),
	setPushStatus: (pushStatus: PushStatus | null) => set({ pushStatus }),
	setReady: (ready: boolean) => set({ ready }),
	setSyncError: (syncError: boolean) => set({ syncError }),
	setOpenChatModal: (openChatModal: boolean) => set({ openChatModal }),
	setSelectedRoomId: (selectedRoomId: string | null) => set({ selectedRoomId }),
	setSelectedRoomByAlias: async (alias: string) => {
		const room = await get().chatClient?.getRoomIdForAlias(
			`#${alias}:${process.env.NEXT_PUBLIC_MATRIX_CHAT_HOMESERVER_DOMAIN}`,
		);
		set({ selectedRoomId: room?.room_id || null });
	},
}));

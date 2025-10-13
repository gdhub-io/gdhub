import type * as sdk from "matrix-js-sdk";
import { create } from "zustand";
import type { MatrixSession } from "@/services/matrix";

export type ChatStore = {
	ready: boolean;
	openChatModal: boolean;
	selectedRoomId: string | null;
	chatSession: MatrixSession | null;
	chatClient: sdk.MatrixClient | null;
	userMembership: string | null;
	chatContext: {
		type: string;
		data: Record<string, any> | null;
	} | null;
	setChatContext: (
		chatContext: {
			type: string;
			data: Record<string, any> | null;
		} | null,
	) => void;
	setOpenChatModal: (openChatModal: boolean) => void;
	setReady: (ready: boolean) => void;
	setSelectedRoomId: (selectedRoomId: string) => void;
	setSelectedRoomByAlias: (alias: string) => Promise<void>;
	setChatSession: (chatSession: MatrixSession) => void;
	setChatClient: (chatClient: sdk.MatrixClient | null) => void;
	setUserMembership: (userMembership: string | null) => void;
};

export const useChat = create<ChatStore>((set, get, store) => ({
	ready: false,
	openChatModal: false,
	selectedRoomId: null,
	chatSession: null,
	chatClient: null,
	userMembership: null,
	chatContext: null,
	setChatContext: (
		chatContext: {
			type: string;
			data: Record<string, any> | null;
		} | null,
	) => set({ chatContext }),
	setChatClient: (chatClient: sdk.MatrixClient | null) => set({ chatClient }),
	setUserMembership: (userMembership: string | null) => set({ userMembership }),
	setReady: (ready: boolean) => set({ ready }),
	setOpenChatModal: (openChatModal: boolean) => set({ openChatModal }),
	setSelectedRoomId: (selectedRoomId: string) => set({ selectedRoomId }),
	setSelectedRoomByAlias: async (alias: string) => {
		const room = await get().chatClient?.getRoomIdForAlias(
			`#${alias}:${process.env.NEXT_PUBLIC_MATRIX_CHAT_HOMESERVER_DOMAIN}`,
		);
		set({ selectedRoomId: room?.room_id || null });
	},
	setChatSession: (chatSession: MatrixSession) =>
		set({ chatSession, ready: !!chatSession }),
	reset: () => {
		set(store.getInitialState());
	},
}));

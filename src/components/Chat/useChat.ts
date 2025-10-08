import { MatrixSession } from '@/services/matrix'
import * as sdk from 'matrix-js-sdk'
import { create } from 'zustand'

export type ChatStore = {
	ready: boolean
	opened: boolean
	selectedRoomId: string | null
	chatSession: MatrixSession | null
	chatClient: sdk.MatrixClient | null
	setOpened: (opened: boolean) => void
	setReady: (ready: boolean) => void
	setSelectedRoomId: (selectedRoomId: string) => void
	setChatSession: (chatSession: MatrixSession) => void
	setChatClient: (chatClient: sdk.MatrixClient | null) => void
}

export const useChat = create<ChatStore>((set, get, store) => ({
	ready: false,
	opened: false,
	selectedRoomId: null,
	chatSession: null,
	chatClient: null,
	setChatClient: (chatClient: sdk.MatrixClient | null) => set({ chatClient }),
	setReady: (ready: boolean) => set({ ready }),
	setOpened: (opened: boolean) => set({ opened }),
	setSelectedRoomId: (selectedRoomId: string) => set({ selectedRoomId }),
	setChatSession: (chatSession: MatrixSession) => set({ chatSession, ready: !!chatSession }),
	reset: () => {
		set(store.getInitialState())
	},
}))

import { createContext, useContext, useState } from 'react'

export const ChatContext = createContext<{
	selectedRoomId: string
	setSelectedRoomId: (roomId: string) => void
}>({
	selectedRoomId: '',
	setSelectedRoomId: () => {},
})

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
	const [selectedRoomId, setSelectedRoomId] = useState('')

	return <ChatContext.Provider value={{ selectedRoomId, setSelectedRoomId }}>{children}</ChatContext.Provider>
}

export const useChat = () => {
	return useContext(ChatContext)
}

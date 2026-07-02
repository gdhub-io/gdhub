import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useChat } from "@/components/Chat/useChat";

export type MyOpenPosition = {
	id: string;
	title: string;
	project: { id: string; name: string } | null;
};

/** Published vacancies across the current user's own projects. */
export function useMyOpenPositions(enabled: boolean) {
	return useQuery({
		queryKey: ["my-open-positions"],
		queryFn: () =>
			axios
				.get<MyOpenPosition[]>("/api/user/project/vacancies/my")
				.then((res) => res.data),
		enabled,
	});
}

type OpenVacancyChatArgs = {
	vacancyId: string;
	candidateUserId: string;
	message?: string;
	/**
	 * Reveal the chat drawer after the call. Default true (candidate card, where
	 * the author starts a live conversation). Talent-pool offers pass false —
	 * the specialist must accept the invite first, so nothing to show yet.
	 */
	openDrawer?: boolean;
};

/**
 * Open (or create) the vacancy chat with a candidate/specialist. Optionally
 * switches the chat drawer to it. Shared by the candidate card and the
 * talent-pool offer.
 */
export function useOpenVacancyChat() {
	const { setSelectedRoomId, setOpenChatModal } = useChat();

	const mutation = useMutation({
		mutationFn: ({ openDrawer: _o, ...data }: OpenVacancyChatArgs) =>
			axios
				.post<{ roomId: string }>("/api/chat/rooms/vacancy", data)
				.then((res) => res.data),
	});

	const openVacancyChat = async (data: OpenVacancyChatArgs) => {
		const result = await mutation.mutateAsync(data);
		if (result.roomId && data.openDrawer !== false) {
			setSelectedRoomId(result.roomId);
			setOpenChatModal(true);
		}
		return result;
	};

	return { openVacancyChat, isOpening: mutation.isPending };
}

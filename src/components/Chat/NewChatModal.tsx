import { useQuery } from "@tanstack/react-query";
import { Modal, message, Select, Space } from "antd";
import axios from "axios";
import { ClientEvent, type Room } from "matrix-js-sdk";
import { useState } from "react";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { useChat } from "./useChat";

type UserOption = {
	id: string;
	name: string | null;
	email: string;
	image: string | null;
};

type NewChatModalProps = {
	open: boolean;
	onClose: () => void;
};

export default function NewChatModal({ open, onClose }: NewChatModalProps) {
	const { chatClient, setSelectedRoomId } = useChat();
	const [search, setSearch] = useState("");
	const [selected, setSelected] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);

	const { data: users = [], isFetching } = useQuery({
		queryKey: ["user-search", search],
		queryFn: () =>
			axios
				.get<UserOption[]>("/api/users/search", { params: { q: search } })
				.then((res) => res.data),
		enabled: open,
	});

	const close = () => {
		setSelected(null);
		setSearch("");
		onClose();
	};

	const selectRoomAndClose = (roomId: string) => {
		setSelectedRoomId(roomId);
		close();
	};

	const handleCreate = async () => {
		if (!selected || !chatClient) return;

		setCreating(true);
		try {
			// The server dedups by directKey (direct:{minId}:{maxId}) and returns
			// the existing Direct room if there is one — no client-side scan, which
			// used to conflate typed chats (vacancy/advice) with a Direct DM.
			const { data } = await axios.post<{ roomId: string }>(
				"/api/chat/rooms/direct",
				{ toUserId: selected },
			);
			const { roomId } = data;

			// the room may not be in the local sync yet — wait for it
			if (chatClient.getRoom(roomId)) {
				selectRoomAndClose(roomId);
				return;
			}

			let settled = false;
			const finish = () => {
				if (settled) return;
				settled = true;
				chatClient.removeListener(ClientEvent.Room, onRoom);
				selectRoomAndClose(roomId);
			};
			const onRoom = (room: Room) => {
				if (room.roomId === roomId) finish();
			};
			chatClient.on(ClientEvent.Room, onRoom);
			// safety net in case the sync event is missed
			setTimeout(finish, 5000);
		} catch (error) {
			console.error("[NewChatModal] failed to create chat", error);
			message.error("Failed to create chat");
		} finally {
			setCreating(false);
		}
	};

	return (
		<Modal
			title="New chat"
			open={open}
			onCancel={close}
			onOk={handleCreate}
			okText="Create chat"
			confirmLoading={creating}
			okButtonProps={{ disabled: !selected }}
			destroyOnHidden
		>
			<Select
				showSearch
				value={selected ?? undefined}
				placeholder="Search for a user by name or email"
				style={{ width: "100%" }}
				filterOption={false}
				onSearch={setSearch}
				onChange={(value: string) => setSelected(value)}
				loading={isFetching}
				notFoundContent={isFetching ? "Searching..." : "No users found"}
				options={users.map((u) => ({
					value: u.id,
					label: (
						<Space>
							<AppAvatar size="small" src={u.image}>
								{(u.name || u.email)?.[0]?.toUpperCase()}
							</AppAvatar>
							{u.name || u.email}
						</Space>
					),
				}))}
			/>
		</Modal>
	);
}

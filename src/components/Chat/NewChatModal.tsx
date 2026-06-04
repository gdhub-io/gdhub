import { useQuery } from "@tanstack/react-query";
import { Avatar, Modal, message, Select, Space } from "antd";
import axios from "axios";
import { ClientEvent, type Room } from "matrix-js-sdk";
import { useState } from "react";
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

const DOMAIN = process.env.NEXT_PUBLIC_MATRIX_CHAT_HOMESERVER_DOMAIN;

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

	// platform user ids that already have a 1-1 room with the current user —
	// they are hidden from the picker so we never create duplicate DMs
	const existingPartnerIds = (() => {
		const ids = new Set<string>();
		if (!chatClient) return ids;
		const myId = chatClient.getUserId();
		for (const r of chatClient.getRooms() || []) {
			if (!["join", "invite"].includes(r.getMyMembership())) continue;
			const members = r.getMembers();
			if (members.length > 2) continue;
			const other = members.find((m) => m.userId !== myId);
			const localpart = other?.userId.match(/^@([^:]+):/)?.[1];
			if (localpart) ids.add(localpart);
		}
		return ids;
	})();

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
			const targetMatrixId = `@${selected}:${DOMAIN}`;

			// reuse an existing direct room with this user if there is one
			const existing = (chatClient.getRooms() || []).find((r) => {
				if (!["join", "invite"].includes(r.getMyMembership())) return false;
				const members = r.getMembers();
				return (
					members.length <= 2 &&
					members.some((m) => m.userId === targetMatrixId)
				);
			});

			if (existing) {
				selectRoomAndClose(existing.roomId);
				return;
			}

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
			destroyOnClose
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
				options={users
					.filter((u) => !existingPartnerIds.has(u.id))
					.map((u) => ({
						value: u.id,
						label: (
							<Space>
								<Avatar size="small" src={u.image}>
									{(u.name || u.email)?.[0]?.toUpperCase()}
								</Avatar>
								{u.name || u.email}
							</Space>
						),
					}))}
			/>
		</Modal>
	);
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Avatar, Form, Modal, message, Select, Spin } from "antd";
import axios from "axios";
import debounce from "lodash/debounce";
import type React from "react";
import { useMemo, useState } from "react";

interface UserOption {
	id: string;
	name?: string | null;
	email?: string | null;
	image?: string | null;
}

interface AddEventMembersModalProps {
	open: boolean;
	eventId: string;
	onCancel: () => void;
	onSaved?: () => void;
}

const AddEventMembersModal: React.FC<AddEventMembersModalProps> = ({
	open,
	eventId,
	onCancel,
	onSaved,
}) => {
	const { t } = useTranslate();
	const queryClient = useQueryClient();
	const [form] = Form.useForm();
	const [search, setSearch] = useState("");

	const { data: users = [], isFetching } = useQuery({
		queryKey: ["user-search", search],
		queryFn: () =>
			axios
				.get<UserOption[]>("/api/users/search", { params: { q: search } })
				.then((r) => r.data),
		enabled: open,
	});

	const options = useMemo(
		() =>
			users.map((u) => ({
				label: u.name || u.email || u.id,
				value: u.id,
				image: u.image,
				email: u.email,
			})),
		[users],
	);

	const handleSearch = useMemo(
		() => debounce((value: string) => setSearch(value), 400),
		[],
	);

	const { mutateAsync: save, isPending: isSaving } = useMutation({
		mutationFn: (values: { userIds: string[] }) =>
			axios
				.post<{ added: number; skipped: number }>(
					`/api/user/event/${eventId}/members`,
					{ userIds: values.userIds },
				)
				.then((r) => r.data),
		onSuccess: (data) => {
			if (data.added) {
				message.success(
					t("event.members.add.success", "Added {count} member(s)", {
						count: data.added,
					}),
				);
			}
			if (data.skipped) {
				message.info(
					t(
						"event.members.add.skipped",
						"{count} user(s) were already members and were skipped",
						{ count: data.skipped },
					),
				);
			}
			queryClient.invalidateQueries({ queryKey: ["event-members", eventId] });
			onSaved?.();
		},
		onError: (error: unknown) => {
			const msg =
				(error as { response?: { data?: { message?: string } } })?.response
					?.data?.message ||
				t("event.members.add.error", "Failed to add members");
			message.error(msg);
		},
	});

	const handleSubmit = async () => {
		const values = await form.validateFields();
		await save({ userIds: values.userIds });
	};

	return (
		<Modal
			open={open}
			title={t("event.members.add.title", "Add members")}
			centered
			onCancel={onCancel}
			onOk={handleSubmit}
			okText={t("event.members.add.submit", "Add")}
			cancelText={t("common.cancel", "Cancel")}
			confirmLoading={isSaving}
			destroyOnHidden
			afterClose={() => setSearch("")}
		>
			<Form form={form} layout="vertical" variant="filled">
				<Form.Item
					name="userIds"
					rules={[
						{
							required: true,
							message: t(
								"event.members.add.users.required",
								"Select at least one user",
							),
						},
					]}
				>
					<Select
						mode="multiple"
						showSearch
						allowClear
						placeholder={t(
							"event.members.add.users.placeholder",
							"Search for a user by name or email",
						)}
						filterOption={false}
						onSearch={handleSearch}
						options={options}
						loading={isFetching}
						optionLabelProp="label"
						notFoundContent={
							isFetching ? (
								<Spin size="small" />
							) : (
								t("event.members.add.users.empty", "No users found")
							)
						}
						optionRender={(option) => {
							const data = option.data as {
								label: string;
								image?: string | null;
								email?: string | null;
							};
							return (
								<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
									<Avatar size={24} src={data.image ?? undefined}>
										{!data.image && data.label ? data.label[0] : null}
									</Avatar>
									<div>
										<div>{data.label}</div>
										{data.email && data.email !== data.label && (
											<div style={{ fontSize: 12, color: "#888" }}>
												{data.email}
											</div>
										)}
									</div>
								</div>
							);
						}}
					/>
				</Form.Item>
			</Form>
		</Modal>
	);
};

export default AddEventMembersModal;

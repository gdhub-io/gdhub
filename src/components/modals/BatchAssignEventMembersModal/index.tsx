import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Alert,
	Avatar,
	Form,
	Modal,
	message,
	Select,
	Spin,
	Typography,
} from "antd";
import axios from "axios";
import debounce from "lodash/debounce";
import qs from "qs";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

interface CommonProject {
	id: string;
	name: string;
	slug: string;
}

interface SpecialityOption {
	id: string;
	name: string;
	image?: string | null;
	speciality?: string | null;
	direction?: string | null;
}

interface BatchAssignEventMembersModalProps {
	open: boolean;
	eventId: string;
	memberIds: string[];
	onCancel: () => void;
	onSaved?: () => void;
}

const BatchAssignEventMembersModal: React.FC<
	BatchAssignEventMembersModalProps
> = ({ open, eventId, memberIds, onCancel, onSaved }) => {
	const { t } = useTranslate();
	const queryClient = useQueryClient();
	const [form] = Form.useForm();
	const [mentorSearch, setMentorSearch] = useState("");

	const { data: commonProjects = [], isFetching: isCommonProjectsLoading } =
		useQuery({
			queryKey: ["event-members-common-projects", eventId, memberIds.join(",")],
			queryFn: () =>
				axios
					.get<CommonProject[]>(
						`/api/user/event/${eventId}/members/common-projects`,
						{
							params: { memberIds },
							paramsSerializer: (params) =>
								qs.stringify(params, { arrayFormat: "repeat" }),
						},
					)
					.then((r) => r.data),
			enabled: open && !!eventId && memberIds.length > 0,
		});

	const { data: mentorOptionsData = [], isFetching: isMentorLoading } =
		useQuery({
			queryKey: ["speakers-search", mentorSearch],
			queryFn: () =>
				axios
					.get<SpecialityOption[]>(`/api/speakers/search`, {
						params: { query: mentorSearch },
					})
					.then((r) => r.data),
			enabled: open,
		});

	const mentorOptions = useMemo(
		() =>
			mentorOptionsData.map((u) => ({
				label: u.name,
				value: u.id,
				image: u.image,
				speciality: u.speciality,
				direction: u.direction,
			})),
		[mentorOptionsData],
	);

	const handleMentorSearch = useMemo(
		() => debounce((value: string) => setMentorSearch(value), 400),
		[],
	);

	useEffect(() => {
		if (!open) {
			form.resetFields();
			setMentorSearch("");
		}
	}, [open, form]);

	const { mutateAsync: save, isPending: isSaving } = useMutation({
		mutationFn: async (values: {
			projectId?: string;
			mentorIds?: string[];
		}) => {
			await axios.post(`/api/user/event/${eventId}/members/batch`, {
				memberIds,
				projectId: values.projectId,
				mentorIds: values.mentorIds,
			});
		},
		onSuccess: () => {
			message.success(
				t(
					"event.members.batch.success",
					"Selected members updated successfully",
				),
			);
			queryClient.invalidateQueries({ queryKey: ["event-members", eventId] });
			onSaved?.();
		},
		onError: (error: any) => {
			message.error(
				error?.response?.data?.message ||
					t("event.members.batch.error", "Failed to update members"),
			);
		},
	});

	const handleSubmit = async () => {
		const values = await form.validateFields();
		const hasMentors = Array.isArray(values.mentorIds);
		if (!values.projectId && !hasMentors) {
			message.warning(
				t(
					"event.members.batch.empty",
					"Select a project or mentor(s) to apply changes",
				),
			);
			return;
		}
		await save({
			projectId: values.projectId || undefined,
			mentorIds: hasMentors ? values.mentorIds : undefined,
		});
	};

	return (
		<Modal
			open={open}
			title={t("event.members.batch.title", "Assign project / mentors")}
			centered
			onCancel={onCancel}
			onOk={handleSubmit}
			okText={t("common.apply", "Apply")}
			cancelText={t("common.cancel", "Cancel")}
			confirmLoading={isSaving}
			destroyOnHidden
		>
			<Typography.Paragraph type="secondary">
				{t(
					"event.members.batch.subtitle",
					"Applying changes to {count} selected member(s). Project list contains only projects where all selected members were team members. Mentors selection REPLACES the existing mentors on every selected member.",
					{ count: memberIds.length },
				)}
			</Typography.Paragraph>

			{!isCommonProjectsLoading && commonProjects.length === 0 && (
				<Alert
					type="info"
					showIcon
					style={{ marginBottom: 16 }}
					message={t(
						"event.members.batch.noCommon",
						"No project is shared by all selected members. You can still assign mentors.",
					)}
				/>
			)}

			<Form form={form} layout="vertical" variant="filled">
				<Form.Item
					label={t("event.members.batch.project", "Project")}
					name="projectId"
				>
					<Select
						allowClear
						loading={isCommonProjectsLoading}
						disabled={commonProjects.length === 0}
						placeholder={t(
							"event.members.batch.project.placeholder",
							"Select project (optional)",
						)}
						options={commonProjects.map((p) => ({
							label: p.name,
							value: p.id,
						}))}
						notFoundContent={
							isCommonProjectsLoading ? <Spin size="small" /> : null
						}
					/>
				</Form.Item>

				<Form.Item
					label={t("event.members.batch.mentors", "Mentors")}
					name="mentorIds"
					extra={t(
						"event.members.batch.mentors.hint",
						"Pick one or more users by their speciality. Leave empty to clear mentors only if explicitly cleared.",
					)}
				>
					<Select
						mode="multiple"
						allowClear
						showSearch
						placeholder={t(
							"event.members.batch.mentors.placeholder",
							"Type a name or speciality...",
						)}
						filterOption={false}
						onSearch={handleMentorSearch}
						options={mentorOptions}
						loading={isMentorLoading}
						optionLabelProp="label"
						notFoundContent={
							isMentorLoading ? (
								<Spin size="small" />
							) : (
								t("event.members.batch.mentors.empty", "Start typing to search")
							)
						}
						optionRender={(option) => {
							const data = option.data as {
								label: string;
								image?: string | null;
								speciality?: string | null;
								direction?: string | null;
							};
							return (
								<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
									<Avatar size={24} src={data.image ?? undefined}>
										{!data.image && data.label ? data.label[0] : null}
									</Avatar>
									<div>
										<div>{data.label}</div>
										<div style={{ fontSize: 12, color: "#888" }}>
											{data.speciality || data.direction || "—"}
										</div>
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

export default BatchAssignEventMembersModal;

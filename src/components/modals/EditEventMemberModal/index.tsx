import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Avatar,
	Form,
	Input,
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

interface MemberProject {
	id: string;
	name: string;
	slug: string;
	position?: string | null;
	startedAt?: string | null;
	finishedAt?: string | null;
}

interface SpecialityOption {
	id: string;
	name: string;
	image?: string | null;
	speciality?: string | null;
	direction?: string | null;
}

interface MentorValue {
	id: string;
	name: string;
	user?: {
		id: string;
		name?: string | null;
		image?: string | null;
		profile?: { name?: string | null } | null;
	} | null;
	direction?: { id: string; name: string } | null;
}

interface EventMemberValue {
	id: string;
	user: {
		id: string;
		name?: string | null;
		email?: string | null;
		image?: string | null;
		profile?: { name?: string | null } | null;
	};
	teamMemberId?: string | null;
	teamMember?: {
		id: string;
		position?: string | null;
		startedAt?: string | null;
		finishedAt?: string | null;
		team?: {
			projectId?: string | null;
			project?: { id: string; name: string } | null;
		} | null;
	} | null;
	mentors?: MentorValue[] | null;
}

interface EditEventMemberModalProps {
	open: boolean;
	eventId: string;
	member: EventMemberValue | null;
	onCancel: () => void;
	onSaved?: () => void;
}

const formatDate = (value?: string | null) => {
	if (!value) return "";
	const date = new Date(value);
	// Epoch zero is a sentinel for "unset" coming from bad seed data.
	if (date.getTime() === 0) return "";
	return date.toLocaleDateString(undefined, {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
};

const EditEventMemberModal: React.FC<EditEventMemberModalProps> = ({
	open,
	eventId,
	member,
	onCancel,
	onSaved,
}) => {
	const { t } = useTranslate();
	const queryClient = useQueryClient();
	const [form] = Form.useForm();

	const [mentorSearch, setMentorSearch] = useState("");

	const userDisplayName =
		member?.user?.profile?.name ||
		member?.user?.name ||
		member?.user?.email ||
		"";

	const initialProjectId = member?.teamMember?.team?.projectId ?? undefined;
	const initialMentorIds = useMemo(
		() => member?.mentors?.map((m) => m.id) ?? [],
		[member?.mentors],
	);

	const { data: projectsData, isFetching: isProjectsLoading } = useQuery({
		queryKey: ["event-member-projects", eventId, member?.id],
		queryFn: () =>
			axios
				.get<MemberProject[]>(
					`/api/user/event/${eventId}/members/${member?.id}/projects`,
				)
				.then((r) => r.data),
		enabled: open && !!eventId && !!member?.id,
	});

	const projects = projectsData ?? [];
	const projectById = useMemo(
		() => new Map(projects.map((p) => [p.id, p])),
		[projects],
	);

	const { data: mentorOptionsData, isFetching: isMentorLoading } = useQuery({
		queryKey: ["speakers-search", mentorSearch, initialMentorIds.join(",")],
		queryFn: () =>
			axios
				.get<SpecialityOption[]>(`/api/speakers/search`, {
					params: { query: mentorSearch, ids: initialMentorIds },
					paramsSerializer: (params) =>
						qs.stringify(params, { arrayFormat: "repeat" }),
				})
				.then((r) => r.data),
		enabled: open,
	});

	const mentorOptions = useMemo(() => {
		const fetched = (mentorOptionsData ?? []).map((u) => ({
			label: u.name,
			value: u.id,
			image: u.image,
			speciality: u.speciality,
			direction: u.direction,
		}));
		const seenIds = new Set(fetched.map((o) => o.value));
		for (const mentor of member?.mentors ?? []) {
			if (seenIds.has(mentor.id)) continue;
			fetched.push({
				label: mentor.user?.profile?.name || mentor.user?.name || mentor.name,
				value: mentor.id,
				image: mentor.user?.image ?? null,
				speciality: mentor.name,
				direction: mentor.direction?.name ?? null,
			});
		}
		return fetched;
	}, [mentorOptionsData, member?.mentors]);

	const handleMentorSearch = useMemo(
		() => debounce((value: string) => setMentorSearch(value), 400),
		[],
	);

	useEffect(() => {
		if (open) {
			form.setFieldsValue({
				projectId: initialProjectId,
				mentorIds: initialMentorIds,
			});
		} else {
			form.resetFields();
			setMentorSearch("");
		}
	}, [open, initialProjectId, initialMentorIds, form]);

	const selectedProjectId: string | undefined = Form.useWatch(
		"projectId",
		form,
	);
	const selectedProject = selectedProjectId
		? projectById.get(selectedProjectId)
		: undefined;

	const { mutateAsync: save, isPending: isSaving } = useMutation({
		mutationFn: async (values: {
			projectId?: string | null;
			mentorIds?: string[];
		}) => {
			if (!member) return;
			await axios.put(
				`/api/user/event/${eventId}/members/${member.id}`,
				values,
			);
		},
		onSuccess: () => {
			message.success(
				t("event.members.edit.success", "Member updated successfully"),
			);
			queryClient.invalidateQueries({ queryKey: ["event-members", eventId] });
			onSaved?.();
		},
		onError: (error: any) => {
			message.error(
				error?.response?.data?.message ||
					t("event.members.edit.error", "Failed to update member"),
			);
		},
	});

	const handleSubmit = async () => {
		const values = await form.validateFields();
		await save({
			projectId: values.projectId || null,
			mentorIds: values.mentorIds ?? [],
		});
	};

	return (
		<Modal
			open={open}
			title={t("event.members.edit.title", "Edit member")}
			centered
			onCancel={onCancel}
			onOk={handleSubmit}
			okText={t("common.save", "Save")}
			cancelText={t("common.cancel", "Cancel")}
			confirmLoading={isSaving}
			destroyOnHidden
		>
			<Form form={form} layout="vertical" variant="filled">
				<Form.Item label={t("event.members.edit.name", "Name")}>
					<Input value={userDisplayName} disabled />
				</Form.Item>

				<Form.Item label={t("event.members.edit.email", "Email")}>
					<Input value={member?.user?.email ?? ""} disabled />
				</Form.Item>

				<Form.Item
					label={t("event.members.edit.project", "Project")}
					name="projectId"
					extra={t(
						"event.members.edit.project.hint",
						"Only projects where this user was a team member are shown",
					)}
				>
					<Select
						allowClear
						loading={isProjectsLoading}
						placeholder={t(
							"event.members.edit.project.placeholder",
							"Select project (optional)",
						)}
						options={projects.map((p) => ({
							label: p.name,
							value: p.id,
						}))}
						notFoundContent={
							isProjectsLoading ? (
								<Spin size="small" />
							) : (
								t(
									"event.members.edit.project.empty",
									"This user has no team memberships",
								)
							)
						}
					/>
				</Form.Item>

				{selectedProject && (
					<Typography.Paragraph
						type="secondary"
						style={{ marginTop: -12, marginBottom: 16, fontSize: 13 }}
					>
						<div>
							<strong>{t("event.members.edit.position", "Position")}: </strong>
							{selectedProject.position ?? "—"}
						</div>
						<div>
							<strong>{t("event.members.edit.period", "Period")}: </strong>
							{formatDate(selectedProject.startedAt)} —{" "}
							{formatDate(selectedProject.finishedAt) ||
								t("event.members.edit.present", "present")}
						</div>
					</Typography.Paragraph>
				)}

				<Form.Item
					label={t("event.members.edit.mentors", "Mentors")}
					name="mentorIds"
					extra={t(
						"event.members.edit.mentors.hint",
						"Pick one or more users by their speciality",
					)}
				>
					<Select
						mode="multiple"
						allowClear
						showSearch
						placeholder={t(
							"event.members.edit.mentors.placeholder",
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
								t("event.members.edit.mentors.empty", "Start typing to search")
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

export default EditEventMemberModal;

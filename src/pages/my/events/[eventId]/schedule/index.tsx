import { MoreOutlined } from "@ant-design/icons";
import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTolgee, useTranslate } from "@tolgee/react";
import { Avatar, Button, Dropdown, Menu, Space, Typography } from "antd";
import axios from "axios";
import _ from "lodash";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useState } from "react";
import ModernTable from "@/components/ModernTable";
import type { ScheduleItemFormValues } from "@/components/modals/EventModal";
import ScheduleItemModal from "@/components/modals/EventModal/ScheduleItemModal";
import { formatEventPeriod } from "@/helpers/format";
import { hasRole } from "@/helpers/user";
import { ProtectedEventLayout } from "@/layouts/ProtectedEventLayout";
import styles from "./style.module.scss";

export const EventScheduleContent = () => {
	const { data: session } = useSession();
	const { t } = useTranslate();
	const { getLanguage } = useTolgee();
	const router = useRouter();
	const eventId = router.query.eventId as string;

	const [scheduleItemModalOpen, setScheduleItemModalOpen] = useState(false);
	const [editingScheduleItemId, setEditingScheduleItemId] = useState<
		string | null
	>(null);
	const [schedule, setSchedule] = useState<ScheduleItemFormValues[]>([]);
	const [scheduleHasChanges, setScheduleHasChanges] = useState(false);

	const isAdmin = hasRole(prismaClient.UserRole.Admin, { data: session });

	const { data: event, isLoading: isEventLoading } = useQuery({
		queryKey: ["event", eventId],
		queryFn: () => axios.get(`/api/user/event/${eventId}`),
		enabled: !!eventId,
	});

	const handleAddScheduleItem = () => {
		setEditingScheduleItemId(null);
		setScheduleItemModalOpen(true);
	};

	const handleScheduleItemModalCancel = () => {
		setScheduleItemModalOpen(false);
		setEditingScheduleItemId(null);
	};

	const handleScheduleItemModalSubmit = (item: ScheduleItemFormValues) => {
		if (editingScheduleItemId !== null) {
			updateScheduleItem(editingScheduleItemId, item);
		} else {
			addNewScheduleItem(item);
		}

		setScheduleHasChanges(true);
		setScheduleItemModalOpen(false);
		setEditingScheduleItemId(null);
	};

	const handleEditScheduleItem = (id: string) => {
		setEditingScheduleItemId(id);
		setScheduleItemModalOpen(true);
	};

	// Удалить item расписания
	const removeScheduleItem = (id: string) => {
		setSchedule(schedule.filter((i) => i.id !== id));
		setScheduleHasChanges(true);
	};

	// Обновить поле расписания
	const updateScheduleItem = (id: string, item: ScheduleItemFormValues) => {
		const updated = [...schedule];
		const idx = updated.findIndex((i) => i.id === id);

		if (idx !== -1) {
			updated[idx] = item;
		}

		setSchedule(updated);
	};

	const addNewScheduleItem = (item: ScheduleItemFormValues) => {
		setSchedule((prev) => {
			if (!eventId) {
				// Для новых событий id = индекс (строкой)
				return [...prev, { ...item, id: String(prev.length) }];
			}
			return [...prev, item];
		});

		setScheduleHasChanges(true);
	};

	return (
		<ProtectedEventLayout title={t("Event Schedule")}>
			<Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
				{t(
					"event.modal.schedule.hint",
					"You can add one or multiple schedule items to the event. Each item can have multiple speakers.",
				)}
			</Typography.Paragraph>
			{event?.data?.schedule?.length > 0 && (
				<ModernTable
					size="small"
					dataSource={_.orderBy(schedule, ["start"], "asc")}
					pagination={false}
					rowKey="id"
					columns={[
						{
							key: "index",
							render: (_, __, idx: number) => {
								return idx + 1;
							},
						},
						{
							title: t("event.modal.schedule.speakers", "Speakers"),
							dataIndex: "speakers",
							key: "speakers",
							render: (speakers) => {
								const speakersArr = Array.isArray(speakers)
									? speakers
									: speakers
										? [speakers]
										: [];
								return (
									<Space direction="vertical">
										{speakersArr.map((speaker) => {
											return (
												<span
													key={speaker.id}
													style={{
														display: "inline-flex",
														alignItems: "center",
													}}
												>
													{speaker.image ? (
														<Avatar
															size={36}
															src={speaker.image}
															style={{ marginRight: 8 }}
														/>
													) : (
														<Avatar size={36} style={{ marginRight: 8 }}>
															{speaker.name.charAt(0).toUpperCase()}
														</Avatar>
													)}
													<Space direction="vertical" size={0}>
														<Typography.Text>{speaker.name}</Typography.Text>
														<Typography.Text
															type="secondary"
															style={{ fontSize: 12 }}
														>
															{speaker.speciality}
														</Typography.Text>
													</Space>
												</span>
											);
										})}
									</Space>
								);
							},
						},
						{
							title: t("event.modal.schedule.title", "Title"),
							dataIndex: "title",
							key: "title",
							render: (title: string, record: any) => {
								return <Typography.Text>{title || "-"}</Typography.Text>;
							},
						},
						{
							title: t("event.modal.schedule.period", "Date"),
							dataIndex: "start",
							key: "period",
							render: (_, record: any) => {
								const startDate = record.startDate;
								const endDate = record.endDate;

								return (
									<Typography.Text>
										{formatEventPeriod(startDate, endDate, getLanguage())}
									</Typography.Text>
								);
							},
						},
						{
							title: "",
							key: "actions",
							width: 48,
							render: (_: any, record: any, idx: number) => {
								const menu = (
									<Menu>
										<Menu.Item
											key="edit"
											onClick={() => handleEditScheduleItem(record.id)}
										>
											{t("Edit", "Edit")}
										</Menu.Item>
										<Menu.Item
											key="delete"
											onClick={() => removeScheduleItem(record.id)}
											danger
										>
											{t("Delete", "Delete")}
										</Menu.Item>
									</Menu>
								);
								return (
									<Dropdown overlay={menu} trigger={["click"]}>
										<Button type="text" icon={<MoreOutlined />} />
									</Dropdown>
								);
							},
						},
					]}
					style={{ marginBottom: 16 }}
				/>
			)}
			<Button
				block
				icon={<IconPlus />}
				onClick={handleAddScheduleItem}
				type="text"
				className={styles.addItemButton}
			>
				{t("event.modal.schedule.add", "Add item")}
			</Button>

			<ScheduleItemModal
				open={scheduleItemModalOpen}
				onCancel={handleScheduleItemModalCancel}
				onSubmit={handleScheduleItemModalSubmit}
				initialValues={
					editingScheduleItemId
						? schedule.find((i) => i.id === editingScheduleItemId)
						: undefined
				}
				isAdmin={isAdmin}
			/>
		</ProtectedEventLayout>
	);
};

export default EventScheduleContent;

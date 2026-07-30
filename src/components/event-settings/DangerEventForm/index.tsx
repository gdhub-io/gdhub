import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Card, Modal, message, Spin } from "antd";
import axios from "axios";
import { useRouter } from "next/navigation";

type DangerEventFormArgs = {
	eventId: string;
};

const DangerEventForm = ({ eventId }: DangerEventFormArgs) => {
	const router = useRouter();
	const [modal, modalContextHolder] = Modal.useModal();
	const [messageApi, messageContextHolder] = message.useMessage();
	const { t } = useTranslate();

	const { data: event, isFetching: isFetchingEvent } = useQuery({
		queryKey: ["event", eventId],
		queryFn: () =>
			axios.get<
				prismaClient.Event & {
					schedule: prismaClient.EventScheduleItem[];
				}
			>(`/api/user/event/${eventId}`),
		enabled: !!eventId,
		refetchOnWindowFocus: false,
		refetchInterval: false,
	});

	const { mutateAsync: archiveEvent, isPending: isArchivingEvent } =
		useMutation({
			mutationFn: () =>
				axios.put(`/api/user/event/${eventId}/archive`).then((res) => res.data),
		});

	const { mutateAsync: restoreEvent, isPending: isRestoringEvent } =
		useMutation({
			mutationFn: () =>
				axios.put(`/api/user/event/${eventId}/restore`).then((res) => res.data),
		});

	const { mutateAsync: deleteEvent, isPending: isDeletingEvent } = useMutation({
		mutationFn: () =>
			axios.delete(`/api/user/event/${eventId}`).then((res) => res.data),
	});

	const handleConfirmArchive = () => {
		modal.confirm({
			title: t("event.settings.danger.archive", "Archive Event"),
			centered: true,
			content: t(
				"event.settings.danger.archive.confirm",
				"Are you sure you want to archive this event?",
			),
			onOk: async () => {
				await archiveEvent();
				messageApi.success(
					t(
						"event.settings.danger.archive.success",
						"Event archived successfully",
					),
				);

				router.push("/user/events");
			},
			okText: t("event.settings.danger.archive.button", "Archive"),
			cancelText: t("event.settings.danger.archive.cancel", "No"),
		});
	};

	const handleConfirmDelete = () => {
		modal.confirm({
			title: t("event.settings.danger.archive", "Delete Event"),
			centered: true,
			content: t(
				"event.settings.danger.delete.description",
				"Are you sure you want to delete this event?",
			),
			onOk: async () => {
				await deleteEvent();
				messageApi.success(
					t(
						"event.settings.danger.delete.success",
						"Event deleted successfully",
					),
				);

				router.push("/user/events");
			},
			okText: t("event.settings.danger.delete.button", "Delete"),
			cancelText: t("event.settings.danger.delete.cancel", "No"),
		});
	};

	const handleConfirmRestore = () => {
		modal.confirm({
			title: t("event.settings.danger.restore", "Restore Event"),
			centered: true,
			content: t(
				"event.settings.danger.restore.description",
				"Are you sure you want to restore this event?",
			),
			onOk: async () => {
				await restoreEvent();
				messageApi.success(
					t(
						"event.settings.danger.restore.success",
						"Event restored successfully",
					),
				);

				router.push("/user/events");
			},
			okText: t("event.settings.danger.restore.button", "Restore"),
			cancelText: t("event.settings.danger.restore.cancel", "No"),
		});
	};

	return (
		<>
			{modalContextHolder}
			{messageContextHolder}
			<Spin
				spinning={
					isFetchingEvent ||
					isArchivingEvent ||
					isRestoringEvent ||
					isDeletingEvent
				}
			>
				{event?.data?.status !== prismaClient.$Enums.EventStatus.Archived ? (
					<Card
						extra={
							<Button
								type="primary"
								loading={isArchivingEvent}
								onClick={handleConfirmArchive}
							>
								{t("event.settings.danger.archive", "Archive")}
							</Button>
						}
						title={t("event.settings.danger.archive", "Archive Event")}
						variant="borderless"
					>
						<p>
							{t(
								"event.settings.danger.archive.description",
								"Are you sure you want to archive this event?",
							)}
							<br />
							{t(
								"event.settings.danger.archive.description2",
								"This will move the event to the archive and it will be hidden from the public.",
							)}
						</p>
					</Card>
				) : (
					<Card
						extra={
							<Button
								type="primary"
								loading={isRestoringEvent}
								onClick={handleConfirmRestore}
							>
								{t("event.settings.danger.restore", "Restore")}
							</Button>
						}
						title={t("event.settings.danger.restore", "Restore Event")}
						variant="borderless"
					>
						<p>
							{t(
								"event.settings.danger.restore.description",
								"Are you sure you want to restore this event?",
							)}
							<br />
							{t(
								"event.settings.danger.restore.description2",
								"This will move the event to the draft status and will be visible to the your events list.",
							)}
						</p>
					</Card>
				)}
				<Card
					extra={
						<Button
							type="primary"
							danger
							loading={isDeletingEvent}
							onClick={handleConfirmDelete}
						>
							{t("event.modal.danger.button", "Delete")}
						</Button>
					}
					title={t("event.modal.danger", "Delete Event")}
					variant="borderless"
				>
					<p>
						{t(
							"event.modal.danger.description",
							"Are you sure you want to delete this event?",
						)}
						<br />
						{t(
							"event.modal.danger.description2",
							"This action cannot be undone.",
						)}
						<br />
						{t(
							"event.modal.danger.description3",
							"This will delete all the event data and all the event data will be lost.",
						)}
					</p>
				</Card>
			</Spin>
		</>
	);
};

export default DangerEventForm;

import { useMutation } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Modal, message, Skeleton, Spin, Typography } from "antd";
import axios from "axios";
import { useRouter } from "next/navigation";
import { EventStatus } from "@/config/prisma-enums";
import { useEvent } from "@/hooks/event";
import styles from "./style.module.scss";

/**
 * One irreversible-ish action, stated plainly.
 *
 * A `Card` gave each of these a titled header with a rule under it, which reads
 * as a section of a page rather than a single thing you can do. This is the row
 * the design asks for: what it does on the left, the button that does it on the
 * right.
 */
function DangerRow({
	title,
	description,
	action,
	danger = false,
}: {
	title: string;
	description: string;
	action: React.ReactNode;
	danger?: boolean;
}) {
	return (
		<Flex
			align="center"
			justify="space-between"
			gap={24}
			wrap
			className={danger ? `${styles.row} ${styles.rowDanger}` : styles.row}
		>
			<Flex vertical gap={2}>
				<Typography.Text strong>{title}</Typography.Text>
				<Typography.Text type="secondary">{description}</Typography.Text>
			</Flex>
			{action}
		</Flex>
	);
}

type DangerEventFormArgs = {
	eventId: string;
};

const DangerEventForm = ({ eventId }: DangerEventFormArgs) => {
	const router = useRouter();
	const [modal, modalContextHolder] = Modal.useModal();
	const [messageApi, messageContextHolder] = message.useMessage();
	const { t } = useTranslate();

	const { event, isLoading: isLoadingEvent } = useEvent(eventId);

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
			// Was pointing at the archive key, so deleting asked to archive.
			title: t("event.modal.danger", "Delete Event"),
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
			<Spin spinning={isArchivingEvent || isRestoringEvent || isDeletingEvent}>
				<Flex vertical gap={16}>
					{/* Archive or restore is only known once the event has loaded. */}
					{isLoadingEvent ? (
						<Skeleton
							active
							title
							paragraph={{ rows: 1 }}
							className={styles.row}
						/>
					) : event?.status !== EventStatus.Archived ? (
						<DangerRow
							title={t("event.settings.danger.archive", "Archive Event")}
							description={t(
								"event.settings.danger.archive.description",
								"Moves the event to the archive and hides it from the public. You can restore it later.",
							)}
							action={
								<Button
									type="primary"
									loading={isArchivingEvent}
									onClick={handleConfirmArchive}
								>
									{t("event.settings.danger.archive.button", "Archive")}
								</Button>
							}
						/>
					) : (
						<DangerRow
							title={t("event.settings.danger.restore", "Restore Event")}
							description={t(
								"event.settings.danger.restore.description",
								"Brings the event back as a draft, so you can review it before publishing again.",
							)}
							action={
								<Button
									type="primary"
									loading={isRestoringEvent}
									onClick={handleConfirmRestore}
								>
									{t("event.settings.danger.restore.button", "Restore")}
								</Button>
							}
						/>
					)}

					<DangerRow
						danger
						title={t("event.modal.danger", "Delete Event")}
						description={t(
							"event.modal.danger.description",
							"Removes the event, its schedule and its member list. This cannot be undone.",
						)}
						action={
							<Button
								type="primary"
								danger
								loading={isDeletingEvent}
								onClick={handleConfirmDelete}
							>
								{t("event.settings.danger.delete.button", "Delete")}
							</Button>
						}
					/>
				</Flex>
			</Spin>
		</>
	);
};

export default DangerEventForm;

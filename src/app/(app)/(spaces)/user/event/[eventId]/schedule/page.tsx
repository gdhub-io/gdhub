"use client";

import { IconPlus } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { App, Button } from "antd";
import axios from "axios";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import {
	EventScheduleTimeline,
	type TimelineItem,
} from "@/components/event/EventScheduleTimeline";
import type { ScheduleItemFormValues } from "@/components/modals/EventModal";
import ScheduleItemModal from "@/components/modals/EventModal/ScheduleItemModal";
import { EventSpace } from "@/components/spaces/EventSpace";
import { useEvent } from "@/hooks/event";

export default function EventSchedulePage() {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const params = useParams<{ eventId?: string }>();
	const eventId = params?.eventId as string;

	const [schedule, setSchedule] = useState<ScheduleItemFormValues[]>([]);
	// `null` closes the modal; an item with no id is a new one.
	const [editing, setEditing] = useState<ScheduleItemFormValues | null>(null);

	const { can } = useAccess();
	const canEditSchedule = can("event.schedule.edit");

	const { event, refetch: refetchEvent } = useEvent(eventId);

	// Load schedule from event data
	useEffect(() => {
		if (event?.schedule) {
			// The form works in optional strings; the row carries nullable ones.
			const scheduleData = event.schedule.map((item) => ({
				id: item.id,
				title: item.title ?? undefined,
				description: item.description ?? undefined,
				url: item.url ?? undefined,
				address: item.address,
				startDate: String(item.startDate),
				endDate: String(item.endDate),
				directionId: item.directionId,
				format: item.format,
				language: item.language,
				speakers:
					item.speakers?.map((speaker) => ({
						id: speaker.id,
						name: speaker.user?.profile?.name || speaker.name || "",
						speciality: speaker.name || "",
						image: speaker.user?.image ?? undefined,
					})) ?? [],
			}));

			setSchedule(scheduleData);
		}
	}, [event?.schedule]);

	const { mutateAsync: updateScheduleItem } = useMutation({
		mutationFn: (item: ScheduleItemFormValues) => {
			// Convert speakers to array of IDs
			const speakersIds = item.speakers?.length
				? item.speakers.map((speaker) =>
						typeof speaker === "string" ? speaker : speaker.id,
					)
				: [];

			return axios.put(`/api/user/event/${eventId}/schedule/${item.id}`, {
				...item,
				speakers: speakersIds,
			});
		},
		onSuccess: () => {
			refetchEvent();
		},
		// The modal closes on submit either way, so without this a rejected save
		// is indistinguishable from a successful one.
		onError: () =>
			message.error(
				t("event.schedule.save.error", "Could not save the schedule item"),
			),
	});

	const { mutateAsync: createScheduleItem } = useMutation({
		mutationFn: (item: ScheduleItemFormValues) => {
			// Convert speakers to array of IDs
			const speakersIds = item.speakers?.length
				? item.speakers.map((speaker) =>
						typeof speaker === "string" ? speaker : speaker.id,
					)
				: [];

			return axios.post(`/api/user/event/${eventId}/schedule`, {
				...item,
				speakers: speakersIds,
			});
		},
		onSuccess: () => {
			refetchEvent();
		},
		onError: () =>
			message.error(
				t("event.schedule.save.error", "Could not save the schedule item"),
			),
	});

	const { mutateAsync: deleteScheduleItem } = useMutation({
		mutationFn: (scheduleItemId: string) =>
			axios.delete(`/api/user/event/${eventId}/schedule/${scheduleItemId}`),
		onSuccess: () => {
			refetchEvent();
		},
	});

	const handleScheduleUpdate = async (item: ScheduleItemFormValues) => {
		await updateScheduleItem(item);
	};

	const handleScheduleCreate = (item: ScheduleItemFormValues) => {
		createScheduleItem(item);
	};

	const handleScheduleDelete = async (scheduleItemId: string) => {
		await deleteScheduleItem(scheduleItemId);
	};

	const handleAddScheduleItem = () => {
		setEditing({ id: null } as ScheduleItemFormValues);
	};

	return (
		<EventSpace
			title={t("Event Schedule")}
			description={t(
				"event.modal.schedule.hint",
				"You can add one or multiple schedule items to the event. Each item can have multiple speakers.",
			)}
			actions={
				<Button icon={<IconPlus />} onClick={handleAddScheduleItem}>
					{t("event.modal.schedule.add", "Add item")}
				</Button>
			}
		>
			<EventScheduleTimeline
				items={schedule as TimelineItem[]}
				canEdit={canEditSchedule}
				onEdit={(item) => {
					const row = schedule.find((candidate) => candidate.id === item.id);
					if (row) setEditing(row);
				}}
				onDelete={handleScheduleDelete}
			/>

			<ScheduleItemModal
				open={Boolean(editing)}
				isAdmin={canEditSchedule}
				initialValues={editing ?? undefined}
				onCancel={() => setEditing(null)}
				onSubmit={async (item) => {
					if (item.id) await handleScheduleUpdate(item);
					else handleScheduleCreate(item);
					setEditing(null);
				}}
			/>
		</EventSpace>
	);
}

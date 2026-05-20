"use client";

import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IconPlus } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button } from "antd";
import axios from "axios";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
	EventScheduleGantt,
	type EventScheduleGanttRef,
} from "@/components/event/EventScheduleGantt";
import type { ScheduleItemFormValues } from "@/components/modals/EventModal";
import { hasRole } from "@/helpers/user";
import { ProtectedEventLayout } from "@/layouts/ProtectedEventLayout";

interface EventScheduleItem {
	id: string;
	title?: string;
	description?: string;
	url?: string;
	startDate: string;
	endDate: string;
	directionId: string;
	format?: prismaClient.$Enums.EventFormat;
	language?: prismaClient.$Enums.Language;
	speakers?: Array<{
		id: string;
		name?: string;
		user?: {
			image?: string;
			profile?: {
				name?: string;
			};
		};
	}>;
}

export default function EventSchedulePage() {
	const { data: session } = useSession();
	const { t } = useTranslate();
	const params = useParams<{ eventId?: string }>();
	const eventId = params?.eventId as string;

	const [schedule, setSchedule] = useState<ScheduleItemFormValues[]>([]);
	const ganttRef = useRef<EventScheduleGanttRef>(null);

	const isAdmin = hasRole(prismaClient.UserRole.Admin, { data: session });

	const { data: event, refetch: refetchEvent } = useQuery({
		queryKey: ["event", eventId],
		queryFn: () => axios.get(`/api/user/event/${eventId}`),
		enabled: !!eventId,
	});

	// Load schedule from event data
	useEffect(() => {
		if (event?.data?.schedule) {
			const scheduleData = event.data.schedule.map(
				(item: EventScheduleItem) => ({
					id: item.id,
					title: item.title,
					description: item.description,
					url: item.url,
					startDate: item.startDate,
					endDate: item.endDate,
					directionId: item.directionId,
					format: item.format,
					language: item.language,
					speakers: item.speakers?.length
						? item.speakers.map((speaker) => ({
								id: speaker.id,
								name: speaker.user?.profile?.name || speaker.name || "",
								speciality: speaker.name || "",
								image: speaker.user?.image,
							}))
						: [],
				}),
			);
			setSchedule(scheduleData);
		}
	}, [event?.data?.schedule]);

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
		ganttRef.current?.openAddModal();
	};

	return (
		<ProtectedEventLayout
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
			customStyles={{
				contentContainer: { height: "calc(100vh - 200px)" },
				content: { height: "100%" },
			}}
		>
			<EventScheduleGantt
				ref={ganttRef}
				schedule={schedule}
				onScheduleUpdate={handleScheduleUpdate}
				onScheduleCreate={handleScheduleCreate}
				onScheduleDelete={handleScheduleDelete}
				isAdmin={isAdmin}
			/>
		</ProtectedEventLayout>
	);
}

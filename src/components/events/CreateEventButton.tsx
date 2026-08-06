import {
	IconCalendarCheck,
	IconChevronDown,
	IconDeviceGamepad2,
	IconMicroscope,
	IconPresentation,
	IconUsers,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Dropdown, type MenuProps, Space, theme } from "antd";
import axios from "axios";
import { useSession } from "next-auth/react";
import qs from "qs";
import React, { useCallback } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import EventModal from "@/components/modals/EventModal";
import { EventType, SkillLevel } from "@/config/prisma-enums";

function getTypeIcon(type: EventType, args: { size: number; color: string }) {
	switch (type) {
		case EventType.Meetup:
			return <IconUsers {...args} />;
		case EventType.GameJam:
			return <IconDeviceGamepad2 {...args} />;
		case EventType.Workshop:
			return <IconPresentation {...args} />;
		case EventType.GameLab:
			return <IconMicroscope {...args} />;
		case EventType.Conference:
			return <IconCalendarCheck {...args} />;
		default:
			return null;
	}
}

const CreateEventButton: React.FC<{ onCreation?: () => void }> = ({
	onCreation = () => {},
}) => {
	const { data: session } = useSession();
	const { t } = useTranslate();
	const { token } = theme.useToken();
	const { isIn } = useAccess();
	// Staff-only event kinds and the relaxed requirement below are a platform
	// privilege, not a permission on a particular event — being able to enter the
	// admin space is exactly what "staff" means now.
	const isStaff = isIn("admin");

	const [modalOpen, setModalOpen] = React.useState(false);
	const [eventType, setEventType] = React.useState<EventType | undefined>(
		undefined,
	);

	const { data: specialityLevels } = useQuery({
		queryKey: ["user-speciality-levels", session?.user?.id],
		queryFn: () =>
			axios
				.get("/api/user/speciality-levels", {
					params: {
						level: [SkillLevel.Experienced, SkillLevel.Expert],
					},
					paramsSerializer: (params) =>
						qs.stringify(params, { arrayFormat: "repeat" }),
				})
				.then((res) => res.data),
		enabled: !!session?.user?.id,
	});

	const canCreateMeetupOrWorkshop =
		isStaff || (Array.isArray(specialityLevels) && specialityLevels.length > 0);

	const eventLabel = useCallback(
		(eventType: EventType) => {
			const labels = {
				[EventType.Meetup]: t("event.format.meetup", "Meetup"),
				[EventType.Workshop]: t("event.format.workshop", "Workshop"),
				[EventType.GameJam]: t("event.format.gamejam", "Game Jam"),
				[EventType.GameLab]: t("event.format.gamelab", "Game Lab"),
				[EventType.Conference]: t("event.format.conference", "Conference"),
			};

			return (
				<Space size={8}>
					{getTypeIcon(eventType, {
						size: 24,
						color: token.colorTextSecondary,
					})}
					{labels[eventType]}
				</Space>
			);
		},
		[t],
	);

	const items: MenuProps["items"] = [
		canCreateMeetupOrWorkshop && {
			label: eventLabel(EventType.Meetup),
			key: EventType.Meetup,
			icon: null,
		},
		canCreateMeetupOrWorkshop && {
			label: eventLabel(EventType.Workshop),
			key: EventType.Workshop,
			icon: null,
		},
		isStaff
			? {
					label: eventLabel(EventType.GameJam),
					key: EventType.GameJam,
					icon: null,
				}
			: null,
		isStaff
			? {
					label: eventLabel(EventType.GameLab),
					key: EventType.GameLab,
					icon: null,
				}
			: null,
		isStaff
			? {
					label: eventLabel(EventType.Conference),
					key: EventType.Conference,
					icon: null,
				}
			: null,
	].filter((item): item is Exclude<typeof item, boolean | null> =>
		Boolean(item),
	);

	const handleMenuClick: MenuProps["onClick"] = (e) => {
		setEventType(e.key as EventType);
		setModalOpen(true);
	};

	const handleModalCancel = () => {
		setModalOpen(false);
		setEventType(undefined);
	};

	const handleModalSubmit = () => {
		// TODO: send the data to the server
		setModalOpen(false);
		setEventType(undefined);
		onCreation();
	};

	if (specialityLevels?.length === 0) {
		return null;
	}

	return (
		<>
			<Dropdown menu={{ items, onClick: handleMenuClick }} trigger={["click"]}>
				<Button type="primary">
					<Space>
						{t("page.events.createEvent", "Create Event")}
						<IconChevronDown />
					</Space>
				</Button>
			</Dropdown>

			<EventModal
				open={modalOpen}
				eventType={eventType}
				onCancel={handleModalCancel}
				onSubmit={handleModalSubmit}
				initialValues={eventType ? { type: eventType } : {}}
			/>
		</>
	);
};

export default CreateEventButton;

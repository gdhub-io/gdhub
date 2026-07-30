import { DownOutlined } from "@ant-design/icons";
import { FaChalkboardTeacher } from "@react-icons/all-files/fa/FaChalkboardTeacher";
import { FaMicroscope } from "@react-icons/all-files/fa/FaMicroscope";
import { FaRegCalendarCheck } from "@react-icons/all-files/fa/FaRegCalendarCheck";
import { FaUsers } from "@react-icons/all-files/fa/FaUsers";
import { GiGamepad } from "@react-icons/all-files/gi/GiGamepad";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Dropdown, type MenuProps, Space, theme } from "antd";
import axios from "axios";
import { useSession } from "next-auth/react";
import qs from "qs";
import React, { useCallback } from "react";
import EventModal from "@/components/modals/EventModal";
import { EventType, SkillLevel, UserRole } from "@/config/prisma-enums";
import { hasRole } from "@/helpers/user";

function getTypeIcon(type: EventType, args: { size: number; color: string }) {
	switch (type) {
		case EventType.Meetup:
			return <FaUsers {...args} />;
		case EventType.GameJam:
			return <GiGamepad {...args} />;
		case EventType.Workshop:
			return <FaChalkboardTeacher {...args} />;
		case EventType.GameLab:
			return <FaMicroscope {...args} />;
		case EventType.Conference:
			return <FaRegCalendarCheck {...args} />;
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
	const isAdmin = hasRole(UserRole.Admin, {
		data: session,
	});

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
		isAdmin || (Array.isArray(specialityLevels) && specialityLevels.length > 0);

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
		isAdmin
			? {
					label: eventLabel(EventType.GameJam),
					key: EventType.GameJam,
					icon: null,
				}
			: null,
		isAdmin
			? {
					label: eventLabel(EventType.GameLab),
					key: EventType.GameLab,
					icon: null,
				}
			: null,
		isAdmin
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
		// TODO: реализовать отправку данных на сервер
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
						<DownOutlined />
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

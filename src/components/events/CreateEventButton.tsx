import React from 'react'
import EventModal from '@/components/modals/EventModal'
import { hasRole } from '@/helpers/user'
import { EventType } from '@/pages/hub/events/mock.data'
import { DownOutlined } from '@ant-design/icons'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { FaChalkboardTeacher } from '@react-icons/all-files/fa/FaChalkboardTeacher'
import { FaMicroscope } from '@react-icons/all-files/fa/FaMicroscope'
import { FaRegCalendarCheck } from '@react-icons/all-files/fa/FaRegCalendarCheck'
import { FaUsers } from '@react-icons/all-files/fa/FaUsers'
import { GiGamepad } from '@react-icons/all-files/gi/GiGamepad'
import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { theme, Dropdown, MenuProps, message, Space, Button } from 'antd'
import axios from 'axios'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import qs from 'qs'

const eventTypeLabels: Record<EventType, string> = {
	MEETUP: 'Meetup',
	WORKSHOP: 'Workshop',
	GAMEJAM: 'Game Jam',
	GAMELAB: 'Game Lab',
	CONFERENCE: 'Conference',
}

function getTypeIcon(type: EventType, args: { size: number; color: string }) {
	switch (type) {
		case 'MEETUP':
			return <FaUsers {...args} />
		case 'GAMEJAM':
			return <GiGamepad {...args} />
		case 'WORKSHOP':
			return <FaChalkboardTeacher {...args} />
		case 'GAMELAB':
			return <FaMicroscope {...args} />
		case 'CONFERENCE':
			return <FaRegCalendarCheck {...args} />
		default:
			return null
	}
}

const CreateEventButton: React.FC = () => {
	const { data: session } = useSession()
	const { t } = useTolgee()
	const { token } = theme.useToken()
	const isAdmin = hasRole(prismaClient.$Enums.UserRole.Admin, { data: session })

	const [modalOpen, setModalOpen] = React.useState(false)
	const [eventType, setEventType] = React.useState<EventType | undefined>(undefined)

	const { data: userEventCount } = useQuery(
		['user-event-count', session?.user?.id],
		() => axios.get('/api/user/event/count').then((res) => res.data),
		{ enabled: !!session?.user?.id }
	)

	const { data: specialityLevels } = useQuery(
		['user-speciality-levels', session?.user?.id],
		() =>
			axios
				.get('/api/user/speciality-levels', {
					params: {
						level: [prismaClient.$Enums.SkillLevel.Experienced, prismaClient.$Enums.SkillLevel.Expert],
					},
					paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' }),
				})
				.then((res) => res.data),
		{ enabled: !!session?.user?.id }
	)

	const canCreateMeetupOrWorkshop = isAdmin || (Array.isArray(specialityLevels) && specialityLevels.length > 0)

	const items: MenuProps['items'] = [
		canCreateMeetupOrWorkshop && {
			label: (
				<Space size={8}>
					{getTypeIcon('MEETUP', { size: 24, color: token.colorTextSecondary })}
					{eventTypeLabels.MEETUP}
				</Space>
			),
			key: 'MEETUP',
			icon: null,
		},
		canCreateMeetupOrWorkshop && {
			label: (
				<Space size={8}>
					{getTypeIcon('WORKSHOP', { size: 24, color: token.colorTextSecondary })}
					{eventTypeLabels.WORKSHOP}
				</Space>
			),
			key: 'WORKSHOP',
			icon: null,
		},
		isAdmin
			? {
					label: (
						<Space size={8}>
							{getTypeIcon('GAMEJAM', { size: 24, color: token.colorTextSecondary })}
							{eventTypeLabels.GAMEJAM}
						</Space>
					),
					key: 'GAMEJAM',
					icon: null,
				}
			: null,
		isAdmin
			? {
					label: (
						<Space size={8}>
							{getTypeIcon('GAMELAB', { size: 24, color: token.colorTextSecondary })}
							{eventTypeLabels.GAMELAB}
						</Space>
					),
					key: 'GAMELAB',
					icon: null,
				}
			: null,
		isAdmin
			? {
					label: (
						<Space size={8}>
							{getTypeIcon('CONFERENCE', { size: 24, color: token.colorTextSecondary })}
							{eventTypeLabels.CONFERENCE}
						</Space>
					),
					key: 'CONFERENCE',
					icon: null,
				}
			: null,
	].filter((item): item is Exclude<typeof item, boolean | null> => Boolean(item))

	const handleMenuClick: MenuProps['onClick'] = (e) => {
		setEventType(e.key as EventType)
		setModalOpen(true)
	}

	const handleModalCancel = () => {
		setModalOpen(false)
		setEventType(undefined)
	}

	const handleModalSubmit = (data: any) => {
		// TODO: реализовать отправку данных на сервер
		setModalOpen(false)
		setEventType(undefined)
		message.success('Event created!')
	}

	return (
		<Space>
			<Dropdown menu={{ items, onClick: handleMenuClick }} trigger={['click']}>
				<Button type="primary">
					<Space>
						{t('page.events.createEvent', 'Create Event')}
						<DownOutlined />
					</Space>
				</Button>
			</Dropdown>

			{Boolean(userEventCount) && userEventCount > 0 && (
				<Link href="/my/events">
					<Button type="text">My Events</Button>
				</Link>
			)}

			<EventModal
				open={modalOpen}
				onCancel={handleModalCancel}
				onSubmit={handleModalSubmit}
				initialValues={eventType ? { type: eventType } : {}}
			/>
		</Space>
	)
}

export default CreateEventButton

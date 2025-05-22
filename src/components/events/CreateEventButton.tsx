import React, { useCallback } from 'react'
import EventModal from '@/components/modals/EventModal'
import { hasRole } from '@/helpers/user'
import { EventType } from '@/mock/events.data'
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

function getTypeIcon(type: prismaClient.$Enums.EventType, args: { size: number; color: string }) {
	switch (type) {
		case prismaClient.$Enums.EventType.Meetup:
			return <FaUsers {...args} />
		case prismaClient.$Enums.EventType.GameJam:
			return <GiGamepad {...args} />
		case prismaClient.$Enums.EventType.Workshop:
			return <FaChalkboardTeacher {...args} />
		case prismaClient.$Enums.EventType.GameLab:
			return <FaMicroscope {...args} />
		case prismaClient.$Enums.EventType.Conference:
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

	// TODO: переделать на useMutation
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

	const eventLabel = useCallback(
		(eventType: prismaClient.$Enums.EventType) => {
			const labels = {
				[prismaClient.$Enums.EventType.Meetup]: t('event.format.meetup', 'Meetup'),
				[prismaClient.$Enums.EventType.Workshop]: t('event.format.workshop', 'Workshop'),
				[prismaClient.$Enums.EventType.GameJam]: t('event.format.gamejam', 'Game Jam'),
				[prismaClient.$Enums.EventType.GameLab]: t('event.format.gamelab', 'Game Lab'),
				[prismaClient.$Enums.EventType.Conference]: t('event.format.conference', 'Conference'),
			}

			return (
				<Space size={8}>
					{getTypeIcon(eventType, { size: 24, color: token.colorTextSecondary })}
					{labels[eventType]}
				</Space>
			)
		},
		[t]
	)

	const items: MenuProps['items'] = [
		canCreateMeetupOrWorkshop && {
			label: eventLabel(prismaClient.$Enums.EventType.Meetup),
			key: 'meetup',
			icon: null,
		},
		canCreateMeetupOrWorkshop && {
			label: eventLabel(prismaClient.$Enums.EventType.Workshop),
			key: 'workshop',
			icon: null,
		},
		isAdmin
			? {
					label: eventLabel(prismaClient.$Enums.EventType.GameJam),
					key: 'gamejam',
					icon: null,
				}
			: null,
		isAdmin
			? {
					label: eventLabel(prismaClient.$Enums.EventType.GameLab),
					key: 'gamelab',
					icon: null,
				}
			: null,
		isAdmin
			? {
					label: eventLabel(prismaClient.$Enums.EventType.Conference),
					key: 'conference',
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

	const handleModalSubmit = () => {
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

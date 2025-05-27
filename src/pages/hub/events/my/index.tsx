import React from 'react'
import CreateEventButton from '@/components/events/CreateEventButton'
import EventModal from '@/components/modals/EventModal'
import ModernTable from '@/components/ModernTable'
import { formatEventPeriod } from '@/helpers/format'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { MoreOutlined } from '@ant-design/icons'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { FaChalkboardTeacher } from '@react-icons/all-files/fa/FaChalkboardTeacher'
import { FaMicroscope } from '@react-icons/all-files/fa/FaMicroscope'
import { FaRegCalendarCheck } from '@react-icons/all-files/fa/FaRegCalendarCheck'
import { FaUsers } from '@react-icons/all-files/fa/FaUsers'
import { GiGamepad } from '@react-icons/all-files/gi/GiGamepad'
import { GoLinkExternal } from '@react-icons/all-files/go/GoLinkExternal'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Button, Dropdown, Image, message, Space, Typography, theme, Alert, Tag, MenuProps } from 'antd'
import type { Breakpoint } from 'antd/es/_util/responsiveObserver'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const { Text } = Typography

function getTypeIcon(type: string, size = 20) {
	switch (type) {
		case 'MEETUP':
			return <FaUsers size={size} />
		case 'GAMEJAM':
			return <GiGamepad size={size} />
		case 'WORKSHOP':
			return <FaChalkboardTeacher size={size} />
		case 'GAMELAB':
			return <FaMicroscope size={size} />
		case 'CONFERENCE':
			return <FaRegCalendarCheck size={size} />
		default:
			return null
	}
}

const MyEventsPage: NextPageWithLayout = () => {
	const { t, getLanguage } = useTolgee()
	const router = useRouter()
	const { token } = theme.useToken()
	const [editModalOpen, setEditModalOpen] = React.useState(false)
	const [editingEvent, setEditingEvent] = React.useState<any | null>(null)

	// Получение событий пользователя
	const {
		data,
		isLoading,
		refetch: refetchMyEvents,
	} = useQuery(['my-events'], () => axios.get('/api/user/events').then((res) => res.data))

	// Мутация для удаления события
	const { mutateAsync: deleteEvent } = useMutation(
		(id: string) => axios.delete('/api/user/event', { params: { id } }),
		{
			onSuccess: () => {
				message.success(t('event.delete.success', 'Event deleted'))
				refetchMyEvents()
			},
			onError: () => {
				message.error(t('event.delete.error', 'Error deleting event'))
			},
		}
	)

	const { mutateAsync: publishEvent, isLoading: isPublishingEvent } = useMutation(
		(id: string) => axios.put(`/api/user/event/${id}/publish`),
		{
			onSuccess: () => {
				message.success(t('event.publish.success', 'Event published'))
				refetchMyEvents()
			},
			onError: () => {
				message.error(t('event.publish.error', 'Error publishing event'))
			},
		}
	)

	const handleEventPublish = async (id: string) => {
		try {
			await publishEvent(id)

			message.success(t('event.publish.success', 'Event published'))
		} catch (error) {
			message.error(t('event.publish.error', 'Error publishing event'))
		}
	}

	const { mutateAsync: unpublishEvent, isLoading: isUnpublishingEvent } = useMutation(
		(id: string) => axios.put(`/api/user/event/${id}/unpublish`),
		{
			onSuccess: () => {
				message.success(t('event.unpublish.success', 'Event unpublished'))
				refetchMyEvents()
			},
			onError: () => {
				message.error(t('event.unpublish.error', 'Error unpublishing event'))
			},
		}
	)

	const { mutateAsync: restoreEvent, isLoading: isRestoringEvent } = useMutation(
		(id: string) => axios.put(`/api/user/event/${id}/restore`),
		{
			onSuccess: () => {
				message.success(t('event.restore.success', 'Event is restored'))
				refetchMyEvents()
			},
			onError: () => {
				message.error(t('event.restore.error', 'Error restoring event'))
			},
		}
	)

	const { mutateAsync: generateSlug, isLoading: isGeneratingSlug } = useMutation(
		(id: string) => axios.put(`/api/user/event/${id}/generate-slug`),
		{
			onSuccess: () => {
				message.success(t('event.generateSlug.success', 'Slug generated'))
				refetchMyEvents()
			},
			onError: () => {
				message.error(t('event.generateSlug.error', 'Error generating slug'))
			},
		}
	)

	const handleEventRestore = async (id: string) => {
		await restoreEvent(id)
	}

	const handleEventUnpublish = async (id: string) => {
		await unpublishEvent(id)
	}

	const handleEdit = (id: string) => {
		const event = data?.find((e: any) => e.id === id)
		setEditingEvent(event)
		setEditModalOpen(true)
	}

	const handleEditModalCancel = () => {
		setEditModalOpen(false)
		setEditingEvent(null)
	}

	const handleEditModalSubmit = async () => {
		setEditModalOpen(false)
		setEditingEvent(null)
		await refetchMyEvents()

		message.success(t('event.edit.success', 'Event edited successfully'))
	}

	const columns: ColumnsType<any> = [
		{
			title: t('event.cover', 'Cover'),
			dataIndex: 'image',
			key: 'image',
			render: (value: string) => (value ? <Image src={value} alt="Cover" /> : null),
			responsive: ['md' as Breakpoint],
			width: 100,
		},
		{
			title: t('event.title', 'Title'),
			dataIndex: 'title',
			key: 'title',
			render: (value: string, record: any) => (
				<Space>
					{getTypeIcon(record.type)}
					<Text strong>{value}</Text>
				</Space>
			),
			width: 200,
		},
		{
			title: t('event.type', 'Type'),
			dataIndex: 'type',
			key: 'type',
			render: (value: string) => <Text>{value}</Text>,
			responsive: ['md' as Breakpoint],
		},
		{
			title: t('event.dates', 'Dates'),
			dataIndex: 'schedule',
			key: 'schedule',
			render: (schedule: any[]) => {
				if (!schedule || !schedule.length)
					return <Alert message={t('event.noDates', 'You need to set a schedule')} banner type="warning" />
				const first = schedule[0]
				const last = schedule[schedule.length - 1]
				return <Text>{formatEventPeriod(first.startDate, last.endDate, getLanguage())}</Text>
			},
			responsive: ['md' as Breakpoint],
		},
		{
			dataIndex: 'slug',
			key: 'slug',
			render: (value: string) =>
				!value ? (
					<Text type="secondary">{'-'}</Text>
				) : (
					<Link href={`/event/${value}`}>
						<Button type="text" icon={<GoLinkExternal />} iconPosition="end">
							{t('event.goToEvent', 'Go to event')}
						</Button>
					</Link>
				),
			responsive: ['md' as Breakpoint],
		},
		{
			dataIndex: 'status',
			key: 'status',
			width: 150,
			align: 'right',
			render: (status: prismaClient.$Enums.EventStatus, record: any) => {
				switch (status) {
					case prismaClient.$Enums.EventStatus.Draft:
						return (
							<Space>
								<Tag color="default">{t('event.status.draft', 'Draft')}</Tag>
								<Button
									type="primary"
									onClick={() => handleEventPublish(record.id)}
									disabled={record.schedule.length === 0}
									loading={isPublishingEvent}
								>
									{t('event.publish', 'Publish')}
								</Button>
							</Space>
						)
					case prismaClient.$Enums.EventStatus.Published:
						return (
							<Tag color="success">
								{t('event.status.published', 'Published at {publishedAt}', {
									publishedAt: dayjs(record.publishedAt).format('lll'),
								})}
							</Tag>
						)
					case prismaClient.$Enums.EventStatus.Closed:
						return <Tag color="error">{t('event.status.closed', 'Closed')}</Tag>
					default:
						return null
				}
			},
		},
		{
			key: 'actions',
			width: 48,
			render: (_: any, record: any) => {
				const menu: MenuProps['items'] = []

				const startOfMenu: MenuProps['items'] = [
					{
						key: 'edit',
						label: t('event.edit', 'Edit'),
						onClick: () => handleEdit(record.id),
					},
					{
						key: 'generate-slug',
						label: t('event.generateSlug', 'Generate Slug'),
						onClick: () => generateSlug(record.id),
					},
				]

				const endOfMenu: MenuProps['items'] = [
					{
						key: 'divider',
						type: 'divider',
					},
					{
						key: 'delete',
						label: t('event.delete', 'Delete'),
						danger: true,
						onClick: () => deleteEvent(record.id),
					},
				]

				if (record.status === prismaClient.$Enums.EventStatus.Draft) {
					menu.push(...startOfMenu)
				}

				if (record.status === prismaClient.$Enums.EventStatus.Published) {
					menu.push(...startOfMenu)
					menu.push({
						key: 'unpublish',
						label: t('event.unpublish', 'Unpublish'),
						onClick: () => handleEventUnpublish(record.id),
					})
				}

				if (record.status === prismaClient.$Enums.EventStatus.Closed) {
					menu.push({
						key: 'restore',
						label: t('event.restore', 'Restore'),
						onClick: () => handleEventRestore(record.id),
					})
				}

				menu.push(...endOfMenu)

				return (
					<Dropdown menu={{ items: menu }} trigger={['click']}>
						<Button type="text" icon={<MoreOutlined />} />
					</Dropdown>
				)
			},
		},
	]

	return (
		<ProtectedLayout
			title={t('page.myEvents.title', 'My Events')}
			seo={{ openGraph: { type: 'website', url: router.asPath } }}
			extra={<CreateEventButton onCreation={() => refetchMyEvents()} />}
			showBackButton
			backButtonUrl="/hub/events"
		>
			<div className={styles.container}>
				<ModernTable
					columns={columns}
					dataSource={data?.map((e: any) => ({ ...e, key: e.id }))}
					loading={isLoading}
					showHeader
					pagination={false}
				/>
				<EventModal
					open={editModalOpen}
					eventId={editingEvent?.id}
					eventType={editingEvent?.type}
					initialValues={editingEvent}
					onCancel={handleEditModalCancel}
					onSubmit={handleEditModalSubmit}
				/>
			</div>
		</ProtectedLayout>
	)
}

export default MyEventsPage
